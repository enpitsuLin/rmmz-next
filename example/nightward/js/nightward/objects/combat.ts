import type { Game_Battler } from 'rmmz-next'
import type { Weapon } from '../managers/NightwardDataManager'
import type { Point } from '../primitives/geometry'
import type { Prop } from './Game_NightwardProps'
import type { Game_NightwardRun } from './Game_NightwardRun'
import type { Enemy } from './Game_NightwardWorld'
import { Game_Action, Game_BattlerBase } from 'rmmz-next'
import { direction, distance } from '../primitives/geometry'
import { dropPickup } from './rewards'

class FixedDamageAction extends Game_Action {
  constructor(subject: Game_Battler, private power: number) {
    super(subject)
  }

  override evalDamageFormula(): number {
    return this.power
  }
}
function weaponDamage(run: Game_NightwardRun, weapon: Weapon): number {
  const attack = weapon.params[2]!
  return Math.max(0, attack) * (1 + run.passiveValue('might'))
}
function weaponSkillId(weapon: Weapon): number {
  return weapon.traits.find(trait => trait.code === Game_BattlerBase.TRAIT_SKILL_ADD)!.dataId
}
export function hitEnemy(run: Game_NightwardRun, enemy: Enemy, weapon: Weapon, origin: Point): void {
  if (enemy.dead || enemy.state === 'rise')
    return
  const { key, knockback } = weapon.data
  const action = new FixedDamageAction(run.actor, weaponDamage(run, weapon))
  action.setSkill(weaponSkillId(weapon))
  const before = enemy.battler.hp
  action.apply(enemy.battler)
  const dealt = before - enemy.battler.hp
  if (dealt <= 0)
    return
  const power = enemy.battler.result().hpDamage
  run.damage[key] += power
  enemy.flash = 0.1
  const n = direction(enemy.x - origin.x, enemy.z - origin.z)
  enemy.vx += n.x * knockback * enemy.data.knockback
  enemy.vz += n.z * knockback * enemy.data.knockback
  const y = enemy.data.hover + Math.sin(enemy.age * 4 + enemy.id) * enemy.data.bob + enemy.data.height * (enemy.elite ? 1.6 : 1) * 0.5
  run.emit({ kind: 'hit', x: enemy.x, y, z: enemy.z, value: power, color: key === 'flask' ? 0xFFB860 : 0xF8EAC8, weapon: key, target: enemy })
  if (enemy.battler.isDead())
    killEnemy(run, enemy)
}
export function beginCast(run: Game_NightwardRun, weapon: Weapon): void {
  const action = new Game_Action(run.actor)
  action.setSkill(weaponSkillId(weapon))
  action.applyGlobal()
}
export function killEnemy(run: Game_NightwardRun, enemy: Enemy): void {
  if (enemy.dead)
    return
  enemy.battler.setHp(0)
  enemy.dead = true
  enemy.dying = 0.18
  run.kills++
  const y = enemy.data.hover + Math.sin(enemy.age * 4 + enemy.id) * enemy.data.bob + enemy.data.height * (enemy.elite ? 1.6 : 1) * 0.5
  run.emit({ kind: 'death', x: enemy.x, y, z: enemy.z, value: enemy.elite ? 2 : 1, target: enemy })
  if (enemy.data.key === 'reaper') { run.bossDefeated = true; run.emit({ kind: 'bossDeath', x: enemy.x, z: enemy.z }); return }
  dropPickup(run, enemy.elite ? 'gemBig' : Math.random() < enemy.data.midChance ? 'gemMedium' : 'gemSmall', enemy)
  if (enemy.elite)
    dropPickup(run, 'chest', enemy)
}
export function hurtHero(run: Game_NightwardRun, enemy: Enemy, origin: Point, contactDamage?: number): void {
  if (run.invulnerable > 0 || run.demo || run.actor.isDead())
    return
  const isContact = contactDamage !== undefined
  const action = isContact ? new FixedDamageAction(enemy.battler, contactDamage) : new Game_Action(enemy.battler)
  action.setSkill(isContact ? run.content.contactSkill : run.content.waveSkill)
  action.apply(run.actor)
  action.applyGlobal()
  run.invulnerable = run.content.hero.invulnerable
  const n = direction(run.hero.x - origin.x, run.hero.z - origin.z)
  run.hero.vx += n.x * 4; run.hero.vz += n.z * 4
  run.emit({ kind: 'hurt', x: run.hero.x, z: run.hero.z, value: run.actor.result().hpDamage })
}
export function stepContact(run: Game_NightwardRun): void {
  const touching = run.world.nearby(run.hero, run.content.hero.radius).filter(enemy => enemy.state !== 'rise' && distance(enemy, run.hero) < enemy.radius + run.content.hero.radius)
  if (!touching.length)
    return
  const total = touching.reduce((sum, enemy) => sum + enemy.contact, 0)
  const strongest = touching.reduce((a, b) => a.contact > b.contact ? a : b)
  const damage = Math.min(strongest.contact + 0.25 * (total - strongest.contact), 1.6 * strongest.contact)
  hurtHero(run, strongest, strongest, damage)
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
  const roll = Math.random()
  dropPickup(run, roll < 0.04 && run.time >= 60 ? 'relic' : roll < 0.14 ? 'vacuum' : roll < 0.4 ? 'chicken' : 'coin', { x: prop.x + (prop.x > 0 ? -0.9 : 0.9), z: prop.z })
}
