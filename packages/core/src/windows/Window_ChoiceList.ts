import type { Window_Message } from './Window_Message'
import { Graphics, Rectangle } from '../core'
import { ConfigManager } from '../managers/ConfigManager'
import { Sprite_Button } from '../sprites'
import { Window_Command } from './Window_Command'
import { GlobalMananger } from '../managers'

/**
 * Window_ChoiceList
 *
 * The window used for the event command [Show Choices].
 */
export class Window_ChoiceList extends Window_Command {
  _background: number
  _messageWindow: Window_Message | null
  _cancelButton: Sprite_Button | null

  constructor(rect?: Rectangle) {
    rect = rect || new Rectangle()
    super(rect)

    this._background = 0
    this._messageWindow = null
    this._cancelButton = null
    this.createCancelButton()
    this.openness = 0
    this.deactivate()
    this._canRepeat = false
  }

  setMessageWindow(messageWindow: Window_Message): void {
    this._messageWindow = messageWindow
  }

  createCancelButton(): void {
    if (ConfigManager.touchUI) {
      this._cancelButton = new Sprite_Button('cancel')
      this._cancelButton.visible = false
      this.addChild(this._cancelButton)
    }
  }

  start(): void {
    this.updatePlacement()
    this.updateBackground()
    this.placeCancelButton()
    this.createContents()
    this.refresh()
    this.scrollTo(0, 0)
    this.selectDefault()
    this.open()
    this.activate()
  }

  update(): void {
    super.update()
    this.updateCancelButton()
  }

  updateCancelButton(): void {
    if (this._cancelButton) {
      this._cancelButton.visible = this.needsCancelButton() && this.isOpen()
    }
  }

  selectDefault(): void {
    this.select(GlobalMananger.$gameMessage.choiceDefaultType())
  }

  updatePlacement(): void {
    this.x = this.windowX()
    this.y = this.windowY()
    this.width = this.windowWidth()
    this.height = this.windowHeight()
  }

  updateBackground(): void {
    this._background = GlobalMananger.$gameMessage.choiceBackground()
    this.setBackgroundType(this._background)
  }

  placeCancelButton(): void {
    if (this._cancelButton) {
      const spacing = 8
      const button = this._cancelButton
      const right = this.x + this.width
      if (right < Graphics.boxWidth - button.width + spacing) {
        button.x = this.width + spacing
      }
      else {
        button.x = -button.width - spacing
      }
      button.y = this.height / 2 - button.height / 2
    }
  }

  windowX(): number {
    const positionType = GlobalMananger.$gameMessage.choicePositionType()
    if (positionType === 1) {
      return (Graphics.boxWidth - this.windowWidth()) / 2
    }
    else if (positionType === 2) {
      return Graphics.boxWidth - this.windowWidth()
    }
    else {
      return 0
    }
  }

  windowY(): number {
    const messageY = this._messageWindow!.y
    if (messageY >= Graphics.boxHeight / 2) {
      return messageY - this.windowHeight()
    }
    else {
      return messageY + this._messageWindow!.height
    }
  }

  windowWidth(): number {
    const width = this.maxChoiceWidth() + this.colSpacing() + this.padding * 2
    return Math.min(width, Graphics.boxWidth)
  }

  windowHeight(): number {
    return this.fittingHeight(this.numVisibleRows())
  }

  numVisibleRows(): number {
    const choices = GlobalMananger.$gameMessage.choices()
    return Math.min(choices.length, this.maxLines())
  }

  maxLines(): number {
    const messageWindow = this._messageWindow
    const messageY = messageWindow ? messageWindow.y : 0
    const messageHeight = messageWindow ? messageWindow.height : 0
    const centerY = Graphics.boxHeight / 2
    if (messageY < centerY && messageY + messageHeight > centerY) {
      return 4
    }
    else {
      return 8
    }
  }

  maxChoiceWidth(): number {
    let maxWidth = 96
    const choices = GlobalMananger.$gameMessage.choices()
    for (const choice of choices) {
      const textWidth = this.textSizeEx(choice).width
      const choiceWidth = Math.ceil(textWidth) + this.itemPadding() * 2
      if (maxWidth < choiceWidth) {
        maxWidth = choiceWidth
      }
    }
    return maxWidth
  }

  makeCommandList(): void {
    const choices = GlobalMananger.$gameMessage.choices()
    for (const choice of choices) {
      this.addCommand(choice, 'choice')
    }
  }

  drawItem(index: number): void {
    const rect = this.itemLineRect(index)
    this.drawTextEx(this.commandName(index), rect.x, rect.y, rect.width)
  }

  isCancelEnabled(): boolean {
    return GlobalMananger.$gameMessage.choiceCancelType() !== -1
  }

  needsCancelButton(): boolean {
    return GlobalMananger.$gameMessage.choiceCancelType() === -2
  }

  callOkHandler(): void {
    GlobalMananger.$gameMessage.onChoice(this.index())
    this._messageWindow!.terminateMessage()
    this.close()
  }

  callCancelHandler(): void {
    GlobalMananger.$gameMessage.onChoice(GlobalMananger.$gameMessage.choiceCancelType())
    this._messageWindow!.terminateMessage()
    this.close()
  }
}
