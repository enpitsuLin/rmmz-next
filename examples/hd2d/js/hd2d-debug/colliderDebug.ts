import type { Game_Event } from 'rmmz-next'
import type { EventCollider } from '../pixel-movement/collision'
import { Container3D, Sprite3D } from '@pixi/3d'
import { Texture } from 'pixi.js'
import { GlobalMananger, PluginManager } from 'rmmz-next'
import { TILE_UNIT, tileToWorld } from '../hd2d/constants'

export interface ColliderDebugSettings {
  enabled: boolean
  showTiles: boolean
  showEvents: boolean
  showPlayer: boolean
}

export interface ColliderDebug {
  settings: ColliderDebugSettings
  object: Container3D
  apply: () => void
  update: (mapWidth: number, mapHeight: number) => void
  destroy: () => void
}

interface EventWithCollider {
  _pixelCollider?: EventCollider | null
}

const DEFAULT_PLAYER_RADIUS = 0.28
const DEFAULT_EVENT_RADIUS = 0.32
const DEBUG_Y = 0.018

let boxTexture: Texture | null = null
let circleTexture: Texture | null = null

function getBoxTexture(): Texture {
  if (boxTexture)
    return boxTexture
  const size = 64
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = 'rgba(255, 255, 255, 0.22)'
  ctx.fillRect(2, 2, size - 4, size - 4)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)'
  ctx.lineWidth = 4
  ctx.strokeRect(2, 2, size - 4, size - 4)
  boxTexture = Texture.from(canvas)
  return boxTexture
}

function getCircleTexture(): Texture {
  if (circleTexture)
    return circleTexture
  const size = 64
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const cx = size / 2
  const r = size / 2 - 3
  ctx.beginPath()
  ctx.arc(cx, cx, r, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.22)'
  ctx.fill()
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)'
  ctx.lineWidth = 4
  ctx.stroke()
  circleTexture = Texture.from(canvas)
  return circleTexture
}

function makeOverlaySprite(texture: Texture, tint: number, alpha: number, yOffset = 0): Sprite3D {
  return new Sprite3D({
    texture,
    tint,
    alpha,
    alphaMode: 'blend',
    billboardMode: 'none',
    rotation: { x: -Math.PI / 2, y: 0, z: 0 },
    position: { x: 0, y: DEBUG_Y + yOffset, z: 0 },
    castShadow: false,
    receiveShadow: false,
  })
}

function readPlayerColliderRadius(): number {
  const params = PluginManager.parameters('PixelMovement')
  const parsed = Number(params.colliderRadius)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_PLAYER_RADIUS
}

function isTileBlocked(tx: number, ty: number): boolean {
  const map = GlobalMananger.$gameMap
  return !(
    map.isPassable(tx, ty, 2)
    || map.isPassable(tx, ty, 4)
    || map.isPassable(tx, ty, 6)
    || map.isPassable(tx, ty, 8)
  )
}

export function createColliderDebug(): ColliderDebug {
  const settings: ColliderDebugSettings = {
    enabled: false,
    showTiles: true,
    showEvents: true,
    showPlayer: true,
  }

  const root = new Container3D({ label: '碰撞箱调试' })
  const tileGroup = new Container3D({ label: '图块碰撞' })
  const eventGroup = new Container3D({ label: '事件碰撞' })
  const playerGroup = new Container3D({ label: '玩家碰撞' })
  root.addChild(tileGroup, eventGroup, playerGroup)

  const playerRadius = readPlayerColliderRadius()
  const playerRing = makeOverlaySprite(getCircleTexture(), 0x38F28B, 0.9, 0.006)
  playerRing.setSize(playerRadius * 2 * TILE_UNIT, playerRadius * 2 * TILE_UNIT)
  playerGroup.addChild(playerRing)

  const eventSprites = new Map<number, { sprite: Sprite3D, isBox: boolean }>()
  let tilesBuilt = false

  const ensureTilesBuilt = (mapWidth: number, mapHeight: number): void => {
    if (tilesBuilt)
      return
    tilesBuilt = true
    const tex = getBoxTexture()
    for (let y = 0; y < mapHeight; y++) {
      for (let x = 0; x < mapWidth; x++) {
        if (!isTileBlocked(x, y))
          continue
        const pos = tileToWorld(x, y, mapWidth, mapHeight)
        const sprite = makeOverlaySprite(tex, 0xFF4D4F, 0.65, 0)
        sprite.setSize(TILE_UNIT * 0.96, TILE_UNIT * 0.96)
        sprite.position.set(pos.x, DEBUG_Y, pos.z)
        tileGroup.addChild(sprite)
      }
    }
  }

  const apply = (): void => {
    root.visible = settings.enabled
    tileGroup.visible = settings.showTiles
    eventGroup.visible = settings.showEvents
    playerGroup.visible = settings.showPlayer
  }

  const update = (mapWidth: number, mapHeight: number): void => {
    if (!settings.enabled)
      return

    if (settings.showTiles)
      ensureTilesBuilt(mapWidth, mapHeight)

    if (settings.showPlayer) {
      const player = GlobalMananger.$gamePlayer
      const pos = tileToWorld(player._realX, player._realY, mapWidth, mapHeight)
      playerRing.position.set(pos.x, DEBUG_Y + 0.006, pos.z)
    }

    if (settings.showEvents) {
      const map = GlobalMananger.$gameMap
      const seen = new Set<number>()
      for (const event of map.events()) {
        if (!event || event._erased)
          continue
        const id = event.eventId()
        seen.add(id)

        const col = (event as Game_Event & EventWithCollider)._pixelCollider ?? null
        const wantsBox = Boolean(col)
        let entry = eventSprites.get(id)
        if (!entry || entry.isBox !== wantsBox) {
          if (entry) {
            eventGroup.removeChild(entry.sprite)
            entry.sprite.destroy()
          }
          const tex = wantsBox ? getBoxTexture() : getCircleTexture()
          entry = {
            sprite: makeOverlaySprite(tex, 0x38D9FF, 0.85, 0.003),
            isBox: wantsBox,
          }
          eventGroup.addChild(entry.sprite)
          eventSprites.set(id, entry)
        }

        const isThrough = event.isThrough() || !event.isNormalPriority()
        const isDisabled = Boolean(col?.disabled) || isThrough

        if (col) {
          const pos = tileToWorld(event._realX + col.offsetX, event._realY + col.offsetY, mapWidth, mapHeight)
          entry.sprite.position.set(pos.x, DEBUG_Y + 0.003, pos.z)
          entry.sprite.setSize(
            Math.max(col.halfW * 2 * TILE_UNIT, 0.08),
            Math.max(col.halfD * 2 * TILE_UNIT, 0.08),
          )
        }
        else {
          const pos = tileToWorld(event._realX, event._realY, mapWidth, mapHeight)
          entry.sprite.position.set(pos.x, DEBUG_Y + 0.003, pos.z)
          const diameter = DEFAULT_EVENT_RADIUS * 2 * TILE_UNIT
          entry.sprite.setSize(diameter, diameter)
        }

        // Cyan = active solid collider, Magenta = elevated/through (interactable only).
        entry.sprite.tint = isDisabled ? 0xD946EF : 0x38D9FF
        entry.sprite.alpha = isDisabled ? 0.72 : 0.85
        entry.sprite.visible = true
      }

      for (const [id, entry] of eventSprites) {
        if (!seen.has(id))
          entry.sprite.visible = false
      }
    }
  }

  const destroy = (): void => {
    eventSprites.clear()
    root.destroy({ children: true })
  }

  apply()
  return { settings, object: root, apply, update, destroy }
}
