import type { MZ } from '@rmmz-lib/database-types'
import type { Rectangle } from '../core'
import { DataManager, GlobalMananger } from '../managers'
import { Window_Selectable } from './Window_Selectable'

/**
 * Window_ItemList
 *
 * The window for selecting an item on the item screen.
 */
export class Window_ItemList<Item extends MZ.EquipOrItem = MZ.EquipOrItem>
  extends Window_Selectable {
  _category: string
  _data: (Item | null)[]

  constructor(rect: Rectangle.Shape) {
    super(rect)
    this._category = 'none'
    this._data = []
  }

  setCategory(category: string | null): void {
    if (this._category !== category) {
      this._category = category ?? 'none'
      this.refresh()
      this.scrollTo(0, 0)
    }
  }

  maxCols(): number {
    return 2
  }

  colSpacing(): number {
    return 16
  }

  maxItems(): number {
    return this._data ? this._data.length : 1
  }

  item(): Item | null {
    return this.itemAt(this.index()) as Item | null
  }

  itemAt(index: number): MZ.EquipOrItem | null {
    return this._data && index >= 0 ? this._data[index] ?? null : null
  }

  isCurrentItemEnabled(): boolean {
    return this.isEnabled(this.item())
  }

  includes(item: MZ.GeneralItem | null): boolean {
    switch (this._category) {
      case 'item':
        return DataManager.isItem(item) && item.itypeId === 1
      case 'weapon':
        return DataManager.isWeapon(item)
      case 'armor':
        return DataManager.isArmor(item)
      case 'keyItem':
        return DataManager.isItem(item) && item.itypeId === 2
      default:
        return false
    }
  }

  needsNumber(): boolean {
    if (this._category === 'keyItem') {
      return GlobalMananger.$dataSystem.optKeyItemsNumber
    }
    else {
      return true
    }
  }

  isEnabled(item?: MZ.GeneralItem | null): boolean {
    return GlobalMananger.$gameParty.canUse(item)
  }

  makeItemList(): void {
    this._data = GlobalMananger.$gameParty.allItems().filter((item): item is Item => this.includes(item))
    if (this.includes(null)) {
      this._data.push(null)
    }
  }

  selectLast(): void {
    const index = this._data.indexOf(GlobalMananger.$gameParty.lastItem() as Item)
    this.forceSelect(index >= 0 ? index : 0)
  }

  drawItem(index: number): void {
    const item = this.itemAt(index)
    if (item) {
      const numberWidth = this.numberWidth()
      const rect = this.itemLineRect(index)
      this.changePaintOpacity(this.isEnabled(item))
      this.drawItemName(item as MZ.Item, rect.x, rect.y, rect.width - numberWidth)
      this.drawItemNumber(item, rect.x, rect.y, rect.width)
      this.changePaintOpacity(true)
    }
  }

  numberWidth(): number {
    return this.textWidth('000')
  }

  drawItemNumber(item: MZ.GeneralItem, x: number, y: number, width: number): void {
    if (this.needsNumber()) {
      this.drawText(':', x, y, width - this.textWidth('00'), 'right')
      this.drawText(String(GlobalMananger.$gameParty.numItems(item as MZ.EquipOrItem)), x, y, width, 'right')
    }
  }

  updateHelp(): void {
    this.setHelpWindowItem(this.item())
  }

  refresh(): void {
    this.makeItemList()
    super.refresh()
  }
}
