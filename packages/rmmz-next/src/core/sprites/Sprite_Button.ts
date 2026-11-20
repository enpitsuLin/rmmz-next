import { ImageManager } from '../managers/ImageManager'
import { Input } from '../primitives/Input'
import { Rectangle } from '../primitives/Rectangle'
import { Sprite_Clickable } from './Sprite_Clickable'

/**
 * Sprite_Button
 *
 * The sprite for displaying a button.
 */
export class Sprite_Button extends Sprite_Clickable {
  _buttonType: string
  _clickHandler: null | (() => void)
  _coldFrame: null | Rectangle
  _hotFrame: null | Rectangle
  constructor(buttonType: Sprite_Button.ButtonType) {
    super()
    this._buttonType = buttonType
    this._clickHandler = null
    this._coldFrame = null
    this._hotFrame = null
    this.setupFrames()
  }

  setupFrames(): void {
    const data = this.buttonData()
    const x = data.x * this.blockWidth()
    const width = data.w * this.blockWidth()
    const height = this.blockHeight()
    this.loadButtonImage()
    this.setColdFrame(x, 0, width, height)
    this.setHotFrame(x, height, width, height)
    this.updateFrame()
    this.updateOpacity()
  }

  blockWidth(): number {
    return 48
  }

  blockHeight(): number {
    return 48
  }

  loadButtonImage(): void {
    this.bitmap = ImageManager.loadSystem('ButtonSet')
  }

  buttonData(): { x: number, w: number } {
    const buttonTable = {
      cancel: { x: 0, w: 2 },
      pageup: { x: 2, w: 1 },
      pagedown: { x: 3, w: 1 },
      down: { x: 4, w: 1 },
      up: { x: 5, w: 1 },
      down2: { x: 6, w: 1 },
      up2: { x: 7, w: 1 },
      ok: { x: 8, w: 2 },
      menu: { x: 10, w: 1 },
    } as Record<string, { x: number, w: number }>
    return buttonTable[this._buttonType]
  }

  update(): void {
    super.update()
    this.checkBitmap()
    this.updateFrame()
    this.updateOpacity()
    this.processTouch()
  }

  checkBitmap(): void {
    if (this.bitmap?.isReady() && this.bitmap.width < this.blockWidth() * 11) {
      // Probably MV image is used
      throw new Error('ButtonSet image is too small')
    }
  }

  updateFrame(): void {
    const frame = this.isPressed() ? this._hotFrame : this._coldFrame
    if (frame) {
      this.setFrame(frame.x, frame.y, frame.width, frame.height)
    }
  }

  updateOpacity(): void {
    this.opacity = this._pressed ? 255 : 192
  }

  setColdFrame(x: number, y: number, width: number, height: number): void {
    this._coldFrame = new Rectangle(x, y, width, height)
  }

  setHotFrame(x: number, y: number, width: number, height: number): void {
    this._hotFrame = new Rectangle(x, y, width, height)
  }

  setClickHandler(method: (() => void) | null): void {
    this._clickHandler = method
  }

  onClick(): void {
    if (this._clickHandler) {
      this._clickHandler()
    }
    else {
      Input.virtualClick(this._buttonType)
    }
  }
}

export namespace Sprite_Button {
  export type ButtonType = 'cancel' | 'pageup' | 'pagedown' | 'down' | 'up' | 'down2' | 'up2' | 'ok' | 'menu'
}
