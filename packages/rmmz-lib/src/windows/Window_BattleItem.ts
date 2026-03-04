import { Window_ItemList } from './Window_ItemList'

/**
 * Window_BattleItem
 *
 * The window for selecting an item to use on the battle screen.
 */
export class Window_BattleItem extends Window_ItemList {
  constructor(rect) {
    super(rect)
    this.hide()
  }

  includes(item) {
    return $gameParty.canUse(item)
  }

  show() {
    this.selectLast()
    this.showHelpWindow()
    super.show()
  }

  hide() {
    this.hideHelpWindow()
    super.hide()
  }
}
