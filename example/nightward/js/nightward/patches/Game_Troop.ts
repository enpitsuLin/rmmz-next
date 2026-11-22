import type { Game_Enemy } from 'rmmz-next'
import { Game_Troop } from 'rmmz-next'

export interface NightwardTroopMethods {
  addNightwardEnemy: (enemy: Game_Enemy) => void
  removeNightwardEnemies: (dead: ReadonlySet<Game_Enemy>) => void
}

export type NightwardTroop = Game_Troop & NightwardTroopMethods

export function nightwardTroop(troop: Game_Troop): NightwardTroop {
  return troop as NightwardTroop
}

export function installGameTroopPatch(): void {
  const proto = Game_Troop.prototype as NightwardTroop

  proto.addNightwardEnemy = function (enemy: Game_Enemy): void {
    this._enemies.push(enemy)
  }

  proto.removeNightwardEnemies = function (dead: ReadonlySet<Game_Enemy>): void {
    this._enemies = this._enemies.filter(enemy => !dead.has(enemy))
  }
}
