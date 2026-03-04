/*
 /* Window_ShopSell
 /*
 /* The window for selecting an item to sell on the shop screen.
 */
export class Window_ShopSell extends Window_ItemList {
  constructor(rect) {
    super(rect)
  }

  isEnabled(item) {
    return item && item.price > 0
  }
}
