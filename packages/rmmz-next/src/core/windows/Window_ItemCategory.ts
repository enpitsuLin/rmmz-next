import type { Rectangle } from '../primitives/Rectangle'
import type { Window_ItemList } from './Window_ItemList'
import { GlobalMananger } from '../managers/GlobalManager'
import { TextManager } from '../managers/TextManager'
import { Window_HorzCommand } from './Window_HorzCommand'

/**
 * Window_ItemCategory
 *
 * The window for selecting a category of items on the item and shop screens.
 */
export class Window_ItemCategory extends Window_HorzCommand {
  _itemWindow: Window_ItemList | null = null

  constructor(rect: Rectangle.Shape) {
    super(rect)
  }

  maxCols(): number {
    return 4
  }

  update(): void {
    super.update()
    if (this._itemWindow) {
      this._itemWindow.setCategory(this.currentSymbol())
    }
  }

  makeCommandList(): void {
    if (this.needsCommand('item')) {
      this.addCommand(TextManager.item, 'item')
    }
    if (this.needsCommand('weapon')) {
      this.addCommand(TextManager.weapon, 'weapon')
    }
    if (this.needsCommand('armor')) {
      this.addCommand(TextManager.armor, 'armor')
    }
    if (this.needsCommand('keyItem')) {
      this.addCommand(TextManager.keyItem, 'keyItem')
    }
  }

  needsCommand(name: string): boolean {
    const table = ['item', 'weapon', 'armor', 'keyItem']
    const index = table.indexOf(name)
    if (index >= 0) {
      return GlobalMananger.$dataSystem.itemCategories[index]
    }
    return true
  }

  setItemWindow(itemWindow: Window_ItemList): void {
    this._itemWindow = itemWindow
  }

  needsSelection(): boolean {
    return this.maxItems() >= 2
  }
}
