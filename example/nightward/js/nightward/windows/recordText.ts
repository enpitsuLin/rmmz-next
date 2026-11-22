import { records } from '../managers/NightwardRecordManager'
import { clock } from '../primitives/ui'

export const bestLine = (): string => `Best ${clock(records.bestTime)} · Lv ${records.bestLevel} · ${records.bestKills} kills`
