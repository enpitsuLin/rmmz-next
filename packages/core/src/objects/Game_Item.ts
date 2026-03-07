import type { MZ } from '@rmmz-lib/database-types'
import { DataManager } from '../managers/DataManager'
import { GlobalMananger } from '../managers'

/**
 * The game object class for handling skills, items, weapons, and armor.
 *
 * It is required because save data should not include the database object itself.
 */
export class Game_Item<Item extends Game_Item.ItemType = Game_Item.ItemType> {
  _dataClass: Item
  _itemId: number

  constructor(item?: MZ.GeneralItem) {
    this._dataClass = '' as Item
    this._itemId = 0
    if (item) {
      this.setObject(item)
    }
  }

  isSkill(): this is Game_Item<'skill'> {
    return this._dataClass === 'skill'
  }

  isItem(): this is Game_Item<'item'> {
    return this._dataClass === 'item'
  }

  isUsableItem(): this is Game_Item<'item' | 'skill'> {
    return this.isSkill() || this.isItem()
  }

  isWeapon(): this is Game_Item<'weapon'> {
    return this._dataClass === 'weapon'
  }

  isArmor(): this is Game_Item<'armor'> {
    return this._dataClass === 'armor'
  }

  isEquipItem(): this is Game_Item<'weapon' | 'armor'> {
    return this.isWeapon() || this.isArmor()
  }

  isNull(): this is Game_Item<''> {
    return this._dataClass === ''
  }

  itemId(): number {
    return this._itemId
  }

  object(): Item extends 'skill'
    ? MZ.Skill
    : Item extends 'item'
      ? MZ.Item
      : Item extends 'weapon'
        ? MZ.Weapon
        : Item extends 'armor'
          ? MZ.Armor
          : null
  object(): MZ.GeneralItem | null {
    if (this.isSkill()) {
      return GlobalMananger.$dataSkills[this._itemId]
    }
    else if (this.isItem()) {
      return GlobalMananger.$dataItems[this._itemId]
    }
    else if (this.isWeapon()) {
      return GlobalMananger.$dataWeapons[this._itemId]
    }
    else if (this.isArmor()) {
      return GlobalMananger.$dataArmors[this._itemId]
    }
    else {
      return null
    }
  }

  setObject(item: MZ.GeneralItem | null): void {
    if (DataManager.isSkill(item)) {
      this._dataClass = 'skill' as Item
    }
    else if (DataManager.isItem(item)) {
      this._dataClass = 'item' as Item
    }
    else if (DataManager.isWeapon(item)) {
      this._dataClass = 'weapon' as Item
    }
    else if (DataManager.isArmor(item)) {
      this._dataClass = 'armor' as Item
    }
    else {
      this._dataClass = '' as Item
    }
    this._itemId = item ? item.id : 0
  }

  setEquip(isWeapon: boolean, itemId: number): void {
    this._dataClass = (isWeapon ? 'weapon' : 'armor') as Item
    this._itemId = itemId
  }
}

export namespace Game_Item {
  export type ItemType = 'skill' | 'item' | 'weapon' | 'armor' | ''
}
