import type * as PIXI from 'pixi.js'
import type { Game_Battler } from '../objects/Game_Battler'
import { ColorManager } from '../managers/ColorManager'
import { GlobalMananger } from '../managers/GlobalManager'
import { Bitmap } from '../primitives/Bitmap'
import { Sprite } from '../primitives/Sprite'

/**
 * Sprite_Name
 *
 * The sprite for displaying a status gauge.
 */
export class Sprite_Name extends Sprite {
  _battler!: null | Game_Battler
  _name!: string
  _textColor!: string

  constructor() {
    super()
    this.initMembers()
    this.createBitmap()
  }

  initMembers(): void {
    this._battler = null
    this._name = ''
    this._textColor = ''
  }

  destroy(options: PIXI.DestroyOptions = { children: true, texture: true }): void {
    this.bitmap?.destroy()
    super.destroy(options)
  }

  createBitmap(): void {
    const width = this.bitmapWidth()
    const height = this.bitmapHeight()
    this.bitmap = new Bitmap(width, height)
  }

  bitmapWidth(): number {
    return 128
  }

  bitmapHeight(): number {
    return 24
  }

  fontFace(): string {
    return GlobalMananger.$gameSystem.mainFontFace()
  }

  fontSize(): number {
    return GlobalMananger.$gameSystem.mainFontSize()
  }

  setup(battler: Game_Battler): void {
    this._battler = battler
    this.updateBitmap()
  }

  update(): void {
    super.update()
    this.updateBitmap()
  }

  updateBitmap(): void {
    const name = this.name
    const color = this.textColor()
    if (name !== this._name || color !== this._textColor) {
      this._name = name
      this._textColor = color
      this.redraw()
    }
  }

  get name(): string {
    return this._battler ? this._battler.name() : ''
  }

  textColor(): string {
    return ColorManager.hpColor(this._battler)
  }

  outlineColor(): string {
    return ColorManager.outlineColor()
  }

  outlineWidth(): number {
    return 3
  }

  redraw(): void {
    const name = this.name
    const width = this.bitmapWidth()
    const height = this.bitmapHeight()
    this.setupFont()
    this.bitmap!.clear()
    this.bitmap!.drawText(name, 0, 0, width, height, 'left')
  }

  setupFont(): void {
    this.bitmap!.fontFace = this.fontFace()
    this.bitmap!.fontSize = this.fontSize()
    this.bitmap!.textColor = this.textColor()
    this.bitmap!.outlineColor = this.outlineColor()
    this.bitmap!.outlineWidth = this.outlineWidth()
  }
}
