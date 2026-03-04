import { TextManager } from "../managers/TextManager"
import { Window_HorzCommand } from "./Window_HorzCommand"

/**
 * Window_ShopCommand
 *
 * The window for selecting buy/sell on the shop screen.
 */
export class Window_ShopCommand extends Window_HorzCommand {
  constructor(rect) {
    super(rect)
  }

  setPurchaseOnly(purchaseOnly) {
    this._purchaseOnly = purchaseOnly
    this.refresh()
  }

  maxCols() {
    return 3
  }

  makeCommandList() {
    this.addCommand(TextManager.buy, 'buy')
    this.addCommand(TextManager.sell, 'sell', !this._purchaseOnly)
    this.addCommand(TextManager.cancel, 'cancel')
  }
}
