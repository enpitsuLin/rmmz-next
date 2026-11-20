import type { Rectangle } from '../primitives'
import { GlobalMananger } from '../managers/GlobalManager'
import { TextManager } from '../managers/TextManager'
import { Window_Selectable } from './Window_Selectable'

/**
 * Window_Gold
 *
 * The window for displaying the party's gold.
 */
export class Window_Gold extends Window_Selectable {
  constructor(rect: Rectangle.Shape) {
    super(rect)
    this.refresh()
  }

  colSpacing(): number {
    return 0
  }

  refresh(): void {
    const rect = this.itemLineRect(0)
    const x = rect.x
    const y = rect.y
    const width = rect.width
    this.contents.clear()
    this.drawCurrencyValue(String(this.value()), this.currencyUnit(), x, y, width)
  }

  value(): number {
    return GlobalMananger.$gameParty.gold()
  }

  currencyUnit(): string {
    return TextManager.currencyUnit
  }

  open(): void {
    this.refresh()
    super.open()
  }
}
