import type { MZ } from '../../database-types'
import type { Game_Actor } from '../objects/Game_Actor'
import type { Rectangle } from '../primitives'
import { ColorManager } from '../managers/ColorManager'
import { Window_StatusBase } from './Window_StatusBase'

/**
 * Window_StatusEquip
 *
 * The window for displaying equipment items on the status screen.
 */
export class Window_StatusEquip extends Window_StatusBase {
  _actor: Game_Actor | null

  constructor(rect: Rectangle.Shape) {
    super(rect)
    this._actor = null
  }

  setActor(actor: Game_Actor): void {
    if (this._actor !== actor) {
      this._actor = actor
      this.refresh()
    }
  }

  maxItems(): number {
    return this._actor ? this._actor.equipSlots().length : 0
  }

  itemHeight(): number {
    return this.lineHeight()
  }

  drawItem(index: number): void {
    const rect = this.itemLineRect(index)
    const equips = this._actor!.equips()
    const item = equips[index]
    const slotName = this.actorSlotName(this._actor!, index)
    const sw = 138
    this.changeTextColor(ColorManager.systemColor())
    this.drawText(slotName, rect.x, rect.y, sw)
    this.drawItemName(item as unknown as MZ.Item | undefined, rect.x + sw, rect.y, rect.width - sw)
  }

  drawItemBackground(_index: number): void {
    // empty method body
  }
}
