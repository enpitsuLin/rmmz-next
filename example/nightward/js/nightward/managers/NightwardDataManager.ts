import type { MZ } from 'rmmz-next/database-types'
import { GlobalMananger as globals } from 'rmmz-next'

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
  value: number
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
  damage: number
  knockback: number
  mass: number
  animRate: number
  layer: Layer
  midChance: number
}
export interface HeroData { radius: number, speed: number, invulnerable: number, magnet: number }
export interface Formations {
  swarm: { first: number, every: number, baseCount: number, growth: number, maxCount: number, timeline: number[], weights: number[][] }
  ring: { first: number, every: number, baseCount: number, growth: number, maxCount: number, afterReaper: number }
  elite: { first: number, every: number, transitions: number[] }
  reaper: { first: number, rise: number, firstSwing: number, swingEvery: number, windup: number, recover: number, range: number, waveSpeed: number, waveLife: number, waveRadius: number }
}
export interface Content {
  formations: Formations
  weapons: Map<WeaponKey, Weapon[]>
  passives: Map<PassiveKey, Passive[]>
  enemies: Map<EnemyKey, MZ.Enemy & { data: EnemyData }>
  items: Map<PickupKey, MZ.Item>
  hero: HeroData
  map: { center: number, bounds: number }
  contactSkill: number
  waveSkill: number
}
export function metadata<T>(entry: { note: string }): T {
  return JSON.parse(entry.note.match(/<nightward:([^>]+)>/)![1]!) as T
}
export function readContent(): Content {
  const weapons: Content['weapons'] = new Map()
  const passives: Content['passives'] = new Map()
  const enemies: Content['enemies'] = new Map()
  const items: Content['items'] = new Map()
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
    if (item)
      items.set(metadata<{ key: PickupKey }>(item).key, item)
  }
  return {
    weapons,
    passives,
    enemies,
    items,
    formations: {
      swarm: metadata({ note: globals.$dataTroops[1]!.pages[0]!.list[0]!.parameters[0] as string }),
      ring: metadata({ note: globals.$dataTroops[2]!.pages[0]!.list[0]!.parameters[0] as string }),
      elite: metadata({ note: globals.$dataTroops[3]!.pages[0]!.list[0]!.parameters[0] as string }),
      reaper: metadata({ note: globals.$dataTroops[4]!.pages[0]!.list[0]!.parameters[0] as string }),
    },
    hero: metadata(globals.$dataActors[1]!),
    map: metadata(globals.$dataMap),
    contactSkill: enemySkills.get('contact')!,
    waveSkill: enemySkills.get('reaperWave')!,
  }
}
