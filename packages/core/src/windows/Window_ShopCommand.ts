import type { Rectangle } from '../core'
import { TextManager } from '../managers/TextManager'
import { Window_HorzCommand } from './Window_HorzCommand'

/**
 * Window_ShopCommand
 *
 * The window for selecting buy/sell on the shop screen.
 */
export class Window_ShopCommand extends Window_HorzCommand {
  _purchaseOnly: boolean = false

  constructor(rect: Rectangle.Shape) {
    super(rect)
  }

  setPurchaseOnly(purchaseOnly: boolean): void {
    this._purchaseOnly = purchaseOnly
    this.refresh()
  }

  maxCols(): number {
    return 3
  }

  makeCommandList(): void {
    this.addCommand(TextManager.buy, 'buy')
    this.addCommand(TextManager.sell, 'sell', !this._purchaseOnly)
    this.addCommand(TextManager.cancel, 'cancel')
  }
}
