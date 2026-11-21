import { Game_Action } from 'rmmz-next'
import type { Game_Battler } from 'rmmz-next'
import type { RunSession } from './session'
import type { Enemy } from './world'
import type { Point, WeaponKey } from './content'
import { direction, distance } from './content'
import { dropPickup } from './rewards'

class NightwardAction extends Game_Action {
  constructor(subject: Game_Battler, private multiplier: number, private power?: number) { super(subject) }
  override evalDamageFormula(target: Game_Battler): number {
    return (this.power ?? super.evalDamageFormula(target)) * this.multiplier
  }
}
export function hitEnemy(run: RunSession, enemy: Enemy, skillId: number, key: WeaponKey, origin: Point, knockback: number): void {
  if (enemy.dead || enemy.state === 'rise') return
  const action = new NightwardAction(run.actor, 1 + run.passiveValue('might'))
  action.setSkill(skillId)
  const before = enemy.battler.hp
  action.apply(enemy.battler)
  const dealt = before - enemy.battler.hp
  if (dealt <= 0) return
  const power = enemy.battler.result().hpDamage
  run.damage[key] += power
  enemy.flash = .1
  const n = direction(enemy.x - origin.x, enemy.z - origin.z)
  enemy.vx += n.x * knockback * enemy.data.knockback
  enemy.vz += n.z * knockback * enemy.data.knockback
  const y = enemy.data.hover + Math.sin(enemy.age * 4 + enemy.id) * enemy.data.bob + enemy.data.height * (enemy.elite ? 1.6 : 1) * .5
  run.emit({ kind: 'hit', x: enemy.x, y, z: enemy.z, value: power, color: key === 'flask' ? 0xffb860 : 0xf8eac8, weapon: key, target: enemy })
  if (enemy.battler.isDead()) killEnemy(run, enemy)
}
export function beginCast(run: RunSession, skillId: number): void {
  const action = new NightwardAction(run.actor, 1)
  action.setSkill(skillId)
  action.applyGlobal()
}
export function killEnemy(run: RunSession, enemy: Enemy): void {
  if (enemy.dead) return
  enemy.battler.setHp(0)
  enemy.dead = true
  enemy.dying = .18
  run.kills++
  const y = enemy.data.hover + Math.sin(enemy.age * 4 + enemy.id) * enemy.data.bob + enemy.data.height * (enemy.elite ? 1.6 : 1) * .5
  run.emit({ kind: 'death', x: enemy.x, y, z: enemy.z, value: enemy.elite ? 2 : 1, target: enemy })
  if (enemy.data.key === 'reaper') { run.bossDefeated = true; run.emit({ kind: 'bossDeath', x: enemy.x, z: enemy.z }); return }
  dropPickup(run, enemy.elite ? 'gemBig' : Math.random() < enemy.data.midChance ? 'gemMedium' : 'gemSmall', enemy)
  if (enemy.elite) dropPickup(run, 'chest', enemy)
}
export function hurtHero(run: RunSession, enemy: Enemy, power: number, origin: Point, wave = false): void {
  if (run.invulnerable > 0 || run.demo || run.actor.isDead()) return
  const action = new NightwardAction(enemy.battler, 1, power)
  action.setSkill(wave ? run.content.waveSkill : run.content.contactSkill)
  action.apply(run.actor)
  action.applyGlobal()
  run.invulnerable = run.content.hero.invulnerable
  const n = direction(run.hero.x - origin.x, run.hero.z - origin.z)
  run.hero.vx += n.x * 4; run.hero.vz += n.z * 4
  run.emit({ kind: 'hurt', x: run.hero.x, z: run.hero.z, value: run.actor.result().hpDamage })
}
export function stepContact(run: RunSession): void {
  const touching = run.world.nearby(run.hero, run.content.hero.radius).filter(enemy => enemy.state !== 'rise' && distance(enemy, run.hero) < enemy.radius + run.content.hero.radius)
  if (!touching.length) return
  const total = touching.reduce((sum, enemy) => sum + enemy.contact, 0)
  const strongest = touching.reduce((a, b) => a.contact > b.contact ? a : b)
  hurtHero(run, strongest, Math.min(strongest.contact + .25 * (total - strongest.contact), 1.6 * strongest.contact), strongest)
}
export function hitProps(run: RunSession, point: Point, radius: number, damage: number, predicate?: (prop: Point) => boolean): void {
  for (const prop of run.world.props) {
    if (prop.kind !== 'brazier' || prop.broken || distance(point, prop) > radius + prop.radius || (predicate && !predicate(prop))) continue
    prop.hp -= damage * (1 + run.passiveValue('might'))
    if (prop.hp > 0) continue
    prop.broken = true
    run.emit({ kind: 'break', x: prop.x, z: prop.z })
    const roll = Math.random()
    dropPickup(run, roll < .04 && run.time >= 60 ? 'relic' : roll < .14 ? 'vacuum' : roll < .4 ? 'chicken' : 'coin', { x: prop.x + (prop.x > 0 ? -.9 : .9), z: prop.z })
  }
}
