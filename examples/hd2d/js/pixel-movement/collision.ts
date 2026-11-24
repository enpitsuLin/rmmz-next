import type { Game_Event, Game_Player } from 'rmmz-next'
import { GlobalMananger } from 'rmmz-next'

const EVENT_COLLIDER_RADIUS = 0.32

export interface MoveResult {
  x: number
  y: number
  moved: boolean
  collidedEvents: Game_Event[]
}

function isTileCompletelyBlocked(tx: number, ty: number): boolean {
  const map = GlobalMananger.$gameMap
  return !(
    map.isPassable(tx, ty, 2)
    || map.isPassable(tx, ty, 4)
    || map.isPassable(tx, ty, 6)
    || map.isPassable(tx, ty, 8)
  )
}

function canCrossTile(fromX: number, fromY: number, toX: number, toY: number): boolean {
  const map = GlobalMananger.$gameMap
  if (!map.isValid(toX, toY))
    return false
  if (isTileCompletelyBlocked(toX, toY))
    return false
  if (fromX === toX && fromY === toY)
    return true

  const dx = toX - fromX
  const dy = toY - fromY

  if (dx !== 0 && dy === 0) {
    const dir = dx > 0 ? 6 : 4
    const rev = dx > 0 ? 4 : 6
    return map.isPassable(fromX, fromY, dir) && map.isPassable(toX, toY, rev)
  }
  if (dy !== 0 && dx === 0) {
    const dir = dy > 0 ? 2 : 8
    const rev = dy > 0 ? 8 : 2
    return map.isPassable(fromX, fromY, dir) && map.isPassable(toX, toY, rev)
  }

  const horz = dx > 0 ? 6 : 4
  const vert = dy > 0 ? 2 : 8
  const revHorz = dx > 0 ? 4 : 6
  const revVert = dy > 0 ? 8 : 2
  const viaHorz = map.isPassable(fromX, fromY, horz)
    && map.isPassable(toX, fromY, revHorz)
    && map.isPassable(toX, fromY, vert)
    && map.isPassable(toX, toY, revVert)
  const viaVert = map.isPassable(fromX, fromY, vert)
    && map.isPassable(fromX, toY, revVert)
    && map.isPassable(fromX, toY, horz)
    && map.isPassable(toX, toY, revHorz)
  return viaHorz || viaVert
}

function isMapBoundsValid(x: number, y: number, radius: number): boolean {
  const map = GlobalMananger.$gameMap
  if (!map.isLoopHorizontal()) {
    if (x - radius < -0.5 || x + radius > map.width() - 0.5)
      return false
  }
  if (!map.isLoopVertical()) {
    if (y - radius < -0.5 || y + radius > map.height() - 0.5)
      return false
  }
  return true
}

function isTileCollisionFree(fromX: number, fromY: number, toX: number, toY: number, radius: number): boolean {
  if (!isMapBoundsValid(toX, toY, radius))
    return false

  const map = GlobalMananger.$gameMap
  const baseTx = Math.round(fromX)
  const baseTy = Math.round(fromY)
  const minTx = Math.round(toX - radius)
  const maxTx = Math.round(toX + radius)
  const minTy = Math.round(toY - radius)
  const maxTy = Math.round(toY + radius)

  for (let ty = minTy; ty <= maxTy; ty++) {
    for (let tx = minTx; tx <= maxTx; tx++) {
      const wrappedTx = map.roundX(tx)
      const wrappedTy = map.roundY(ty)
      if (!canCrossTile(baseTx, baseTy, wrappedTx, wrappedTy))
        return false
    }
  }
  return true
}

function findOverlappingEvents(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  radius: number,
): Game_Event[] {
  const map = GlobalMananger.$gameMap
  const hits: Game_Event[] = []
  const sumRadius = radius + EVENT_COLLIDER_RADIUS
  const sumRadiusSq = sumRadius * sumRadius

  for (const event of map.events()) {
    if (!event || event.isThrough() || !event.isNormalPriority())
      continue
    const ex = event._realX
    const ey = event._realY
    const newDistSq = (toX - ex) ** 2 + (toY - ey) ** 2
    if (newDistSq >= sumRadiusSq)
      continue
    // Allow moving away if the player started already overlapping an event.
    const oldDistSq = (fromX - ex) ** 2 + (fromY - ey) ** 2
    if (oldDistSq < sumRadiusSq && newDistSq > oldDistSq)
      continue
    hits.push(event)
  }
  return hits
}

function isVehicleBlocked(toX: number, toY: number, radius: number): boolean {
  const map = GlobalMananger.$gameMap
  const vehicles = [map.boat(), map.ship()]
  const sumRadiusSq = (radius + EVENT_COLLIDER_RADIUS) ** 2
  for (const vehicle of vehicles) {
    if (!vehicle || vehicle._mapId !== map.mapId())
      continue
    const distSq = (toX - vehicle._realX) ** 2 + (toY - vehicle._realY) ** 2
    if (distSq < sumRadiusSq)
      return true
  }
  return false
}

export function canOccupy(
  player: Game_Player,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  radius: number,
  collidedEvents: Game_Event[],
): boolean {
  if (player.isThrough() || player.isDebugThrough())
    return isMapBoundsValid(toX, toY, radius)

  if (!isTileCollisionFree(fromX, fromY, toX, toY, radius))
    return false

  const events = findOverlappingEvents(fromX, fromY, toX, toY, radius)
  if (events.length > 0) {
    for (const event of events) {
      if (!collidedEvents.includes(event))
        collidedEvents.push(event)
    }
    return false
  }

  if (isVehicleBlocked(toX, toY, radius))
    return false

  return true
}

export function resolvePixelMove(
  player: Game_Player,
  dx: number,
  dy: number,
  radius: number,
  cornerSlide: number,
): MoveResult {
  const startX = player._realX
  const startY = player._realY
  const collidedEvents: Game_Event[] = []

  // Try full diagonal or axial step first.
  const fullX = startX + dx
  const fullY = startY + dy
  if (canOccupy(player, startX, startY, fullX, fullY, radius, collidedEvents)) {
    return { x: fullX, y: fullY, moved: true, collidedEvents }
  }

  // Split into X then Y for wall sliding.
  let nextX = startX
  let nextY = startY
  let moved = false

  if (dx !== 0 && canOccupy(player, nextX, nextY, nextX + dx, nextY, radius, collidedEvents)) {
    nextX += dx
    moved = true
  }
  if (dy !== 0 && canOccupy(player, nextX, nextY, nextX, nextY + dy, radius, collidedEvents)) {
    nextY += dy
    moved = true
  }

  if (moved || cornerSlide <= 0) {
    return { x: nextX, y: nextY, moved, collidedEvents }
  }

  // Pure axial movement blocked by a corner: nudge perpendicularly if clear ahead.
  const step = Math.hypot(dx, dy)
  if (dx !== 0 && dy === 0) {
    const nudge = tryCornerNudgeY(player, startX, startY, dx, step, radius, cornerSlide)
    if (nudge !== 0)
      return { x: startX, y: startY + nudge, moved: true, collidedEvents }
  }
  else if (dy !== 0 && dx === 0) {
    const nudge = tryCornerNudgeX(player, startX, startY, dy, step, radius, cornerSlide)
    if (nudge !== 0)
      return { x: startX + nudge, y: startY, moved: true, collidedEvents }
  }

  return { x: startX, y: startY, moved: false, collidedEvents }
}

function tryCornerNudgeY(
  player: Game_Player,
  startX: number,
  startY: number,
  dx: number,
  step: number,
  radius: number,
  maxSlide: number,
): number {
  const dummy: Game_Event[] = []
  for (const sign of [-1, 1]) {
    const probeY = startY + sign * maxSlide
    const nudgeY = startY + sign * step
    if (
      canOccupy(player, startX, startY, startX, nudgeY, radius, dummy)
      && canOccupy(player, startX, probeY, startX + dx, probeY, radius, dummy)
    ) {
      return sign * step
    }
  }
  return 0
}

function tryCornerNudgeX(
  player: Game_Player,
  startX: number,
  startY: number,
  dy: number,
  step: number,
  radius: number,
  maxSlide: number,
): number {
  const dummy: Game_Event[] = []
  for (const sign of [-1, 1]) {
    const probeX = startX + sign * maxSlide
    const nudgeX = startX + sign * step
    if (
      canOccupy(player, startX, startY, nudgeX, startY, radius, dummy)
      && canOccupy(player, probeX, startY, probeX, startY + dy, radius, dummy)
    ) {
      return sign * step
    }
  }
  return 0
}
