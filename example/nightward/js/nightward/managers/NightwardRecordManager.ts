import type { FamilyKey, WeaponKey } from './NightwardDataManager'
import { StorageManager } from 'rmmz-next'
import { clock } from '../primitives/ui'

export interface RunResult {
  won: boolean
  time: number
  level: number
  kills: number
  gold: number
  build: { key: FamilyKey, rank: number }[]
  damage: Record<WeaponKey, number>
}

export interface Records {
  runs: number
  wins: number
  bestTime: number
  bestLevel: number
  bestKills: number
  bestGold: number
  fastestWin: number | null
}

/**
 * The static class that loads and persists cross-run Nightward records via StorageManager.
 */
export class NightwardRecordManager {
  static _records: Records = { runs: 0, wins: 0, bestTime: 0, bestLevel: 1, bestKills: 0, bestGold: 0, fastestWin: null }
  static _loading: Promise<void> | null = null
  static _loaded = false

  constructor() {
    throw new Error('This is a static class')
  }

  static records(): Records {
    return this._records
  }

  static isLoaded(): boolean {
    return this._loaded
  }

  static load(): Promise<void> {
    this._loading ??= StorageManager.loadObject<Records>('nightward-records')
      .then((value) => {
        Object.assign(this._records, value)
      })
      .catch(() => {})
      .then(() => {
        this._loaded = true
      })
    return this._loading
  }

  static async saveResult(result: RunResult): Promise<void> {
    await this.load()
    const rec = this._records
    rec.runs++
    rec.wins += Number(result.won)
    rec.bestTime = Math.max(rec.bestTime, result.time)
    rec.bestLevel = Math.max(rec.bestLevel, result.level)
    rec.bestKills = Math.max(rec.bestKills, result.kills)
    rec.bestGold = Math.max(rec.bestGold, result.gold)
    if (result.won)
      rec.fastestWin = Math.min(rec.fastestWin ?? Infinity, result.time)
    await StorageManager.saveObject('nightward-records', rec)
  }

  static bestLine(): string {
    const rec = this._records
    return `Best ${clock(rec.bestTime)} · Lv ${rec.bestLevel} · ${rec.bestKills} kills`
  }
}
