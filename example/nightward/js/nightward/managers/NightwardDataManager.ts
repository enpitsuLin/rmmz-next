import type { MZ } from 'rmmz-next/database-types'
import type { Point } from '../primitives/geometry'
import { GlobalMananger as globals, PluginManager } from 'rmmz-next'

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
export type Weapon = MZ.Weapon & { data: WeaponData }
export type Passive = MZ.Armor & { data: PassiveData }
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
export interface HeroData { radius: number, speed: number, invulnerable: number, magnet: number }
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
  weapons: Map<WeaponKey, Weapon[]>
  passives: Map<PassiveKey, Passive[]>
  enemies: Map<EnemyKey, MZ.Enemy & { data: EnemyData }>
  items: Map<PickupKey, MZ.Item>
  itemKeyById: Map<number, PickupKey>
  hero: HeroData
  map: { center: number, bounds: number }
  spawns: { reaper: Point }
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

export function readPluginConfig(): PluginConfig {
  const params = PluginManager.parameters('Nightward') as Record<string, string>
  return {
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
}

export function metadata<T>(entry: { meta: MZ.Meta }): T {
  return JSON.parse(entry.meta.nightward as string) as T
}

function optionalMetadata<T>(entry: { meta?: MZ.Meta }): T | undefined {
  const raw = entry.meta?.nightward
  return typeof raw === 'string' ? JSON.parse(raw) as T : undefined
}

// Troop tuning lives in a battle event comment, which DataManager does not extract.
function formation<T>(troopId: number): T {
  const comment = globals.$dataTroops[troopId]!.pages[0]!.list[0]!.parameters[0] as string
  return JSON.parse(comment.match(/<nightward:([^>]+)>/)![1]!) as T
}

function readSpawnPoint(tag: string, center: number, fallback: Point): Point {
  for (const event of globals.$dataMap.events) {
    if (!event)
      continue
    const text = [
      event.note,
      ...event.pages.flatMap(page => page.list.filter(command => [108, 408].includes(command.code)).map(command => String(command.parameters[0]))),
    ].join('\n')
    const match = new RegExp(`<nightwardSpawn:${tag}>`, 'i').exec(text)
    if (!match)
      continue
    const offset = text.match(/<spawnOffset:([^>]+)>/i)?.[1]?.split(',').map(Number) ?? [0, 0]
    return {
      x: event.x - center + (Number.isFinite(offset[0]) ? offset[0]! : 0),
      z: event.y - center + (Number.isFinite(offset[1]) ? offset[1]! : 0),
    }
  }
  return fallback
}

interface StaticDatabase {
  source: typeof globals.$dataWeapons
  weapons: Content['weapons']
  passives: Content['passives']
  enemies: Content['enemies']
  items: Content['items']
  itemKeyById: Content['itemKeyById']
  formations: Formations
  hero: HeroData
  contactSkill: number
  waveSkill: number
}

let cached: StaticDatabase | undefined

function readStaticDatabase(): StaticDatabase {
  if (cached && cached.source === globals.$dataWeapons)
    return cached
  const weapons: Content['weapons'] = new Map()
  const passives: Content['passives'] = new Map()
  const enemies: Content['enemies'] = new Map()
  const items: Content['items'] = new Map()
  const itemKeyById: Content['itemKeyById'] = new Map()
  const enemySkills = new Map<string, number>()
  for (const key of weaponKeys) weapons.set(key, [])
  for (const key of passiveKeys) passives.set(key, [])
  for (const weapon of globals.$dataWeapons.slice(1)) {
    if (!weapon)
      continue
    const data = metadata<WeaponData>(weapon)
    // Keep database identity for Game_Item and the native equipment APIs.
    weapons.get(data.key)!.push(Object.assign(weapon, { data }))
  }
  for (const armor of globals.$dataArmors.slice(1)) {
    if (!armor)
      continue
    const data = metadata<PassiveData>(armor)
    passives.get(data.key)!.push(Object.assign(armor, { data }))
  }
  for (const skill of globals.$dataSkills.slice(1)) {
    if (!skill)
      continue
    const data = metadata<{ category: string, key: string }>(skill)
    if (data.category === 'enemyAttack')
      enemySkills.set(data.key, skill.id)
  }
  for (const enemy of globals.$dataEnemies.slice(1)) {
    if (enemy)
      enemies.set(metadata<EnemyData>(enemy).key, { ...enemy, data: metadata<EnemyData>(enemy) })
  }
  for (const item of globals.$dataItems.slice(1)) {
    if (!item)
      continue
    const key = metadata<{ key: PickupKey }>(item).key
    items.set(key, item)
    itemKeyById.set(item.id, key)
  }
  const db: StaticDatabase = {
    source: globals.$dataWeapons,
    weapons,
    passives,
    enemies,
    items,
    itemKeyById,
    formations: {
      swarm: formation(1),
      ring: formation(2),
      elite: formation(3),
      reaper: formation(4),
    },
    hero: metadata(globals.$dataActors[1]!),
    contactSkill: enemySkills.get('contact')!,
    waveSkill: enemySkills.get('reaperWave')!,
  }
  cached = db
  return db
}

export function readContent(): Content {
  const db = readStaticDatabase()
  const mapMeta = optionalMetadata<{ center?: number, bounds?: number }>(globals.$dataMap)
  const center = mapMeta?.center ?? Math.floor(globals.$dataMap.width / 2)
  const bounds = mapMeta?.bounds ?? Math.floor(Math.min(globals.$dataMap.width, globals.$dataMap.height) / 2)
  return {
    config: readPluginConfig(),
    weapons: db.weapons,
    passives: db.passives,
    enemies: db.enemies,
    items: db.items,
    itemKeyById: db.itemKeyById,
    formations: db.formations,
    hero: db.hero,
    map: { center, bounds },
    spawns: {
      reaper: readSpawnPoint('reaper', center, { x: 0, z: -12.5 }),
    },
    contactSkill: db.contactSkill,
    waveSkill: db.waveSkill,
  }
}
