import type { MZ } from '../../database-types'
import type { Rectangle } from '../primitives/Rectangle'
import type { Window_Message } from './Window_Message'
import { ConfigManager } from '../managers/ConfigManager'
import { DataManager } from '../managers/DataManager'
import { GlobalMananger } from '../managers/GlobalManager'
import { Graphics } from '../primitives/Graphics'
import { Sprite_Button } from '../sprites/Sprite_Button'
import { Window_ItemList } from './Window_ItemList'

/**
 * Window_EventItem
 *
 * The window used for the event command [Select Item].
 */
export class Window_EventItem extends Window_ItemList {
  _messageWindow: Window_Message | null
  _cancelButton: Sprite_Button | null

  constructor(rect: Rectangle) {
    super(rect)
    this._messageWindow = null
    this._cancelButton = null
    this.createCancelButton()
    this.openness = 0
    this.deactivate()
    this.setHandler('ok', this.onOk.bind(this))
    this.setHandler('cancel', this.onCancel.bind(this))
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
    this.refresh()
    this.updatePlacement()
    this.placeCancelButton()
    this.forceSelect(0)
    this.open()
    this.activate()
  }

  update(): void {
    super.update()
    this.updateCancelButton()
  }

  updateCancelButton(): void {
    if (this._cancelButton) {
      this._cancelButton.visible = this.isOpen()
    }
  }

  updatePlacement(): void {
    if (this._messageWindow!.y >= Graphics.boxHeight / 2) {
      this.y = 0
    }
    else {
      this.y = Graphics.boxHeight - this.height
    }
  }

  placeCancelButton(): void {
    if (this._cancelButton) {
      const spacing = 8
      const button = this._cancelButton
      if (this.y === 0) {
        button.y = this.height + spacing
      }
      else if (this._messageWindow!.y >= Graphics.boxHeight / 4) {
        const distance = this.y - this._messageWindow!.y
        button.y = -button.height - spacing - distance
      }
      else {
        button.y = -button.height - spacing
      }
      button.x = this.width - button.width - spacing
    }
  }

  includes(item: MZ.GeneralItem | null): boolean {
    const itypeId = GlobalMananger.$gameMessage.itemChoiceItypeId()
    return DataManager.isItem(item) && item.itypeId === itypeId
  }

  needsNumber(): boolean {
    const itypeId = GlobalMananger.$gameMessage.itemChoiceItypeId()
    if (itypeId === 2) {
      // Key Item
      return GlobalMananger.$dataSystem.optKeyItemsNumber
    }
    else if (itypeId >= 3) {
      // Hidden Item
      return false
    }
    else {
      // Normal Item
      return true
    }
  }

  isEnabled(_item: MZ.GeneralItem | null): boolean {
    return true
  }

  onOk(): void {
    const item = this.item()
    const itemId = item ? item.id : 0
    GlobalMananger.$gameVariables.setValue(GlobalMananger.$gameMessage.itemChoiceVariableId(), itemId)
    this._messageWindow!.terminateMessage()
    this.close()
  }

  onCancel(): void {
    GlobalMananger.$gameVariables.setValue(GlobalMananger.$gameMessage.itemChoiceVariableId(), 0)
    this._messageWindow!.terminateMessage()
    this.close()
  }
}
