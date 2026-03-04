import { DataManager } from "../managers/DataManager";
import type { MZ } from '@rmmz-lib/database-types'

/**
 * The game object class for handling skills, items, weapons, and armor. 
 * 
 * It is required because save data should not include the database object itself.
 */
class Game_Item<Item extends MZ.GeneralItem = MZ.GeneralItem> {
  private _dataClass: "skill" | "item" | "weapon" | "armor" | "";
  private _itemId: number;

  constructor(item?: Item) {
    this._dataClass = "";
    this._itemId = 0;
    if (item) {
      this.setObject(item);
    }
  }

  isSkill(): this is Game_Item<MZ.Skill> {
    return this._dataClass === "skill";
  }

  isItem(): this is Game_Item<MZ.Item> {
    return this._dataClass === "item";
  }

  isUsableItem(): this is Game_Item<MZ.Item | MZ.Skill> {
    return this.isSkill() || this.isItem();
  }

  isWeapon(): this is Game_Item<MZ.Weapon> {
    return this._dataClass === "weapon";
  }

  isArmor(): this is Game_Item<MZ.Armor> {
    return this._dataClass === "armor";
  }

  isEquipItem(): this is Game_Item<MZ.Weapon | MZ.Armor> {
    return this.isWeapon() || this.isArmor();
  }

  isNull(): this is Game_Item<never> {
    return this._dataClass === "";
  }

  itemId() {
    return this._itemId;
  }

  object(): Item | null {
    if (this.isSkill()) {
      return $dataSkills[this._itemId] as Item;
    } else if (this.isItem()) {
      return $dataItems[this._itemId] as Item;
    } else if (this.isWeapon()) {
      return $dataWeapons[this._itemId] as Item;
    } else if (this.isArmor()) {
      return $dataArmors[this._itemId] as Item;
    } else {
      return null;
    }
  }

  setObject(item: MZ.GeneralItem) {
    if (DataManager.isSkill(item)) {
      this._dataClass = "skill";
    } else if (DataManager.isItem(item)) {
      this._dataClass = "item";
    } else if (DataManager.isWeapon(item)) {
      this._dataClass = "weapon";
    } else if (DataManager.isArmor(item)) {
      this._dataClass = "armor";
    } else {
      this._dataClass = "";
    }
    this._itemId = item ? item.id : 0;
  }

  setEquip(isWeapon: boolean, itemId: number) {
    this._dataClass = isWeapon ? "weapon" : "armor";
    this._itemId = itemId;
  }
}

export { Game_Item };
