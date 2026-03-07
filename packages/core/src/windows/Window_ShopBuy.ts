import type { MZ } from '@rmmz-lib/database-types'
import type { Rectangle } from '../core'
import type { Window_ShopStatus } from './Window_ShopStatus'
import { Window_Selectable } from './Window_Selectable'
import { GlobalMananger } from '../managers'

/**
 * Window_ShopBuy
 *
 * The window for selecting an item to buy on the shop screen.
 */
export class Window_ShopBuy extends Window_Selectable {
  _money: number
  _shopGoods: Window_ShopBuy.Good[] = []
  _data: MZ.EquipOrItem[] = []
  _price: number[] = []
  _statusWindow: Window_ShopStatus | null = null

  constructor(rect: Rectangle.Shape) {
    super(rect)
    this._money = 0
  }

  setupGoods(shopGoods: Window_ShopBuy.Good[]): void {
    this._shopGoods = shopGoods
    this.refresh()
    this.select(0)
  }

  maxItems(): number {
    return this._data ? this._data.length : 1
  }

  item(): MZ.EquipOrItem | null {
    return this.itemAt(this.index())
  }

  itemAt(index: number): MZ.EquipOrItem | null {
    return this._data && index >= 0 ? this._data[index] ?? null : null
  }

  setMoney(money: number): void {
    this._money = money
    this.refresh()
  }

  isCurrentItemEnabled(): boolean {
    return this.isEnabled(this._data[this.index()] ?? null)
  }

  price(item?: MZ.EquipOrItem | null): number {
    // @ts-expect-error to fix this
    return this._price[this._data.indexOf(item)] || 0
  }

  isEnabled(item: MZ.EquipOrItem | null): boolean {
    return !!(item && this.price(item) <= this._money && !GlobalMananger.$gameParty.hasMaxItems(item))
  }

  refresh(): void {
    this.makeItemList()
    super.refresh()
  }

  makeItemList(): void {
    this._data = []
    this._price = []
    for (const goods of this._shopGoods) {
      const item = this.goodsToItem(goods)
      if (item) {
        this._data.push(item)
        this._price.push(goods[2] === 0 ? item.price : goods[3]!)
      }
    }
  }

  goodsToItem(goods: Window_ShopBuy.Good): MZ.EquipOrItem | null {
    switch (goods[0]) {
      case 0:
        return GlobalMananger.$dataItems[goods[1]!] ?? null
      case 1:
        return GlobalMananger.$dataWeapons[goods[1]!] ?? null
      case 2:
        return GlobalMananger.$dataArmors[goods[1]!] ?? null
      default:
        return null
    }
  }

  drawItem(index: number): void {
    const item = this.itemAt(index)
    const price = item ? this.price(item) : 0
    const rect = this.itemLineRect(index)
    const priceWidth = this.priceWidth()
    const priceX = rect.x + rect.width - priceWidth
    const nameWidth = rect.width - priceWidth
    this.changePaintOpacity(this.isEnabled(item))
    this.drawItemName(item as MZ.Item | undefined, rect.x, rect.y, nameWidth)
    this.drawText(String(price), priceX, rect.y, priceWidth, 'right')
    this.changePaintOpacity(true)
  }

  priceWidth(): number {
    return 96
  }

  setStatusWindow(statusWindow: Window_ShopStatus): void {
    this._statusWindow = statusWindow
    this.callUpdateHelp()
  }

  updateHelp(): void {
    this.setHelpWindowItem(this.item() as MZ.GeneralItem | null)
    if (this._statusWindow) {
      this._statusWindow.setItem(this.item())
    }
  }
}

export namespace Window_ShopBuy {
  export type Good = [type: number, goodId: number, priceType: number, price: number]
}
