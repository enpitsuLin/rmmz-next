import type { Game_Actor, Game_Battler } from 'rmmz-next'
import type { MZ } from 'rmmz-next/database-types'
import type { PickupKey, Weapon } from '../managers/NightwardDataManager'
import type { Point } from '../primitives/geometry'
import type { Prop } from './Game_NightwardProps'
import type { Game_NightwardRun } from './Game_NightwardRun'
import type { Enemy } from './Game_NightwardWorld'
import { Game_Action, Game_BattlerBase } from 'rmmz-next'
import { direction, distance } from '../primitives/geometry'
import { dropPickup } from './rewards'

const activeWeapons = new WeakMap<Game_Actor, MZ.Weapon>()

export function activeWeapon(actor: Game_Actor): MZ.Weapon | undefined {
  return activeWeapons.get(actor)
}

export function withWeapon<T>(actor: Game_Actor, weapon: MZ.Weapon, fn: () => T): T {
  const previous = activeWeapons.get(actor)
  activeWeapons.set(actor, weapon)
  try {
    return fn()
  }
  finally {
    if (previous)
      activeWeapons.set(actor, previous)
    else
      activeWeapons.delete(actor)
  }
}

class ScaledAction extends Game_Action {
  constructor(subject: Game_Battler, private scale: number) {
    super(subject)
  }

  override evalDamageFormula(target: Game_Battler): number {
    return super.evalDamageFormula(target) * this.scale
  }
}

function weaponDamage(run: Game_NightwardRun, weapon: Weapon): number {
  return withWeapon(run.actor, weapon, () => run.actor.atk)
}

function weaponSkillId(weapon: Weapon): number {
  return weapon.traits.find(trait => trait.code === Game_BattlerBase.TRAIT_SKILL_ADD)!.dataId
}

export function hitEnemy(run: Game_NightwardRun, enemy: Enemy, weapon: Weapon, origin: Point): void {
  if (enemy.dead || enemy.state === 'rise')
    return
  const { key, knockback } = weapon.data
  const action = new Game_Action(run.actor)
  action.setSkill(weaponSkillId(weapon))
  const before = enemy.battler.hp
  withWeapon(run.actor, weapon, () => action.apply(enemy.battler))
  const dealt = before - enemy.battler.hp
  if (dealt <= 0)
    return
  const power = enemy.battler.result().hpDamage
  run.damage[key] += power
  enemy.flash = 0.1
  const n = direction(enemy.x - origin.x, enemy.z - origin.z)
  enemy.vx += n.x * knockback * enemy.data.knockback
  enemy.vz += n.z * knockback * enemy.data.knockback
  const scale = enemy.elite ? run.content.config.eliteScale : 1
  const y = enemy.data.hover + Math.sin(enemy.age * 4 + enemy.id) * enemy.data.bob + enemy.data.height * scale * 0.5
  run.emit({ kind: 'hit', x: enemy.x, y, z: enemy.z, value: power, color: key === 'flask' ? 0xFFB860 : 0xF8EAC8, weapon: key, target: enemy })
  if (enemy.battler.isDead())
    killEnemy(run, enemy)
}

export function beginCast(run: Game_NightwardRun, weapon: Weapon): void {
  const action = new Game_Action(run.actor)
  action.setSkill(weaponSkillId(weapon))
  run.applyActionEvents(action)
}

export function killEnemy(run: Game_NightwardRun, enemy: Enemy): void {
  if (enemy.dead)
    return
  enemy.battler.setHp(0)
  enemy.dead = true
  enemy.dying = 0.18
  run.kills++
  const scale = enemy.elite ? run.content.config.eliteScale : 1
  const y = enemy.data.hover + Math.sin(enemy.age * 4 + enemy.id) * enemy.data.bob + enemy.data.height * scale * 0.5
  run.emit({ kind: 'death', x: enemy.x, y, z: enemy.z, value: enemy.elite ? 2 : 1, target: enemy })
  if (enemy.data.key === 'reaper') {
    run.bossDefeated = true
    run.emit({ kind: 'bossDeath', x: enemy.x, z: enemy.z })
    return
  }
  if (enemy.elite) {
    dropPickup(run, 'gemBig', enemy)
    dropPickup(run, 'chest', enemy)
    return
  }
  const drops = enemy.battler.makeDropItems()
    .map(item => run.content.itemKeyById.get(item.id))
    .filter((key): key is PickupKey => !!key)
  const gems = drops.filter(key => key.startsWith('gem'))
  const bestGem = gems.includes('gemBig') ? 'gemBig' : gems.includes('gemMedium') ? 'gemMedium' : gems[0]
  if (bestGem)
    dropPickup(run, bestGem, enemy)
  for (const key of drops) {
    if (!key.startsWith('gem'))
      dropPickup(run, key, enemy)
  }
}

export function hurtHero(run: Game_NightwardRun, enemy: Enemy, origin: Point, contactScale?: number): void {
  if (run.invulnerable > 0 || run.demo || run.actor.isDead())
    return
  const isContact = contactScale !== undefined
  const action = isContact && contactScale !== 1 ? new ScaledAction(enemy.battler, contactScale) : new Game_Action(enemy.battler)
  action.setSkill(isContact ? run.content.contactSkill : run.content.waveSkill)
  action.apply(run.actor)
  run.applyActionEvents(action)
  run.invulnerable = run.content.hero.invulnerable
  const n = direction(run.hero.x - origin.x, run.hero.z - origin.z)
  run.hero.vx += n.x * 4
  run.hero.vz += n.z * 4
  run.emit({ kind: 'hurt', x: run.hero.x, z: run.hero.z, value: run.actor.result().hpDamage })
}

export function stepContact(run: Game_NightwardRun): void {
  const touching = run.world.nearby(run.hero, run.content.hero.radius).filter(enemy => enemy.state !== 'rise' && distance(enemy, run.hero) < enemy.radius + run.content.hero.radius)
  if (!touching.length)
    return
  const total = touching.reduce((sum, enemy) => sum + enemy.battler.atk, 0)
  const strongest = touching.reduce((a, b) => a.battler.atk > b.battler.atk ? a : b)
  const base = strongest.battler.atk
  const scale = base > 0 ? Math.min(1 + 0.25 * (total - base) / base, 1.6) : 1
  hurtHero(run, strongest, strongest, scale)
}

export function hitProps(run: Game_NightwardRun, point: Point, radius: number, weapon: Weapon, predicate?: (prop: Point) => boolean): void {
  for (const prop of run.world.props) {
    if (!prop.active || prop.kind !== 'brazier' || prop.broken || distance(point, prop) > radius + prop.radius || (predicate && !predicate(prop)))
      continue
    prop.hp -= weaponDamage(run, weapon)
    if (prop.hp > 0)
      continue
    breakProp(run, prop)
  }
}

export function breakProp(run: Game_NightwardRun, prop: Prop): void {
  if (!run.props.break(prop, run.time))
    return
  run.emit({ kind: 'break', x: prop.x, y: prop.y, z: prop.z })
  if (prop.model.onBreak)
    run.queuePropEvent(prop.model.onBreak, prop.id)
  if (prop.kind !== 'brazier')
    return
  const { relicChance, relicTime, vacuumChance, chickenChance } = run.content.config.brazierDrops
  const roll = Math.random()
  const pickup: PickupKey = roll < relicChance && run.time >= relicTime
    ? 'relic'
    : roll < relicChance + vacuumChance
      ? 'vacuum'
      : roll < relicChance + vacuumChance + chickenChance
        ? 'chicken'
        : 'coin'
  dropPickup(run, pickup, { x: prop.x + (prop.x > 0 ? -0.9 : 0.9), z: prop.z })
}
