import type { MZ } from '@rmmz-lib/database-types'
import type { Rectangle } from '../core'
import type { Game_Actor } from '../objects'
import type { Window_EquipItem } from './Window_EquipItem'
import type { Window_EquipStatus } from './Window_EquipStatus'
import { ColorManager } from '../managers'
import { Window_StatusBase } from './Window_StatusBase'

/**
 * Window_EquipSlot
 *
 * The window for selecting an equipment slot on the equipment screen.
 */
export class Window_EquipSlot extends Window_StatusBase {
  _actor: Game_Actor | null
  _statusWindow: Window_EquipStatus | null
  _itemWindow: Window_EquipItem | null

  constructor(rect: Rectangle.Shape) {
    super(rect)
    this._actor = null
    this._statusWindow = null
    this._itemWindow = null
    this.refresh()
  }

  setActor(actor: Game_Actor | null): void {
    if (this._actor !== actor) {
      this._actor = actor
      this.refresh()
    }
  }

  update(): void {
    super.update()
    if (this._itemWindow) {
      this._itemWindow.setSlotId(this.index())
    }
  }

  maxItems(): number {
    return this._actor ? this._actor.equipSlots().length : 0
  }

  item(): MZ.Equip | null {
    return this.itemAt(this.index())
  }

  itemAt(index: number): MZ.Equip | null {
    return this._actor ? this._actor.equips()[index] : null
  }

  drawItem(index: number): void {
    if (this._actor) {
      const slotName = this.actorSlotName(this._actor, index)
      const item = this.itemAt(index)
      const slotNameWidth = this.slotNameWidth()
      const rect = this.itemLineRect(index)
      const itemWidth = rect.width - slotNameWidth
      this.changeTextColor(ColorManager.systemColor())
      this.changePaintOpacity(this.isEnabled(index))
      this.drawText(slotName, rect.x, rect.y, slotNameWidth)
      this.drawItemName(item as unknown as MZ.Item | undefined, rect.x + slotNameWidth, rect.y, itemWidth)
      this.changePaintOpacity(true)
    }
  }

  slotNameWidth(): number {
    return 138
  }

  isEnabled(index: number): boolean {
    return this._actor ? this._actor.isEquipChangeOk(index) : false
  }

  isCurrentItemEnabled(): boolean {
    return this.isEnabled(this.index())
  }

  setStatusWindow(statusWindow: Window_EquipStatus): void {
    this._statusWindow = statusWindow
    this.callUpdateHelp()
  }

  setItemWindow(itemWindow: Window_EquipItem): void {
    this._itemWindow = itemWindow
  }

  updateHelp(): void {
    super.updateHelp()
    this.setHelpWindowItem(this.item())
    if (this._statusWindow) {
      this._statusWindow.setTempActor(null)
    }
  }
}
