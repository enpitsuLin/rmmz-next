import type { MZ } from '../../database-types'
import type { Game_Actor } from '../objects'
import type { Rectangle } from '../primitives'
import type { Window_EquipStatus } from './Window_EquipStatus'
import { JsonEx } from '../primitives'
import { Window_ItemList } from './Window_ItemList'

/**
 * Window_EquipItem
 *
 * The window for selecting an equipment item on the equipment screen.
 */
export class Window_EquipItem extends Window_ItemList<MZ.Equip> {
  _actor: Game_Actor | null
  _slotId: number
  _statusWindow: Window_EquipStatus | null = null

  constructor(rect: Rectangle.Shape) {
    super(rect)
    this._actor = null
    this._slotId = 0
  }

  maxCols(): number {
    return 1
  }

  colSpacing(): number {
    return 8
  }

  setActor(actor: Game_Actor | null): void {
    if (this._actor !== actor) {
      this._actor = actor
      this.refresh()
      this.scrollTo(0, 0)
    }
  }

  setSlotId(slotId: number): void {
    if (this._slotId !== slotId) {
      this._slotId = slotId
      this.refresh()
      this.scrollTo(0, 0)
    }
  }

  includes(item: MZ.GeneralItem | null): item is MZ.Equip {
    if (item === null) {
      return true
    }
    return (
      !!this._actor && this._actor.canEquip(item) && item.etypeId === this.etypeId()
    )
  }

  etypeId(): number {
    if (this._actor && this._slotId >= 0) {
      return this._actor.equipSlots()[this._slotId] ?? 0
    }
    else {
      return 0
    }
  }

  isEnabled(_item: MZ.GeneralItem | null): boolean {
    return true
  }

  selectLast(): void {
    // empty method body
  }

  setStatusWindow(statusWindow: Window_EquipStatus): void {
    this._statusWindow = statusWindow
    this.callUpdateHelp()
  }

  updateHelp(): void {
    super.updateHelp()
    if (this._actor && this._statusWindow && this._slotId >= 0) {
      const actor = JsonEx.makeDeepCopy(this._actor)
      actor.forceChangeEquip(this._slotId, this.item())
      this._statusWindow.setTempActor(actor)
    }
  }

  playOkSound(): void {
    // empty method body
  }
}
