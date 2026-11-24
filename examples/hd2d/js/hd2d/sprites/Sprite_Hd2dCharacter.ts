import type { PointLight } from '@pixi/3d'
import type { TextureSource } from 'pixi.js'
import type { Bitmap, Game_CharacterBase } from 'rmmz-next'
import { Container3D, Sprite3D, Vector3 } from '@pixi/3d'
import { Rectangle, Texture } from 'pixi.js'
import { ImageManager } from 'rmmz-next'
import { CHAR_PIXEL_SIZE_COMPACT, CHAR_PIXEL_SIZE_TALL, tileToWorld } from '../constants'
import { createGroundShadow } from '../scene/groundShadow'
import { addSpriteShadow, getBottomInsetRatio } from '../scene/spriteShadow'
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

function isCharacterVisible(character: Game_CharacterBase): boolean {
  if (character.isTransparent() || character.opacity() <= 0)
    return false
  if ('isVisible' in character && typeof (character as { isVisible?: () => boolean }).isVisible === 'function') {
    if (!(character as { isVisible: () => boolean }).isVisible())
      return false
  }
  return character.characterName().length > 0
}

export class Sprite_Hd2dCharacter {
  readonly character: Game_CharacterBase
  readonly object: Container3D
  readonly sprite: Sprite3D
  readonly groundShadow: Sprite3D

  private readonly updateShadow: (texture: Texture) => void
  private readonly worldPos = new Vector3()
  private readonly swayPhase: number
  private readonly zBias: number
  private bitmap: Bitmap | null = null
  private characterName = ''
  private isBigCharacter = false
  private lastFrameKey = ''
  private pixelSize = CHAR_PIXEL_SIZE_TALL
  private spriteWidth = 48 * CHAR_PIXEL_SIZE_TALL
  private spriteHeight = 80 * CHAR_PIXEL_SIZE_TALL
  private bottomInset = 0

  constructor(character: Game_CharacterBase, phaseOffset = 0, zBias = 0) {
    this.character = character
    this.swayPhase = phaseOffset
    this.zBias = zBias
    this.object = new Container3D({ label: 'character' })

    // Use Sprite3D's built-in FlatMaterial (like HD2D-Three) so tintSprite() and alpha work properly.
    this.sprite = new Sprite3D({
      texture: Texture.EMPTY,
      pixelSize: CHAR_PIXEL_SIZE_TALL,
      anchor: { x: 0.5, y: 1 },
      alphaMode: 'mask',
      billboardMode: 'none',
      receiveShadow: true,
    })
    this.updateShadow = addSpriteShadow(this.sprite, { crossCard: true })
    this.object.addChild(this.sprite)

    this.groundShadow = createGroundShadow(0.56, 0.42, 0.78)
    this.object.visible = false
    this.groundShadow.visible = false
  }

  update(mapWidth: number, mapHeight: number, elapsed: number, lights: readonly PointLight[]): void {
    const visible = isCharacterVisible(this.character)
    if (!visible) {
      this.object.visible = false
      this.groundShadow.visible = false
      return
    }

    const name = this.character.characterName()
    if (name !== this.characterName) {
      this.characterName = name
      this.bitmap = ImageManager.loadCharacter(name)
      this.isBigCharacter = ImageManager.isBigCharacter(name)
      this.lastFrameKey = ''
    }

    const bitmap = this.bitmap
    if (!bitmap || !bitmap.isReady() || !bitmap.baseTexture) {
      this.object.visible = false
      this.groundShadow.visible = false
      return
    }

    bitmap.baseTexture.scaleMode = 'nearest'
    this.object.visible = true
    this.groundShadow.visible = true

    this.updateFrame(bitmap)
    this.updateTransform(mapWidth, mapHeight, elapsed)
    this.updateLighting(lights)
  }

  private updateFrame(bitmap: Bitmap): void {
    const pw = this.isBigCharacter ? bitmap.width / 3 : bitmap.width / 12
    const ph = this.isBigCharacter ? bitmap.height / 4 : bitmap.height / 8
    const index = this.character.characterIndex()
    const blockX = this.isBigCharacter ? 0 : (index % 4) * 3
    const blockY = this.isBigCharacter ? 0 : Math.floor(index / 4) * 4
    const patternX = this.character.pattern()
    const patternY = (this.character.direction() - 2) / 2
    const sx = (blockX + patternX) * pw
    const sy = (blockY + patternY) * ph
    const frameKey = `${this.characterName}:${sx},${sy},${pw},${ph}`

    if (frameKey !== this.lastFrameKey) {
      this.lastFrameKey = frameKey
      const texture = getSlicedFrame(bitmap.baseTexture, sx, sy, pw, ph)
      // Match HD2D-Three's 0.01 world units/px for tall sprites (e.g. 48x80), while keeping 48x48 sheets well-proportioned.
      this.pixelSize = ph >= 64 ? CHAR_PIXEL_SIZE_TALL : CHAR_PIXEL_SIZE_COMPACT
      this.sprite.pixelSize = this.pixelSize
      this.spriteWidth = pw * this.pixelSize
      this.spriteHeight = ph * this.pixelSize
      this.bottomInset = getBottomInsetRatio(texture) * this.spriteHeight
      this.sprite.texture = texture
      this.updateShadow(texture)
    }
  }

  private updateTransform(mapWidth: number, mapHeight: number, elapsed: number): void {
    const { x, z } = tileToWorld(this.character._realX, this.character._realY, mapWidth, mapHeight)
    const jumpWorld = this.character.jumpHeight() * this.pixelSize

    this.object.position.set(x, jumpWorld, z + this.zBias)
    this.groundShadow.position.set(x, 0.004, z + this.zBias)

    const shadowScale = Math.max(0.45, 1 - jumpWorld * 0.45)
    this.groundShadow.width = Math.max(0.5, this.spriteWidth * 0.78) * shadowScale
    this.groundShadow.height = Math.max(0.38, this.spriteWidth * 0.58) * shadowScale

    const opacity = this.character.opacity() / 255
    this.sprite.alpha = opacity
    this.groundShadow.alpha = 0.78 * opacity * shadowScale

    // Anchor at the feet (y = 1) and pull down by transparent bottom padding so feet touch y = 0.
    const swayAmplitude = this.character.isMoving() ? 0.012 : 0.007
    const swaySpeed = this.character.isMoving() ? 6.5 : 3.0
    const offset = Math.sin(elapsed * swaySpeed + this.swayPhase) * swayAmplitude
    this.sprite.scale.set(1, 1 + offset / Math.max(this.spriteHeight, 0.01), 1)
    this.sprite.position.y = -this.bottomInset
  }

  private updateLighting(lights: readonly PointLight[]): void {
    this.worldPos.set(
      this.object.position.x,
      this.object.position.y + this.spriteHeight * 0.5,
      this.object.position.z,
    )
    this.sprite.tint = tintSprite(this.worldPos, lights)
  }
}
