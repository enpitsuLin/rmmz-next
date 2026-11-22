import type { MZ } from 'rmmz-next/database-types'
import type { Point } from '../primitives/geometry'
import { GlobalMananger as globals, PluginManager } from 'rmmz-next'
import { commentMeta, readMetaJson, readMetaString, requireMetaJson } from '../primitives/metadata'

export const weaponKeys = ['lash', 'wand', 'tomes', 'storm', 'ward', 'flask'] as const
export const passiveKeys = ['might', 'haste', 'lodestone', 'cinder'] as const
export type WeaponKey = typeof weaponKeys[number]
export type PassiveKey = typeof passiveKeys[number]
export type FamilyKey = WeaponKey | PassiveKey
export type EnemyKey = 'bat' | 'skeleton' | 'ghoul' | 'wraith' | 'skull' | 'reaper'
export type PickupKey = 'gemSmall' | 'gemMedium' | 'gemBig' | 'coin' | 'chicken' | 'vacuum' | 'relic' | 'chest'
export type Layer = 'ground' | 'air' | 'ghost'

export interface WeaponData {
  key: WeaponKey
  rank: number
  knockback: number
  cooldown?: number
  count?: number
  radius?: number
  reach?: number
  halfHeight?: number
  pierce?: number
  speed?: number
  life?: number
  range?: number
  duration?: number
  rest?: number
  spin?: number
  rehit?: number
  tick?: number
  flight?: number
  initialDelay: number
  stagger?: number
  backDelay?: number
  turnRate?: number
  height?: number
  radiusHit?: number
  fadeIn?: number
  fadeOut?: number
  pulseFade?: number
  gravity?: number
  throwHeight?: number
}

export interface PassiveData {
  key: PassiveKey
  rank: number
  value?: number
}

export interface EnemyData {
  key: EnemyKey
  speed: number
  radius: number
  height: number
  hover: number
  bob: number
  knockback: number
  mass: number
  layer: Layer
}

export interface HeroData {
  radius: number
  speed: number
  invulnerable: number
  magnet: number
}

export interface Formations {
  swarm: { first: number, every: number, baseCount: number, growth: number, maxCount: number, timeline: number[], weights: number[][] }
  ring: { first: number, every: number, baseCount: number, growth: number, maxCount: number, afterReaper: number }
  elite: { first: number, every: number, transitions: number[] }
  reaper: { first: number, rise: number, firstSwing: number, swingEvery: number, windup: number, recover: number, range: number, waveSpeed: number, waveLife: number, waveRadius: number }
}

export interface PluginConfig {
  weaponSlots: number
  upgradeChoices: number
  maxLevelGold: number
  chestGold: number
  icons: { kills: number, heart: number, clock: number }
  enemyCap: number
  eliteHpRate: number
  eliteAtkRate: number
  eliteScale: number
  brazierDrops: { relicChance: number, relicTime: number, vacuumChance: number, chickenChance: number }
  sounds: { lash: string, wand: string, tomes: string, lightning: string, ward: string, flask: string, relic: string, level: string }
}

export interface Content {
  config: PluginConfig
  formations: Formations
  weapons: Map<WeaponKey, MZ.Weapon[]>
  passives: Map<PassiveKey, MZ.Armor[]>
  enemies: Map<EnemyKey, MZ.Enemy>
  items: Map<PickupKey, MZ.Item>
  itemKeyById: Map<number, PickupKey>
  hero: HeroData
  map: { center: number, bounds: number }
  spawns: { reaper: Point }
  contactSkill: number
  waveSkill: number
}

interface StaticDatabase {
  source: typeof globals.$dataWeapons
  weapons: Map<WeaponKey, MZ.Weapon[]>
  passives: Map<PassiveKey, MZ.Armor[]>
  enemies: Map<EnemyKey, MZ.Enemy>
  items: Map<PickupKey, MZ.Item>
  itemKeyById: Map<number, PickupKey>
  weaponMetaById: Map<number, WeaponData>
  passiveMetaById: Map<number, PassiveData>
  enemyMetaById: Map<number, EnemyData>
  formations: Formations
  hero: HeroData
  contactSkill: number
  waveSkill: number
}

function numberParam(params: Record<string, string>, key: string, fallback: number): number {
  const raw = params[key]
  if (raw === undefined || raw === '')
    return fallback
  const value = Number(raw)
  return Number.isFinite(value) ? value : fallback
}

function stringParam(params: Record<string, string>, key: string, fallback: string): string {
  const raw = params[key]
  return raw !== undefined && raw !== '' ? raw : fallback
}

/**
 * The static class that parses and indexes Nightward metadata from RMMZ database files
 * and plugin parameters without mutating native `$data*` records.
 */
export class NightwardDataManager {
  static _cached: StaticDatabase | null = null
  static _config: PluginConfig | null = null

  constructor() {
    throw new Error('This is a static class')
  }

  static onDatabaseLoad(): void {
    this._cached = null
  }

  static config(): PluginConfig {
    if (this._config)
      return this._config
    const params = PluginManager.parameters('Nightward') as Record<string, string>
    this._config = {
      weaponSlots: Math.max(1, Math.floor(numberParam(params, 'weaponSlots', 6))),
      upgradeChoices: Math.max(1, Math.floor(numberParam(params, 'upgradeChoices', 3))),
      maxLevelGold: Math.max(0, Math.floor(numberParam(params, 'maxLevelGold', 25))),
      chestGold: Math.max(0, Math.floor(numberParam(params, 'chestGold', 100))),
      icons: {
        kills: Math.floor(numberParam(params, 'killsIcon', 114)),
        heart: Math.floor(numberParam(params, 'heartIcon', 115)),
        clock: Math.floor(numberParam(params, 'clockIcon', 116)),
      },
      enemyCap: Math.max(1, Math.floor(numberParam(params, 'enemyCap', 900))),
      eliteHpRate: Math.max(1, numberParam(params, 'eliteHpRate', 4)),
      eliteAtkRate: Math.max(1, numberParam(params, 'eliteAtkRate', 2)),
      eliteScale: Math.max(1, numberParam(params, 'eliteScale', 1.6)),
      brazierDrops: {
        relicChance: numberParam(params, 'brazierRelicChance', 0.04),
        relicTime: numberParam(params, 'brazierRelicTime', 60),
        vacuumChance: numberParam(params, 'brazierVacuumChance', 0.1),
        chickenChance: numberParam(params, 'brazierChickenChance', 0.26),
      },
      sounds: {
        lash: stringParam(params, 'lashSe', 'Lash'),
        wand: stringParam(params, 'wandSe', 'Wand'),
        tomes: stringParam(params, 'tomesSe', 'Tomes'),
        lightning: stringParam(params, 'lightningSe', 'Lightning'),
        ward: stringParam(params, 'wardSe', 'Ward'),
        flask: stringParam(params, 'flaskSe', 'Flask'),
        relic: stringParam(params, 'relicSe', 'Relic'),
        level: stringParam(params, 'levelSe', 'Level'),
      },
    }
    return this._config
  }

  static isNightwardClass(entry: MZ.Class): boolean {
    return readMetaJson<{ key?: string }>(entry)?.key === 'nightward'
  }

  static weaponData(weapon: MZ.Weapon): WeaponData {
    return this.database().weaponMetaById.get(weapon.id)!
  }

  static tryWeaponData(weapon: MZ.Weapon | null | undefined): WeaponData | undefined {
    return weapon ? this.database().weaponMetaById.get(weapon.id) : undefined
  }

  static passiveData(armor: MZ.Armor): PassiveData {
    return this.database().passiveMetaById.get(armor.id)!
  }

  static tryPassiveData(armor: MZ.Armor | null | undefined): PassiveData | undefined {
    return armor ? this.database().passiveMetaById.get(armor.id) : undefined
  }

  static equipData(item: MZ.Weapon | MZ.Armor | null | undefined): WeaponData | PassiveData | undefined {
    if (!item)
      return undefined
    if ('wtypeId' in item)
      return this.tryWeaponData(item)
    return this.tryPassiveData(item)
  }

  static enemyData(enemy: MZ.Enemy | EnemyKey): EnemyData {
    const db = this.database()
    if (typeof enemy === 'string') {
      const record = db.enemies.get(enemy)!
      return db.enemyMetaById.get(record.id)!
    }
    return db.enemyMetaById.get(enemy.id)!
  }

  static content(): Content {
    const db = this.database()
    const mapMeta = readMetaJson<{ center?: number, bounds?: number }>(globals.$dataMap)
    const center = mapMeta?.center ?? Math.floor(globals.$dataMap.width / 2)
    const bounds = mapMeta?.bounds ?? Math.floor(Math.min(globals.$dataMap.width, globals.$dataMap.height) / 2)
    return {
      config: this.config(),
      weapons: db.weapons,
      passives: db.passives,
      enemies: db.enemies,
      items: db.items,
      itemKeyById: db.itemKeyById,
      formations: db.formations,
      hero: db.hero,
      map: { center, bounds },
      spawns: {
        reaper: this.readSpawnPoint('reaper', center, { x: 0, z: -12.5 }),
      },
      contactSkill: db.contactSkill,
      waveSkill: db.waveSkill,
    }
  }

  private static database(): StaticDatabase {
    if (this._cached && this._cached.source === globals.$dataWeapons)
      return this._cached
    const weapons = new Map<WeaponKey, MZ.Weapon[]>()
    const passives = new Map<PassiveKey, MZ.Armor[]>()
    const enemies = new Map<EnemyKey, MZ.Enemy>()
    const items = new Map<PickupKey, MZ.Item>()
    const itemKeyById = new Map<number, PickupKey>()
    const weaponMetaById = new Map<number, WeaponData>()
    const passiveMetaById = new Map<number, PassiveData>()
    const enemyMetaById = new Map<number, EnemyData>()
    const enemySkills = new Map<string, number>()

    for (const key of weaponKeys) weapons.set(key, [])
    for (const key of passiveKeys) passives.set(key, [])

    for (const weapon of globals.$dataWeapons.slice(1)) {
      const data = readMetaJson<WeaponData>(weapon)
      if (!weapon || !data)
        continue
      weaponMetaById.set(weapon.id, data)
      weapons.get(data.key)?.push(weapon)
    }
    for (const armor of globals.$dataArmors.slice(1)) {
      const data = readMetaJson<PassiveData>(armor)
      if (!armor || !data)
        continue
      passiveMetaById.set(armor.id, data)
      passives.get(data.key)?.push(armor)
    }
    for (const skill of globals.$dataSkills.slice(1)) {
      const data = readMetaJson<{ key?: string }>(skill)
      if (skill && data?.key)
        enemySkills.set(data.key, skill.id)
    }
    for (const enemy of globals.$dataEnemies.slice(1)) {
      const data = readMetaJson<EnemyData>(enemy)
      if (!enemy || !data)
        continue
      enemyMetaById.set(enemy.id, data)
      enemies.set(data.key, enemy)
    }
    for (const item of globals.$dataItems.slice(1)) {
      const data = readMetaJson<{ key: PickupKey }>(item)
      if (!item || !data)
        continue
      items.set(data.key, item)
      itemKeyById.set(item.id, data.key)
    }
    this._cached = {
      source: globals.$dataWeapons,
      weapons,
      passives,
      enemies,
      items,
      itemKeyById,
      weaponMetaById,
      passiveMetaById,
      enemyMetaById,
      formations: this.readFormations(),
      hero: requireMetaJson<HeroData>(globals.$dataActors[1]),
      contactSkill: enemySkills.get('contact')!,
      waveSkill: enemySkills.get('reaperWave')!,
    }
    return this._cached
  }

  private static readFormations(): Formations {
    const map = new Map<string, unknown>()
    for (const troop of globals.$dataTroops.slice(1)) {
      const data = readMetaJson<{ key?: string }>(commentMeta(troop?.pages[0]?.list))
      if (data?.key)
        map.set(data.key, data)
    }
    return {
      swarm: map.get('swarm') as Formations['swarm'],
      ring: map.get('ring') as Formations['ring'],
      elite: map.get('elite') as Formations['elite'],
      reaper: map.get('reaper') as Formations['reaper'],
    }
  }

  private static readSpawnPoint(tag: string, center: number, fallback: Point): Point {
    const target = tag.toLowerCase()
    for (const event of globals.$dataMap.events) {
      if (!event)
        continue
      const carriers = [event, ...event.pages.map(page => commentMeta(page.list))]
      const matched = carriers.some(carrier => readMetaString(carrier, 'nightwardSpawn')?.toLowerCase() === target)
      if (!matched)
        continue
      const rawOffset = carriers.map(carrier => readMetaString(carrier, 'spawnOffset')).find(Boolean)
      const offset = rawOffset?.split(',').map(Number) ?? [0, 0]
      return {
        x: event.x - center + (Number.isFinite(offset[0]) ? offset[0]! : 0),
        z: event.y - center + (Number.isFinite(offset[1]) ? offset[1]! : 0),
      }
    }
    return fallback
  }
}
