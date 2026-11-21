import { Game_Action } from 'rmmz-next'
import type { RunSession } from './session'
import type { FamilyKey, Passive, PickupKey, Point, Weapon } from './content'
import { direction, distance, passiveKeys, weaponKeys } from './content'
import { killEnemy } from './combat'

export interface Pickup extends Point {
  id: number
  key: PickupKey
  age: number
  y: number
  vy: number
  vx: number
  vz: number
  attracted: boolean
  vacuum: boolean
  speed: number
}
export interface Reward { key: FamilyKey, rank: number, name: string, description: string, icon: number, weapon: boolean }
export function allRewards(run: RunSession, ownedOnly = false): Reward[] {
  return [...weaponKeys, ...passiveKeys].flatMap(key => {
    const rank = run.rank(key)
    if (rank === 5 || (ownedOnly && rank === 0)) return []
    const weapon = run.content.weapons.get(key as typeof weaponKeys[number])
    const entry = weapon ? weapon[rank]! : run.content.passives.get(key as typeof passiveKeys[number])![rank]!
    return [{ key, rank: rank + 1, name: entry.card.name, description: entry.card.description, icon: entry.iconIndex, weapon: !!weapon }]
  })
}
export function chooseRewards(run: RunSession): Reward[] {
  const pool = allRewards(run), choices: Reward[] = []
  for (let i = 0; i < 3 && pool.length; i++) {
    const weights = pool.map(reward => reward.rank > 1 ? 3 : reward.weapon ? 2 : 1.4)
    let roll = Math.random() * weights.reduce((a, b) => a + b, 0), index = 0
    while (index < pool.length - 1 && roll >= weights[index]!) roll -= weights[index++]!
    choices.push(pool.splice(index, 1)[0]!)
  }
  return choices
}
export function grantReward(run: RunSession, reward: Reward): void {
  const weapon = run.content.weapons.get(reward.key as typeof weaponKeys[number])
  const entry = weapon ? weapon[reward.rank - 1]! : run.content.passives.get(reward.key as typeof passiveKeys[number])![reward.rank - 1]!
  const equips = run.actor.equips() as (Weapon | Passive | null)[]
  const ownedSlot = equips.findIndex(item => item?.data.key === reward.key)
  const slots = run.actor.equipSlots()
  const slot = ownedSlot >= 0 ? ownedSlot : equips.findIndex((item, index) => !item && slots[index] === entry.etypeId)
  run.actor.forceChangeEquip(slot, entry)
  if (weapon) {
    if (reward.rank === 1) {
      const delay = weapon[0]!.data.initialDelay
      run.cooldowns.set(reward.key as typeof weaponKeys[number], delay)
      if (reward.key === 'tomes') run.tomes.timer = delay
    }
    if (reward.key === 'tomes' && run.tomes.active) {
      const data = weapon[reward.rank - 1]!.data
      run.tomes.count = data.count!
      run.tomes.radius = data.radius!
    }
  }
  run.emit({ kind: 'upgrade', x: run.hero.x, z: run.hero.z })
}
export function gainExperience(run: RunSession, value: number): void {
  const before = run.actor.level
  run.actor.changeExp(run.actor.currentExp() + value, false)
  run.pendingLevels += run.actor.level - before
}
export function dropPickup(run: RunSession, key: PickupKey, point: Point): void {
  const angle = Math.random() * Math.PI * 2
  run.pickups.push({ id: run.nextId++, key, x: point.x, z: point.z, age: 0, y: .3, vy: 4, vx: Math.cos(angle) * 1.3, vz: Math.sin(angle) * 1.3, attracted: false, vacuum: false, speed: -3 })
}
function openChest(run: RunSession): void {
  const roll = Math.random(), count = roll < .5 ? 1 : roll < .8 ? 2 : 3
  const granted: Reward[] = []
  for (let i = 0; i < count; i++) {
    const owned = allRewards(run, true)
    const pool = owned.length ? owned : chooseRewards(run)
    if (!pool.length) break
    const reward = owned.length ? pool[Math.floor(Math.random() * pool.length)]! : pool[0]!
    grantReward(run, reward)
    granted.push(reward)
  }
  if (!granted.length) run.party.gainGold(100)
  run.chestRewards = granted
  run.chestGold = !granted.length
  run.chestPending = true
  run.emit({ kind: 'chest', x: run.hero.x, z: run.hero.z, value: granted.length })
}
function collect(run: RunSession, pickup: Pickup): void {
  const item = run.content.items.get(pickup.key)!
  const action = new Game_Action(run.actor)
  action.setItem(item.id)
  action.applyGlobal()
  if (item.data.xp) gainExperience(run, item.data.xp)
  else if (pickup.key === 'coin') run.party.gainGold(10)
  else if (pickup.key === 'chicken') action.apply(run.actor)
  else if (pickup.key === 'vacuum') for (const gem of run.pickups) { if (gem.key.startsWith('gem')) { gem.attracted = true; gem.vacuum = true } }
  else if (pickup.key === 'relic') run.relicAt = run.time + .4
  else if (pickup.key === 'chest') openChest(run)
  run.emit({ kind: 'pickup', x: pickup.x, z: pickup.z, value: item.data.xp, pickup: pickup.key })
}
export function stepPickups(run: RunSession, dt: number): void {
  const magnet = run.content.hero.magnet * (1 + run.passiveValue('lodestone'))
  run.pickups = run.pickups.filter(pickup => {
    pickup.age += dt
    if (!pickup.attracted && (pickup.y > .12 || pickup.vy > 0)) {
      pickup.y = Math.max(.12, pickup.y + pickup.vy * dt); pickup.vy -= 18 * dt
      pickup.x += pickup.vx * dt; pickup.z += pickup.vz * dt
    }
    const d = distance(pickup, run.hero), gem = pickup.key.startsWith('gem')
    if (pickup.age >= .25 && d < (gem ? magnet : .85)) pickup.attracted = true
    if (pickup.attracted) {
      if (d < .45) { collect(run, pickup); return false }
      pickup.speed = Math.min(pickup.vacuum ? 48 : 30, pickup.speed + dt * 42)
      const n = direction(run.hero.x - pickup.x, run.hero.z - pickup.z)
      const move = Math.min(d, pickup.speed * dt)
      pickup.x += n.x * move; pickup.z += n.z * move; pickup.y += (.5 - pickup.y) * dt * 10
    }
    return true
  })
  if (run.relicAt > 0 && run.time >= run.relicAt) {
    run.relicAt = -1
    for (const enemy of run.world.nearby(run.hero, 26)) killEnemy(run, enemy)
    run.emit({ kind: 'relic', x: run.hero.x, z: run.hero.z, value: 26 })
  }
}
