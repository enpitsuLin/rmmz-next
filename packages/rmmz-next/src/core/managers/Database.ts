import type { MZ } from '../../database-types'
import { Utils } from '../primitives/Utils'
import { GlobalMananger } from './GlobalManager'

/**
 * Database
 *
 * Read-only questions about the loaded database and the launch options.
 *
 * Kept dependency-free on purpose: the only things it touches are the global
 * state holder and the launch options. Game objects, sprites and windows can
 * therefore classify items or ask about the battle system without pulling in a
 * heavier manager, which is what used to tie `objects`, `windows` and
 * `managers` into one import cycle.
 */
export class Database {
  constructor() {
    throw new Error('This is a static class')
  }

  static isSkill(item?: MZ.GeneralItem | null): item is MZ.Skill {
    return !!item && GlobalMananger.$dataSkills.includes(item as MZ.Skill)
  }

  static isItem(item?: MZ.GeneralItem | null): item is MZ.Item {
    return !!item && GlobalMananger.$dataItems.includes(item as MZ.Item)
  }

  static isWeapon(item?: MZ.GeneralItem | null): item is MZ.Weapon {
    return !!item && GlobalMananger.$dataWeapons.includes(item as MZ.Weapon)
  }

  static isArmor(item?: MZ.GeneralItem | null): item is MZ.Armor {
    return !!item && GlobalMananger.$dataArmors.includes(item as MZ.Armor)
  }

  /**
   * Whether the project uses the time progress battle system at all.
   */
  static isTpb(): boolean {
    return GlobalMananger.$dataSystem.battleSystem >= 1
  }

  /**
   * Whether the project uses the active (non-wait) time progress battle system.
   */
  static isActiveTpb(): boolean {
    return GlobalMananger.$dataSystem.battleSystem === 1
  }

  static isBattleTest(): boolean {
    return Utils.isOptionValid('btest')
  }

  static isEventTest(): boolean {
    return Utils.isOptionValid('etest')
  }

  static isTitleSkip(): boolean {
    return Utils.isOptionValid('tskip')
  }
}

export namespace Database {
  /**
   * A database table as loaded from `data/*.json`: index 0 is always empty so
   * ids can be used directly as indexes.
   */
  export type DatabaseFile<T> = [null, ...T[]]
}
