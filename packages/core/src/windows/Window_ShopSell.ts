import type { MZ } from '@rmmz-lib/database-types'
import type { Rectangle } from '../core'
import { Window_ItemList } from './Window_ItemList'

/**
 * Window_ShopSell
 *
 * The window for selecting an item to sell on the shop screen.
 */
export class Window_ShopSell extends Window_ItemList {
  constructor(rect: Rectangle.Shape) {
    super(rect)
  }

  isEnabled(item: MZ.GeneralItem | null): boolean {
    return !!(item && (item as MZ.EquipOrItem).price > 0)
  }
}
