import type { MZ } from 'rmmz-next/database-types'
import type { FamilyKey, PassiveKey, WeaponKey } from '../managers/NightwardDataManager'
import type { RunResult } from '../managers/NightwardRecordManager'
import { Game_Actor, Game_BattlerBase } from 'rmmz-next'
import { NightwardDataManager } from '../managers/NightwardDataManager'

export interface NightwardActorMethods {
  _activeNightwardWeapon?: MZ.Weapon
  activeNightwardWeapon: () => MZ.Weapon | undefined
  withNightwardWeapon: <T>(weapon: MZ.Weapon, fn: () => T) => T
  nightwardBuild: () => RunResult['build']
  nightwardRank: (key: FamilyKey) => number
  nightwardWeapon: (key: WeaponKey) => MZ.Weapon | undefined
  nightwardPassiveValue: (key: PassiveKey) => number
  nightwardCooldownScale: () => number
}

export type NightwardActor = Game_Actor & NightwardActorMethods

export function nightwardActor(actor: Game_Actor): NightwardActor {
  return actor as NightwardActor
}

export function installGameActorPatch(): void {
  const proto = Game_Actor.prototype as NightwardActor

  proto.activeNightwardWeapon = function (): MZ.Weapon | undefined {
    return this._activeNightwardWeapon
  }

  proto.withNightwardWeapon = function <T>(weapon: MZ.Weapon, fn: () => T): T {
    const previous = this._activeNightwardWeapon
    this._activeNightwardWeapon = weapon
    try {
      return fn()
    }
    finally {
      this._activeNightwardWeapon = previous
    }
  }

  proto.nightwardBuild = function (): RunResult['build'] {
    const build: RunResult['build'] = []
    for (const item of this.equips()) {
      const data = NightwardDataManager.equipData(item)
      if (data)
        build.push({ key: data.key, rank: data.rank })
    }
    return build
  }

  proto.nightwardRank = function (key: FamilyKey): number {
    for (const item of this.equips()) {
      const data = NightwardDataManager.equipData(item)
      if (data?.key === key)
        return data.rank
    }
    return 0
  }

  proto.nightwardWeapon = function (key: WeaponKey): MZ.Weapon | undefined {
    return this.weapons().find(weapon => NightwardDataManager.tryWeaponData(weapon)?.key === key)
  }

  proto.nightwardPassiveValue = function (key: PassiveKey): number {
    for (const armor of this.armors()) {
      const data = NightwardDataManager.tryPassiveData(armor)
      if (data?.key === key)
        return data.value ?? 0
    }
    return 0
  }

  proto.nightwardCooldownScale = function (): number {
    return 1 - this.nightwardPassiveValue('cinder')
  }

  const _paramPlus = Game_Actor.prototype.paramPlus
  Game_Actor.prototype.paramPlus = function (paramId): number {
    const weapon = (this as NightwardActor)._activeNightwardWeapon
    if (!weapon || paramId !== 2)
      return _paramPlus.call(this, paramId)
    let value = Game_BattlerBase.prototype.paramPlus.call(this, paramId) + weapon.params[paramId]!
    for (const armor of this.armors())
      value += armor.params[paramId]!
    return value
  }

  const _expForLevel = Game_Actor.prototype.expForLevel
  Game_Actor.prototype.expForLevel = function (level): number {
    const c = this.currentClass()
    if (NightwardDataManager.isNightwardClass(c) && c.expParams[2] === 0 && c.expParams[3] === 0)
      return Math.round((level - 1) * c.expParams[0]! + c.expParams[1]! * (level - 1) * (level - 2) / 2)
    return _expForLevel.call(this, level)
  }

  const _equipSlots = Game_Actor.prototype.equipSlots
  Game_Actor.prototype.equipSlots = function (): number[] {
    if (!NightwardDataManager.isNightwardClass(this.currentClass()))
      return _equipSlots.call(this)
    const { weaponSlots } = NightwardDataManager.config()
    return [...Array.from<number>({ length: weaponSlots }).fill(1), 2, 3, 4, 5]
  }
}
