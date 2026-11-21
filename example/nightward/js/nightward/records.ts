import { StorageManager } from 'rmmz-next'
import type { FamilyKey, WeaponKey } from './content'

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
export const records: Records = { runs: 0, wins: 0, bestTime: 0, bestLevel: 1, bestKills: 0, bestGold: 0, fastestWin: null }
let loaded: Promise<void> | undefined
export function loadRecords(): Promise<void> {
  loaded ??= StorageManager.loadObject<Records>('nightward-records').then(value => { Object.assign(records, value) }).catch(() => {})
  return loaded
}
export async function saveResult(result: RunResult): Promise<void> {
  await loadRecords()
  records.runs++
  records.wins += Number(result.won)
  records.bestTime = Math.max(records.bestTime, result.time)
  records.bestLevel = Math.max(records.bestLevel, result.level)
  records.bestKills = Math.max(records.bestKills, result.kills)
  records.bestGold = Math.max(records.bestGold, result.gold)
  if (result.won) records.fastestWin = Math.min(records.fastestWin ?? Infinity, result.time)
  await StorageManager.saveObject('nightward-records', records)
}
