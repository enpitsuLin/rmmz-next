import type { RGBA } from '../types/utils'
import type { Bitmap } from './Bitmap'
import * as PIXI from 'pixi.js'
import { ColorFilter } from './ColorFilter'
import { Rectangle } from './Rectangle'

/**
 * The basic object that is rendered to the game screen.
 *
 * @class
 * @extends PIXI.Sprite
 * @param {Bitmap} bitmap - The image for the sprite.
 */
export class Sprite extends PIXI.Sprite {
  dy?: number
  ry?: number
  z?: number

  isPlaying(): boolean {
    throw new Error('Method not implemented.')
  }

  spriteId: number

  _bitmap: Bitmap | null
  _frame: Rectangle = new Rectangle()
  _hue: number = 0
  _blendColor: RGBA = [0, 0, 0, 0]
  _colorTone: RGBA = [0, 0, 0, 0]
  _colorFilter: ColorFilter | null = null
  _hidden: boolean = false
  _refreshFrame!: boolean

  static _counter: number = 0

  override children!: PIXI.Sprite[]

  constructor(bitmap?: Bitmap | null) {
    super()

    this.allowChildren = true
    const texture = new PIXI.Texture({
      source: PIXI.Texture.EMPTY.source,
      frame: this._frame,
      dynamic: true,
    })
    this.texture = texture
    this.spriteId = Sprite._counter++
    this._bitmap = bitmap ?? null
    this._onBitmapChange()
  }

  get bitmap(): Bitmap | null {
    return this._bitmap
  }

  set bitmap(value) {
    if (this._bitmap !== value) {
      this._bitmap = value
      this._onBitmapChange()
    }
  }

  get width(): number {
    return this._frame.width
  }

  set width(value: number) {
    this._frame.width = value
    this._refresh()
  }

  get height(): number {
    return this._frame.height
  }

  set height(value: number) {
    this._frame.height = value
    this._refresh()
  }

  get opacity(): number {
    return this.alpha * 255
  }

  set opacity(value: number) {
    this.alpha = value.clamp(0, 255) / 255
  }

  get blendMode(): PIXI.BLEND_MODES {
    return super.blendMode
  }

  set blendMode(value: number | PIXI.BLEND_MODES) {
    const mode = typeof value === 'number'
      ? (['normal', 'add', 'multiply', 'screen'] as const)[value]
      : value
    super.blendMode = mode
    if (this._colorFilter) {
      this._colorFilter.blendMode = mode
    }
  }

  destroy(options: PIXI.DestroyOptions = { children: true, texture: true }): void {
    super.destroy(options)
  }

  update(): void {
    for (const child of this.children) {
      if (child.update) {
        child.update()
      }
    }
  }

  hide(): void {
    this._hidden = true
    this.updateVisibility()
  }

  show(): void {
    this._hidden = false
    this.updateVisibility()
  }

  updateVisibility(): void {
    this.visible = !this._hidden
  }

  move(x: number, y: number): void {
    this.x = x
    this.y = y
  }

  setFrame(x: number, y: number, width: number, height: number): void {
    this._refreshFrame = false
    const frame = this._frame
    if (
      x !== frame.x
      || y !== frame.y
      || width !== frame.width
      || height !== frame.height
    ) {
      frame.x = x
      frame.y = y
      frame.width = width
      frame.height = height
      this._refresh()
    }
  }

  setHue(hue: number): void {
    if (this._hue !== Number(hue)) {
      this._hue = Number(hue)
      this._updateColorFilter()
    }
  }

  getBlendColor(): RGBA {
    return this._blendColor.clone() as RGBA
  }

  setBlendColor(color: RGBA): void {
    if (!(Array.isArray(color))) {
      throw new TypeError('Argument must be an array')
    }
    if (!this._blendColor.equals(color)) {
      this._blendColor = color.clone() as RGBA
      this._updateColorFilter()
    }
  }

  getColorTone(): RGBA {
    return this._colorTone.clone() as RGBA
  }

  setColorTone(tone: RGBA): void {
    if (!(Array.isArray(tone))) {
      throw new TypeError('Argument must be an array')
    }
    if (!this._colorTone.equals(tone)) {
      this._colorTone = tone.clone() as RGBA
      this._updateColorFilter()
    }
  }

  _onBitmapChange(): void {
    if (this._bitmap) {
      this._refreshFrame = true
      this._bitmap.addLoadListener(this._onBitmapLoad.bind(this))
    }
    else {
      this._refreshFrame = false
      this.texture.frame.copyFrom(new Rectangle())
      this.texture.update()
    }
  }

  _onBitmapLoad(bitmapLoaded: Bitmap): void {
    if (bitmapLoaded === this._bitmap) {
      if (this._refreshFrame && this._bitmap) {
        this._refreshFrame = false
        this._frame.width = this._bitmap.width
        this._frame.height = this._bitmap.height
      }
    }
    this._refresh()
  }

  _refresh(): void {
    const texture = this.texture
    const frameX = Math.floor(this._frame.x)
    const frameY = Math.floor(this._frame.y)
    const frameW = Math.floor(this._frame.width)
    const frameH = Math.floor(this._frame.height)
    const baseTexture = this._bitmap ? this._bitmap.baseTexture : null
    const baseTextureW = baseTexture ? baseTexture.width : 0
    const baseTextureH = baseTexture ? baseTexture.height : 0
    const realX = frameX.clamp(0, baseTextureW)
    const realY = frameY.clamp(0, baseTextureH)
    const realW = (frameW - realX + frameX).clamp(0, baseTextureW - realX)
    const realH = (frameH - realY + frameY).clamp(0, baseTextureH - realY)
    const frame = new Rectangle(realX, realY, realW, realH)
    if (texture) {
      this.pivot.x = frameX - realX
      this.pivot.y = frameY - realY
      if (baseTexture) {
        texture.source = baseTexture
        try {
          texture.frame.copyFrom(frame)
        }
        catch (e) {
          console.error(e)
          texture.frame.copyFrom(new Rectangle())
        }
      }
      texture.update()
    }
  }

  _createColorFilter(): void {
    this._colorFilter = new ColorFilter()
    this._colorFilter.blendMode = this.blendMode
    this.filters = [...(this.filters ?? []), this._colorFilter]
  }

  _updateColorFilter(): void {
    if (!this._colorFilter) {
      this._createColorFilter()
    }
    const filter = this._colorFilter!
    filter.setHue(this._hue)
    // ColorFilter expects tuple types; RGBA is compatible at runtime
    filter.setBlendColor(this._blendColor)
    filter.setColorTone(this._colorTone)
  }
}
