import type * as PIXI from 'pixi.js'
import { Bitmap, Graphics, Sprite } from '../core'
import { GlobalMananger, ColorManager } from '../managers'

/**
 * Sprite_Timer
 *
 * The sprite for displaying the timer.
 */
export class Sprite_Timer extends Sprite {
  _seconds: number
  constructor() {
    super()
    this._seconds = 0
    this.createBitmap()
    this.update()
  }

  destroy(options?: PIXI.IDestroyOptions): void {
    this.bitmap?.destroy()
    super.destroy(options)
  }

  createBitmap(): void {
    this.bitmap = new Bitmap(96, 48)
    this.bitmap.fontFace = this.fontFace()
    this.bitmap.fontSize = this.fontSize()
    this.bitmap.outlineColor = ColorManager.outlineColor()
  }

  fontFace(): string {
    return GlobalMananger.$gameSystem.numberFontFace()
  }

  fontSize(): number {
    return GlobalMananger.$gameSystem.mainFontSize() + 8
  }

  update(): void {
    super.update()
    this.updateBitmap()
    this.updatePosition()
    this.updateVisibility()
  }

  updateBitmap(): void {
    if (this._seconds !== GlobalMananger.$gameTimer.seconds()) {
      this._seconds = GlobalMananger.$gameTimer.seconds()
      this.redraw()
    }
  }

  redraw(): void {
    const text = this.timerText()
    const width = this.bitmap!.width
    const height = this.bitmap!.height
    this.bitmap!.clear()
    this.bitmap!.drawText(text, 0, 0, width, height, 'center')
  }

  timerText(): string {
    const min = Math.floor(this._seconds / 60) % 60
    const sec = this._seconds % 60
    return `${min.padZero(2)}:${sec.padZero(2)}`
  }

  updatePosition(): void {
    this.x = (Graphics.width - this.bitmap!.width) / 2
    this.y = 0
  }

  updateVisibility(): void {
    this.visible = GlobalMananger.$gameTimer.isWorking()
  }
}
