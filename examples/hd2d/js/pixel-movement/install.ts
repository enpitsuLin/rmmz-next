import type { Game_CharacterBase, Game_Event, Game_Follower } from 'rmmz-next'
import { Game_Followers, Game_Player, GlobalMananger, Input } from 'rmmz-next'
import { getEventCollider, nearestPointOnEvent, resolvePixelMove } from './collision'
import { loadPixelMovementConfig } from './config'
import { MovementTrail } from './trail'

type TriggerList = Parameters<Game_Player['checkEventTriggerThere']>[0]

const INV_SQRT2 = Math.SQRT1_2

interface PixelPlayerState {
  _pixelMoving?: boolean
  _pixelStepAccum?: number
  _pixelTrail?: MovementTrail
  _pixelLastTouchEventId?: number
}

interface PixelFollowerState {
  _pixelMoving?: boolean
}

function directionFromInput(
  dir8: number,
  currentDir: Game_CharacterBase.CharacterDirection,
): { vx: number, vy: number, facing: Game_CharacterBase.CharacterDirection } {
  switch (dir8) {
    case 2: return { vx: 0, vy: 1, facing: 2 }
    case 4: return { vx: -1, vy: 0, facing: 4 }
    case 6: return { vx: 1, vy: 0, facing: 6 }
    case 8: return { vx: 0, vy: -1, facing: 8 }
    case 1: return { vx: -INV_SQRT2, vy: INV_SQRT2, facing: currentDir === 4 || currentDir === 2 ? currentDir : 2 }
    case 3: return { vx: INV_SQRT2, vy: INV_SQRT2, facing: currentDir === 6 || currentDir === 2 ? currentDir : 2 }
    case 7: return { vx: -INV_SQRT2, vy: -INV_SQRT2, facing: currentDir === 4 || currentDir === 8 ? currentDir : 8 }
    case 9: return { vx: INV_SQRT2, vy: -INV_SQRT2, facing: currentDir === 6 || currentDir === 8 ? currentDir : 8 }
    default: return { vx: 0, vy: 0, facing: currentDir }
  }
}

function facingVector(direction: number): { fx: number, fy: number } {
  switch (direction) {
    case 2: return { fx: 0, fy: 1 }
    case 4: return { fx: -1, fy: 0 }
    case 6: return { fx: 1, fy: 0 }
    case 8: return { fx: 0, fy: -1 }
    default: return { fx: 0, fy: 1 }
  }
}

function findInteractableEvent(player: Game_Player, range: number, triggers: TriggerList): Game_Event | null {
  const { fx, fy } = facingVector(player.direction())
  const probeX = player._realX + fx * range * 0.65
  const probeY = player._realY + fy * range * 0.65
  let best: Game_Event | null = null
  let bestDistSq = range * range

  for (const event of GlobalMananger.$gameMap.events()) {
    if (!event || !event.isTriggerIn(triggers))
      continue
    let target = nearestPointOnEvent(event, player._realX, player._realY)
    // Elevated props (e.g. lantern hanging off a lamp post) can also be interacted with via their base tile.
    if (getEventCollider(event)?.disabled) {
      const boxDistSq = (target.x - player._realX) ** 2 + (target.y - player._realY) ** 2
      const baseDistSq = (event._realX - player._realX) ** 2 + (event._realY - player._realY) ** 2
      if (baseDistSq < boxDistSq)
        target = { x: event._realX, y: event._realY }
    }
    const dx = target.x - player._realX
    const dy = target.y - player._realY
    // Require the event to lie roughly in front of the player or right at the player's feet.
    const distToPlayer = Math.hypot(dx, dy)
    if (distToPlayer > range)
      continue
    const forwardDot = distToPlayer > 0.15 ? (dx * fx + dy * fy) / distToPlayer : 1
    if (forwardDot < 0.25)
      continue
    const probeTarget = nearestPointOnEvent(event, probeX, probeY)
    const distToProbeSq = (probeTarget.x - probeX) ** 2 + (probeTarget.y - probeY) ** 2
    if (distToProbeSq < bestDistSq) {
      bestDistSq = distToProbeSq
      best = event
    }
  }
  return best
}

function syncFollowersToTrail(player: Game_Player, trail: MovementTrail, spacing: number): void {
  const followers = player.followers()
  if (!followers || followers.areGathering())
    return

  const list = followers.data()
  for (let i = 0; i < list.length; i++) {
    const follower = list[i] as (Game_Follower & PixelFollowerState) | undefined
    if (!follower || !follower.isVisible())
      continue
    const sample = trail.sampleBehind((i + 1) * spacing)
    if (!sample)
      continue
    const moved = Math.hypot(sample.x - follower._realX, sample.y - follower._realY) > 0.002
    follower._pixelMoving = moved
    if (moved) {
      follower._realX = sample.x
      follower._realY = sample.y
      follower._x = Math.round(sample.x)
      follower._y = Math.round(sample.y)
      follower.setDirection(sample.direction)
      follower.refreshBushDepth()
    }
  }
}

export function installPixelMovement(): void {
  const config = loadPixelMovementConfig()

  if (config.enableWasd) {
    Input.keyMapper[87] = 'up'
    Input.keyMapper[83] = 'down'
    Input.keyMapper[65] = 'left'
    Input.keyMapper[68] = 'right'
  }

  const originalInitMembers = Game_Player.prototype.initMembers
  Game_Player.prototype.initMembers = function (this: Game_Player & PixelPlayerState): void {
    originalInitMembers.call(this)
    this._pixelMoving = false
    this._pixelStepAccum = 0
    this._pixelTrail = new MovementTrail()
    this._pixelLastTouchEventId = 0
  }

  const originalLocate = Game_Player.prototype.locate
  Game_Player.prototype.locate = function (this: Game_Player & PixelPlayerState, x: number, y: number): void {
    originalLocate.call(this, x, y)
    this._pixelMoving = false
    this._pixelStepAccum = 0
    this._pixelLastTouchEventId = 0
    this._pixelTrail ??= new MovementTrail()
    this._pixelTrail.reset(this._realX, this._realY, this.direction())
  }

  const originalIsMoving = Game_Player.prototype.isMoving
  Game_Player.prototype.isMoving = function (this: Game_Player & PixelPlayerState): boolean {
    return originalIsMoving.call(this) || Boolean(this._pixelMoving)
  }

  const originalUpdate = Game_Player.prototype.update
  Game_Player.prototype.update = function (this: Game_Player & PixelPlayerState, sceneActive: boolean): void {
    const canUseFreeMove = sceneActive
      && this.canMove()
      && this.isNormal()
      && !this.isJumping()
      && !GlobalMananger.$gameTemp.isDestinationValid()

    if (!canUseFreeMove) {
      this._pixelMoving = false
      originalUpdate.call(this, sceneActive)
      if (this._pixelTrail) {
        this._pixelTrail.record(this._realX, this._realY, this.direction())
      }
      return
    }

    const lastScrolledX = this.scrolledX()
    const lastScrolledY = this.scrolledY()
    this.updateDashing()

    const dir8 = Input.dir8
    this._pixelMoving = false

    if (dir8 > 0) {
      const { vx, vy, facing } = directionFromInput(dir8, this.direction())
      this.setDirection(facing)

      const stepDistance = this.distancePerFrame() * config.speedScale
      const prevTileX = this._x
      const prevTileY = this._y
      const result = resolvePixelMove(
        this,
        vx * stepDistance,
        vy * stepDistance,
        config.colliderRadius,
        config.cornerSlide,
      )

      if (result.moved) {
        const actualStep = Math.hypot(result.x - this._realX, result.y - this._realY)
        const map = GlobalMananger.$gameMap
        this._realX = map.isLoopHorizontal() ? map.roundX(result.x) : result.x
        this._realY = map.isLoopVertical() ? map.roundY(result.y) : result.y
        this._x = Math.round(this._realX)
        this._y = Math.round(this._realY)
        this._pixelMoving = true
        this._pixelLastTouchEventId = 0
        this.resetStopCount()
        this.refreshBushDepth()

        this._pixelTrail ??= new MovementTrail()
        this._pixelTrail.record(this._realX, this._realY, this.direction())
        syncFollowersToTrail(this, this._pixelTrail, config.followSpacing)

        this._pixelStepAccum = (this._pixelStepAccum ?? 0) + actualStep
        if (this._pixelStepAccum >= 1) {
          this._pixelStepAccum -= 1
          this.increaseSteps()
        }

        if (this._x !== prevTileX || this._y !== prevTileY) {
          this.checkEventTriggerHere([1, 2])
        }
      }
      else if (result.collidedEvents.length > 0 && !GlobalMananger.$gameMap.isEventRunning()) {
        for (const event of result.collidedEvents) {
          if (event.isTriggerIn([1, 2]) && this._pixelLastTouchEventId !== event.eventId()) {
            this._pixelLastTouchEventId = event.eventId()
            event.start()
            break
          }
        }
      }
    }
    else {
      this._pixelLastTouchEventId = 0
      this.updateStop()
    }

    this.updateAnimation()
    this.updateScroll(lastScrolledX, lastScrolledY)
    this.updateVehicle()
    if (!this.isMoving()) {
      this.updateNonmoving(false, sceneActive)
    }
    else {
      this.triggerButtonAction()
    }
    this._followers.update()
  }

  const originalCheckEventTriggerThere = Game_Player.prototype.checkEventTriggerThere
  Game_Player.prototype.checkEventTriggerThere = function (this: Game_Player, triggers: TriggerList): void {
    if (this.canStartLocalEvents()) {
      const nearby = findInteractableEvent(this, config.interactRange, triggers)
      if (nearby) {
        nearby.start()
        return
      }
    }
    originalCheckEventTriggerThere.call(this, triggers)
  }

  const originalFollowersUpdate = Game_Followers.prototype.update
  Game_Followers.prototype.update = function (this: Game_Followers): void {
    const player = GlobalMananger.$gamePlayer as Game_Player & PixelPlayerState
    if (!this.areGathering() && player._pixelTrail) {
      for (const follower of this._data) {
        const f = follower as Game_Follower & PixelFollowerState
        if (f._pixelMoving) {
          f.updateAnimation()
          f._pixelMoving = false
        }
        else {
          f.updateStop()
          f.updateAnimation()
        }
      }
      return
    }
    originalFollowersUpdate.call(this)
  }
}
