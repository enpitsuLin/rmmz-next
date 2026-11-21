import { GlobalMananger } from '../managers/GlobalManager'
import { Input } from '../primitives/Input'
import { Rectangle } from '../primitives/Rectangle'
import { TouchInput } from '../primitives/TouchInput'
import { Window_Base } from './Window_Base'

/**
 * Window_ScrollText
 *
 * The window for displaying scrolling text. No frame is displayed, but it
 * is handled as a window for convenience.
 */
export class Window_ScrollText extends Window_Base {
  _reservedRect: Rectangle
  _text: string | null
  _maxBitmapHeight: number
  _allTextHeight: number
  _blockHeight: number
  _blockIndex: number
  _scrollY: number

  constructor(rect: Rectangle) {
    super(new Rectangle())
    this.opacity = 0
    this.hide()
    this._reservedRect = rect
    this._text = ''
    this._maxBitmapHeight = 2048
    this._allTextHeight = 0
    this._blockHeight = 0
    this._blockIndex = 0
    this._scrollY = 0
  }

  update(): void {
    super.update()
    if (GlobalMananger.$gameMessage.scrollMode()) {
      if (this._text) {
        this.updateMessage()
      }
      if (!this._text && GlobalMananger.$gameMessage.hasText()) {
        this.startMessage()
      }
    }
  }

  startMessage(): void {
    this._text = GlobalMananger.$gameMessage.allText()
    if (this._text) {
      this.updatePlacement()
      this._allTextHeight = this.textSizeEx(this._text).height
      this._blockHeight = this._maxBitmapHeight - this.height
      this._blockIndex = 0
      this.scrollOrigin.y = this._scrollY = -this.height
      this.createContents()
      this.refresh()
      this.show()
    }
    else {
      GlobalMananger.$gameMessage.clear()
    }
  }

  refresh(): void {
    const rect = this.baseTextRect()
    const y = rect.y - this._scrollY + (this._scrollY % this._blockHeight)
    this.contents.clear()
    this.drawTextEx(this._text!, rect.x, y, rect.width)
  }

  updatePlacement(): void {
    const rect = this._reservedRect
    this.move(rect.x, rect.y, rect.width, rect.height)
  }

  contentsHeight(): number {
    if (this._allTextHeight > 0) {
      return Math.min(this._allTextHeight, this._maxBitmapHeight)
    }
    else {
      return 0
    }
  }

  updateMessage(): void {
    this._scrollY += this.scrollSpeed()
    if (this._scrollY >= this._allTextHeight) {
      this.terminateMessage()
    }
    else {
      const blockIndex = Math.floor(this._scrollY / this._blockHeight)
      if (blockIndex > this._blockIndex) {
        this._blockIndex = blockIndex
        this.refresh()
      }
      this.scrollOrigin.y = this._scrollY % this._blockHeight
    }
  }

  scrollSpeed(): number {
    let speed = GlobalMananger.$gameMessage.scrollSpeed() / 2
    if (this.isFastForward()) {
      speed *= this.fastForwardRate()
    }
    return speed
  }

  isFastForward(): boolean {
    if (GlobalMananger.$gameMessage.scrollNoFast()) {
      return false
    }
    else {
      return (
        Input.isPressed('ok')
        || Input.isPressed('shift')
        || TouchInput.isPressed()
      )
    }
  }

  fastForwardRate(): number {
    return 3
  }

  terminateMessage(): void {
    this._text = null
    GlobalMananger.$gameMessage.clear()
    this.hide()
  }
}
