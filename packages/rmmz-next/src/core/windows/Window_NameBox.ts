import type { Window_Message } from './Window_Message'
import { GlobalMananger } from '../managers/GlobalManager'
import { Graphics, Rectangle } from '../primitives'
import { Window_Base } from './Window_Base'

/**
 * Window_NameBox
 *
 * The window for displaying a speaker name above the message window.
 */
export class Window_NameBox extends Window_Base {
  _name: string
  _messageWindow: Window_Message | null

  constructor(rect?: Rectangle) {
    rect = rect || new Rectangle()
    super(rect)

    this.openness = 0
    this._name = ''
    this._messageWindow = null
  }

  setMessageWindow(messageWindow: Window_Message): void {
    this._messageWindow = messageWindow
  }

  setName(name: string): void {
    if (this._name !== name) {
      this._name = name
      this.refresh()
    }
  }

  clear(): void {
    this.setName('')
  }

  start(): void {
    this.updatePlacement()
    this.updateBackground()
    this.createContents()
    this.refresh()
  }

  updatePlacement(): void {
    this.width = this.windowWidth()
    this.height = this.windowHeight()
    const messageWindow = this._messageWindow!
    if (GlobalMananger.$gameMessage.isRTL()) {
      this.x = messageWindow.x + messageWindow.width - this.width
    }
    else {
      this.x = messageWindow.x
    }
    if (messageWindow.y > 0) {
      this.y = messageWindow.y - this.height
    }
    else {
      this.y = messageWindow.y + messageWindow.height
    }
  }

  updateBackground(): void {
    this.setBackgroundType(GlobalMananger.$gameMessage.background())
  }

  windowWidth(): number {
    if (this._name) {
      const textWidth = this.textSizeEx(this._name).width
      const padding = this.padding + this.itemPadding()
      const width = Math.ceil(textWidth) + padding * 2
      return Math.min(width, Graphics.boxWidth)
    }
    else {
      return 0
    }
  }

  windowHeight(): number {
    return this.fittingHeight(1)
  }

  refresh(): void {
    const rect = this.baseTextRect()
    this.contents.clear()
    this.drawTextEx(this._name, rect.x, rect.y, rect.width)
  }
}
