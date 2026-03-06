import type { MZ } from '@rmmz-lib/database-types'
import type { Rectangle } from '../core'
import { Window_ItemList } from './Window_ItemList'

/**
 * Window_BattleItem
 *
 * The window for selecting an item to use on the battle screen.
 */
export class Window_BattleItem extends Window_ItemList {
  constructor(rect: Rectangle.Shape) {
    super(rect)
    this.hide()
  }

  includes(item: MZ.GeneralItem | null): item is MZ.UsableItem {
    return $gameParty.canUse(item)
  }

  show(): void {
    this.selectLast()
    this.showHelpWindow()
    super.show()
  }

  hide(): void {
    this.hideHelpWindow()
    super.hide()
  }
}
