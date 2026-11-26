import type { BaseMaterial3D } from '@pixi/3d'
import type { TextureSource } from 'pixi.js'
import type { Bitmap, Game_CharacterBase, Game_Event } from 'rmmz-next'
import type { EventCollider } from '../../pixel-movement/collision'
import type { EventSpriteConfig } from '../scene/eventSpriteConfig'
import type { SpriteFootprintMetrics, SpriteShadowHandle } from '../scene/spriteShadow'
import type { DynamicSpriteLight } from '../utils/spriteLighting'
import { Container3D, Material3D, Sprite3D, Vector3 } from '@pixi/3d'
import { Rectangle, Texture } from 'pixi.js'
import { GlobalMananger, ImageManager } from 'rmmz-next'
import {
  CHAR_PIXEL_SIZE_COMPACT,
  CHAR_PIXEL_SIZE_TALL,
  TILE_BILLBOARD_PIXEL_SIZE,
  TILE_UNIT,
  tileToWorld,
} from '../constants'
import { DEFAULT_EVENT_SPRITE_CONFIG, resolveEventSpriteConfig } from '../scene/eventSpriteConfig'
import { createGroundShadow } from '../scene/groundShadow'
import { addSpriteShadow, getSpriteFootprintMetrics } from '../scene/spriteShadow'
import { tintSprite } from '../utils/spriteLighting'

const frameTextureCache = new WeakMap<TextureSource, Map<string, Texture>>()

function getSlicedFrame(source: TextureSource, sx: number, sy: number, pw: number, ph: number): Texture {
  let cache = frameTextureCache.get(source)
  if (!cache) {
    cache = new Map<string, Texture>()
    frameTextureCache.set(source, cache)
  }
  const key = `${sx},${sy},${pw},${ph}`
  let texture = cache.get(key)
  if (!texture) {
    texture = new Texture({ source, frame: new Rectangle(sx, sy, pw, ph) })
    cache.set(key, texture)
  }
  return texture
}

interface PixelColliderTarget {
  _pixelCollider?: EventCollider | null
}

const ELEVATED_CLEARANCE_Y = 0.45
const MIN_AUTO_HALF_W = 0.12
const MAX_AUTO_HALF_W = 1.5
const MIN_AUTO_HALF_D = 0.1
const MAX_AUTO_HALF_D = 0.24

function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value
}

function isGameEvent(character: Game_CharacterBase): character is Game_Event {
  return 'eventId' in character && typeof (character as Game_Event).event === 'function'
}

function isCharacterVisible(character: Game_CharacterBase): boolean {
  if (character.isTransparent() || character.opacity() <= 0)
    return false
  if ('isVisible' in character && typeof (character as { isVisible?: () => boolean }).isVisible === 'function') {
    if (!(character as { isVisible: () => boolean }).isVisible())
      return false
  }
  return character.tileId() > 0 || character.characterName().length > 0
}

export class Sprite_Hd2dCharacter {
  readonly character: Game_CharacterBase
  readonly object: Container3D
  readonly sprite: Sprite3D
  readonly groundShadow: Sprite3D

  private readonly shadowHandle: SpriteShadowHandle
  private readonly defaultMaterial: BaseMaterial3D
  private emissiveMaterial: Material3D | null = null
  private readonly worldPos = new Vector3()
  private readonly swayPhase: number
  private readonly zBias: number

  private bitmap: Bitmap | null = null
  private characterName = ''
  private isBigCharacter = false
  private tilesetName = ''
  private lastFrameKey = ''
  private lastPageIndex = -999
  private config: EventSpriteConfig = DEFAULT_EVENT_SPRITE_CONFIG
  private isTileMode = false

  private pixelSize = CHAR_PIXEL_SIZE_TALL
  private spriteWidth = 48 * CHAR_PIXEL_SIZE_TALL
  private spriteHeight = 80 * CHAR_PIXEL_SIZE_TALL
  private bottomInset = 0

  constructor(character: Game_CharacterBase, phaseOffset = 0, zBias = 0) {
    this.character = character
    this.swayPhase = phaseOffset
    this.zBias = zBias
    this.object = new Container3D({ label: 'character' })

    // Use Sprite3D's built-in FlatMaterial by default so tintSprite() and alpha work properly.
    this.sprite = new Sprite3D({
      texture: Texture.EMPTY,
      pixelSize: CHAR_PIXEL_SIZE_TALL,
      anchor: { x: 0.5, y: 1 },
      alphaMode: 'mask',
      billboardMode: 'none',
      receiveShadow: true,
    })
    this.defaultMaterial = this.sprite.material
    this.shadowHandle = addSpriteShadow(this.sprite)
    this.object.addChild(this.sprite)

    this.groundShadow = createGroundShadow(0.42, 0.32, 0.6)
    this.object.visible = false
    this.groundShadow.visible = false
  }

  update(mapWidth: number, mapHeight: number, elapsed: number, lights: readonly DynamicSpriteLight[]): void {
    this.syncEventConfig()

    const visible = isCharacterVisible(this.character)
    if (!visible) {
      this.object.visible = false
      this.groundShadow.visible = false
      this.syncEventCollider(null)
      return
    }

    const tileId = this.character.tileId()
    const bitmap = tileId > 0 ? this.resolveTileBitmap(tileId) : this.resolveCharacterBitmap()
    if (!bitmap || !bitmap.isReady() || !bitmap.baseTexture) {
      this.object.visible = false
      this.groundShadow.visible = false
      return
    }

    bitmap.baseTexture.scaleMode = 'nearest'
    this.isTileMode = tileId > 0
    this.object.visible = true

    if (tileId > 0)
      this.updateTileFrame(bitmap, tileId)
    else
      this.updateCharacterFrame(bitmap)

    this.applyMaterialAndShadowState()
    this.updateTransform(mapWidth, mapHeight, elapsed)
    this.updateLighting(lights)
  }

  private syncEventConfig(): void {
    if (!isGameEvent(this.character))
      return
    const pageIndex = this.character._pageIndex
    if (pageIndex === this.lastPageIndex)
      return
    this.lastPageIndex = pageIndex
    this.config = resolveEventSpriteConfig(this.character)
    this.lastFrameKey = ''
  }

  private resolveCharacterBitmap(): Bitmap | null {
    const name = this.character.characterName()
    if (name !== this.characterName || this.tilesetName !== '') {
      this.characterName = name
      this.tilesetName = ''
      this.bitmap = ImageManager.loadCharacter(name)
      this.isBigCharacter = ImageManager.isBigCharacter(name)
      this.lastFrameKey = ''
    }
    return this.bitmap
  }

  private resolveTileBitmap(tileId: number): Bitmap | null {
    const setNumber = 5 + Math.floor(tileId / 256)
    const tileset = GlobalMananger.$gameMap.tileset()
    const name = tileset?.tilesetNames[setNumber] ?? ''
    if (!name)
      return null
    if (name !== this.tilesetName || this.characterName !== '') {
      this.tilesetName = name
      this.characterName = ''
      this.bitmap = ImageManager.loadTileset(name)
      this.lastFrameKey = ''
    }
    return this.bitmap
  }

  private updateTileFrame(bitmap: Bitmap, tileId: number): void {
    const map = GlobalMananger.$gameMap
    const pw = map.tileWidth()
    const ph = map.tileHeight()
    const sx = ((Math.floor(tileId / 128) % 2) * 8 + (tileId % 8)) * pw
    const sy = (Math.floor((tileId % 256) / 8) % 16) * ph
    const frameKey = `tile:${this.tilesetName}:${tileId}:${this.config.pixelSize ?? 'auto'}:${this.config.scale}`

    if (frameKey !== this.lastFrameKey) {
      this.lastFrameKey = frameKey
      const texture = getSlicedFrame(bitmap.baseTexture, sx, sy, pw, ph)
      this.applyFrameTexture(texture, pw, ph, TILE_BILLBOARD_PIXEL_SIZE)
    }
  }

  private updateCharacterFrame(bitmap: Bitmap): void {
    const pw = this.isBigCharacter ? bitmap.width / 3 : bitmap.width / 12
    const ph = this.isBigCharacter ? bitmap.height / 4 : bitmap.height / 8
    const index = this.character.characterIndex()
    const blockX = this.isBigCharacter ? 0 : (index % 4) * 3
    const blockY = this.isBigCharacter ? 0 : Math.floor(index / 4) * 4
    const patternX = this.character.pattern()
    const patternY = (this.character.direction() - 2) / 2
    const sx = (blockX + patternX) * pw
    const sy = (blockY + patternY) * ph
    const frameKey = `char:${this.characterName}:${sx},${sy},${pw},${ph}:${this.config.pixelSize ?? 'auto'}:${this.config.scale}`

    if (frameKey !== this.lastFrameKey) {
      this.lastFrameKey = frameKey
      const texture = getSlicedFrame(bitmap.baseTexture, sx, sy, pw, ph)
      const defaultPixelSize = ph >= 64 ? CHAR_PIXEL_SIZE_TALL : CHAR_PIXEL_SIZE_COMPACT
      this.applyFrameTexture(texture, pw, ph, defaultPixelSize)
    }
  }

  private applyFrameTexture(texture: Texture, pw: number, ph: number, defaultPixelSize: number): void {
    this.pixelSize = (this.config.pixelSize ?? defaultPixelSize) * this.config.scale
    this.sprite.pixelSize = this.pixelSize
    this.spriteWidth = pw * this.pixelSize
    this.spriteHeight = ph * this.pixelSize
    const footprint = getSpriteFootprintMetrics(texture)
    this.bottomInset = footprint.bottomInsetRatio * this.spriteHeight
    this.sprite.texture = texture
    if (this.emissiveMaterial?.emissive)
      this.emissiveMaterial.emissive.texture = texture
    this.shadowHandle.update(texture)
    this.syncEventCollider(footprint)
  }

  private syncEventCollider(footprint: SpriteFootprintMetrics | null): void {
    if (!isGameEvent(this.character))
      return
    const target = this.character as Game_Event & PixelColliderTarget
    const cfg = this.config
    const spec = cfg.collider

    if (!footprint) {
      if (spec.mode === 'none') {
        target._pixelCollider = {
          offsetX: cfg.offsetX / TILE_UNIT,
          offsetY: cfg.offsetZ / TILE_UNIT,
          halfW: 0.15,
          halfD: 0.15,
          disabled: true,
        }
      }
      else if (spec.mode === 'box') {
        target._pixelCollider = {
          offsetX: cfg.offsetX / TILE_UNIT,
          offsetY: cfg.offsetZ / TILE_UNIT,
          halfW: spec.halfW,
          halfD: spec.halfD,
        }
      }
      else {
        target._pixelCollider = null
      }
      return
    }

    const localCenterX = (0.5 - cfg.anchorX + footprint.centerOffsetRatio) * this.spriteWidth
    const cosY = Math.cos(cfg.rotationY)
    const sinY = Math.sin(cfg.rotationY)
    const worldOffsetX = cfg.offsetX + localCenterX * cosY
    const worldOffsetZ = cfg.offsetZ - localCenterX * sinY
    const offsetX = worldOffsetX / TILE_UNIT
    const offsetY = worldOffsetZ / TILE_UNIT

    if (spec.mode === 'none') {
      target._pixelCollider = { offsetX, offsetY, halfW: 0.15, halfD: 0.15, disabled: true }
      return
    }

    if (spec.mode === 'box') {
      target._pixelCollider = { offsetX, offsetY, halfW: spec.halfW, halfD: spec.halfD }
      return
    }

    // Elevated hanging sprites (lanterns, wall torches) clear the player's head and should not block walking.
    const visibleBottomY = cfg.offsetY - (1 - cfg.anchorY) * this.spriteHeight
      + (cfg.anchorY >= 0.5 && !cfg.hasCustomOffsetY ? 0 : this.bottomInset)
    const elevated = visibleBottomY >= ELEVATED_CLEARANCE_Y

    const visibleWorldW = this.spriteWidth * (footprint.widthRatio > 0 ? footprint.widthRatio : 0.5)
    const halfW = clamp((visibleWorldW * 0.5) / TILE_UNIT, MIN_AUTO_HALF_W, MAX_AUTO_HALF_W)
    const halfD = clamp(halfW * 0.65, MIN_AUTO_HALF_D, MAX_AUTO_HALF_D)
    target._pixelCollider = {
      offsetX,
      offsetY,
      halfW,
      halfD,
      disabled: elevated,
    }
  }

  private applyMaterialAndShadowState(): void {
    const cfg = this.config
    const isEmissive = cfg.emissive > 0

    if (isEmissive) {
      const targetAlphaMode = cfg.blend ? 'blend' : 'mask'
      if (!this.emissiveMaterial) {
        this.emissiveMaterial = new Material3D({
          baseColorTexture: this.sprite.texture,
          doubleSided: true,
          alphaMode: targetAlphaMode,
          metallic: 1,
          roughness: 1,
          emissive: {
            texture: this.sprite.texture,
            color: cfg.emissiveColor,
            strength: cfg.emissive,
          },
        })
      }
      else {
        this.emissiveMaterial.alphaMode = targetAlphaMode
        this.emissiveMaterial.textures.baseColor = this.sprite.texture
        if (this.emissiveMaterial.emissive) {
          this.emissiveMaterial.emissive.texture = this.sprite.texture
          this.emissiveMaterial.emissive.color = cfg.emissiveColor
          this.emissiveMaterial.emissive.strength = cfg.emissive
        }
      }
      if (this.sprite.material !== this.emissiveMaterial)
        this.sprite.material = this.emissiveMaterial
    }
    else {
      if (this.sprite.material !== this.defaultMaterial)
        this.sprite.material = this.defaultMaterial
      this.sprite.alphaMode = cfg.blend ? 'blend' : 'mask'
    }

    this.sprite.billboardMode = cfg.billboardMode
    this.sprite.anchor.set(cfg.anchorX, cfg.anchorY)

    const castShadow = cfg.castShadow ?? !isEmissive
    this.shadowHandle.setVisible(castShadow)

    const showGroundShadow = cfg.groundShadow ?? (!this.isTileMode && !isEmissive && !cfg.hasCustomOffsetY)
    this.groundShadow.visible = showGroundShadow
  }

  private updateTransform(mapWidth: number, mapHeight: number, elapsed: number): void {
    const cfg = this.config
    const { x, z } = tileToWorld(this.character._realX, this.character._realY, mapWidth, mapHeight)
    const jumpWorld = this.character.jumpHeight() * this.pixelSize

    this.object.position.set(
      x + cfg.offsetX,
      jumpWorld + cfg.offsetY,
      z + cfg.offsetZ + this.zBias,
    )
    this.object.rotation.y = cfg.rotationY

    if (this.groundShadow.visible) {
      this.groundShadow.position.set(x + cfg.offsetX, 0.004, z + cfg.offsetZ + this.zBias)
      const shadowScale = Math.max(0.45, 1 - jumpWorld * 0.45)
      this.groundShadow.width = Math.max(0.32, this.spriteWidth * 0.76) * shadowScale
      this.groundShadow.height = Math.max(0.24, this.spriteWidth * 0.56) * shadowScale
      const opacity = this.character.opacity() / 255
      this.groundShadow.alpha = 0.6 * opacity * shadowScale
    }

    const opacity = this.character.opacity() / 255
    this.sprite.alpha = opacity

    const enableBreathe = cfg.breathe ?? (!this.isTileMode && cfg.emissive <= 0 && cfg.sway === 0 && cfg.swayPitch === 0)
    if (enableBreathe) {
      const swayAmplitude = this.character.isMoving() ? 0.012 : 0.007
      const swaySpeed = this.character.isMoving() ? 6.5 : 3.0
      const offset = Math.sin(elapsed * swaySpeed + this.swayPhase) * swayAmplitude
      this.sprite.scale.set(1, 1 + offset / Math.max(this.spriteHeight, 0.01), 1)
    }
    else {
      this.sprite.scale.set(1, 1, 1)
    }

    this.sprite.rotation.z = cfg.sway !== 0 ? Math.sin(elapsed * cfg.swaySpeed) * cfg.sway : 0
    this.sprite.rotation.x = cfg.swayPitch !== 0 ? Math.sin(elapsed * cfg.swayPitchSpeed) * cfg.swayPitch : 0

    // Only pull down by transparent bottom padding when anchored at the feet on the ground.
    const shouldSeatOnGround = cfg.anchorY >= 0.5 && !cfg.hasCustomOffsetY
    this.sprite.position.y = shouldSeatOnGround ? -this.bottomInset : 0
  }

  private updateLighting(lights: readonly DynamicSpriteLight[]): void {
    if (this.config.emissive > 0)
      return
    this.worldPos.set(
      this.object.position.x,
      this.object.position.y + this.spriteHeight * 0.5,
      this.object.position.z,
    )
    this.sprite.tint = tintSprite(this.worldPos, lights)
  }
}
