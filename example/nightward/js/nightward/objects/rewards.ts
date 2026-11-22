import type { FamilyKey, Passive, PickupKey, Weapon } from '../managers/NightwardDataManager'
import type { Point } from '../primitives/geometry'
import type { Game_NightwardRun } from './Game_NightwardRun'
import { Game_Action } from 'rmmz-next'
import { passiveKeys, weaponKeys } from '../managers/NightwardDataManager'
import { direction, distance } from '../primitives/geometry'
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
export function allRewards(run: Game_NightwardRun, ownedOnly = false): Reward[] {
  return [...weaponKeys, ...passiveKeys].flatMap((key) => {
    const rank = run.rank(key)
    if (rank === 5 || (ownedOnly && rank === 0))
      return []
    const weapon = run.content.weapons.get(key as typeof weaponKeys[number])
    const entry = weapon ? weapon[rank]! : run.content.passives.get(key as typeof passiveKeys[number])![rank]!
    return [{ key, rank: rank + 1, name: entry.name, description: entry.description, icon: entry.iconIndex, weapon: !!weapon }]
  })
}
export function chooseRewards(run: Game_NightwardRun): Reward[] {
  const pool = allRewards(run)
  const choices: Reward[] = []
  for (let i = 0; i < run.content.config.upgradeChoices && pool.length; i++) {
    const weights = pool.map(reward => reward.rank > 1 ? 3 : reward.weapon ? 2 : 1.4)
    let roll = Math.random() * weights.reduce((a, b) => a + b, 0)
    let index = 0
    while (index < pool.length - 1 && roll >= weights[index]!) roll -= weights[index++]!
    choices.push(pool.splice(index, 1)[0]!)
  }
  return choices
}
export function grantReward(run: Game_NightwardRun, reward: Reward): void {
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
      if (reward.key === 'tomes')
        run.tomes.timer = delay
    }
    if (reward.key === 'tomes' && run.tomes.active) {
      const data = weapon[reward.rank - 1]!.data
      run.tomes.count = data.count!
      run.tomes.radius = data.radius!
    }
  }
  run.emit({ kind: 'upgrade', x: run.hero.x, z: run.hero.z })
}
export function dropPickup(run: Game_NightwardRun, key: PickupKey, point: Point): void {
  const angle = Math.random() * Math.PI * 2
  run.pickups.push({ id: run.nextId++, key, x: point.x, z: point.z, age: 0, y: 0.3, vy: 4, vx: Math.cos(angle) * 1.3, vz: Math.sin(angle) * 1.3, attracted: false, vacuum: false, speed: -3 })
}
export function activateVacuum(run: Game_NightwardRun): void {
  for (const gem of run.pickups) {
    if (gem.key.startsWith('gem')) {
      gem.attracted = true
      gem.vacuum = true
    }
  }
}
export function openChest(run: Game_NightwardRun): void {
  const roll = Math.random()
  const count = roll < 0.5 ? 1 : roll < 0.8 ? 2 : 3
  const granted: Reward[] = []
  for (let i = 0; i < count; i++) {
    const owned = allRewards(run, true)
    const pool = owned.length ? owned : chooseRewards(run)
    if (!pool.length)
      break
    const reward = owned.length ? pool[Math.floor(Math.random() * pool.length)]! : pool[0]!
    grantReward(run, reward)
    granted.push(reward)
  }
  if (!granted.length)
    run.party.gainGold(run.content.config.chestGold)
  run.chestRewards = granted
  run.chestGold = !granted.length
  run.chestPending = true
  run.emit({ kind: 'chest', x: run.hero.x, z: run.hero.z, value: granted.length })
}
function collect(run: Game_NightwardRun, pickup: Pickup): void {
  const item = run.content.items.get(pickup.key)!
  const action = new Game_Action(run.actor)
  action.setItem(item.id)
  let healed: number | undefined
  if (action.isForFriend()) {
    action.apply(run.actor)
    const amount = -run.actor.result().hpDamage
    if (amount > 0)
      healed = amount
  }
  run.applyActionEvents(action)
  run.emit({ kind: 'pickup', x: pickup.x, z: pickup.z, pickup: pickup.key, value: healed })
}
export function stepPickups(run: Game_NightwardRun, dt: number): void {
  const magnet = run.content.hero.magnet * (1 + run.passiveValue('lodestone'))
  run.pickups = run.pickups.filter((pickup) => {
    pickup.age += dt
    if (!pickup.attracted && (pickup.y > 0.12 || pickup.vy > 0)) {
      pickup.y = Math.max(0.12, pickup.y + pickup.vy * dt)
      pickup.vy -= 18 * dt
      pickup.x += pickup.vx * dt
      pickup.z += pickup.vz * dt
    }
    const d = distance(pickup, run.hero)
    const gem = pickup.key.startsWith('gem')
    if (pickup.age >= 0.25 && d < (gem ? magnet : 0.85))
      pickup.attracted = true
    if (pickup.attracted) {
      if (d < 0.45) {
        collect(run, pickup)
        return false
      }
      pickup.speed = Math.min(pickup.vacuum ? 48 : 30, pickup.speed + dt * 42)
      const n = direction(run.hero.x - pickup.x, run.hero.z - pickup.z)
      const move = Math.min(d, pickup.speed * dt)
      pickup.x += n.x * move
      pickup.z += n.z * move
      pickup.y += (0.5 - pickup.y) * dt * 10
    }
    return true
  })
  if (run.relicAt > 0 && run.time >= run.relicAt) {
    run.relicAt = -1
    const radius = run.relicRadius
    for (const enemy of run.world.nearby(run.hero, radius)) killEnemy(run, enemy)
    run.emit({ kind: 'relic', x: run.hero.x, z: run.hero.z, value: radius })
  }
}
