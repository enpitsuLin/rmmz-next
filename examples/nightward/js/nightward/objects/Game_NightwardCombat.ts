import type { Game_Battler } from 'rmmz-next'
import type { MZ } from 'rmmz-next/database-types'
import type { PickupKey } from '../managers/NightwardDataManager'
import type { Point } from '../primitives/geometry'
import type { Game_NightwardEnemy } from './Game_NightwardEnemy'
import type { Game_NightwardProp } from './Game_NightwardProp'
import type { Game_NightwardRun } from './Game_NightwardRun'
import { Game_Action, Game_BattlerBase } from 'rmmz-next'
import { NightwardDataManager } from '../managers/NightwardDataManager'
import { nightwardActor } from '../patches/Game_Actor'
import { direction, distance } from '../primitives/geometry'

class ScaledAction extends Game_Action {
  constructor(subject: Game_Battler, private scale: number) {
    super(subject)
  }

  override evalDamageFormula(target: Game_Battler): number {
    return super.evalDamageFormula(target) * this.scale
  }
}

function weaponSkillId(weapon: MZ.Weapon): number {
  return weapon.traits.find(trait => trait.code === Game_BattlerBase.TRAIT_SKILL_ADD)!.dataId
}

export class Game_NightwardCombat {
  weaponDamage(run: Game_NightwardRun, weapon: MZ.Weapon): number {
    return nightwardActor(run.actor).withNightwardWeapon(weapon, () => run.actor.atk)
  }

  beginCast(run: Game_NightwardRun, weapon: MZ.Weapon): void {
    const action = new Game_Action(run.actor)
    action.setSkill(weaponSkillId(weapon))
    run.applyActionEvents(action)
  }

  hitEnemy(run: Game_NightwardRun, enemy: Game_NightwardEnemy, weapon: MZ.Weapon, origin: Point): void {
    if (enemy.dead || enemy.state === 'rise')
      return
    const { key, knockback } = NightwardDataManager.weaponData(weapon)
    const action = new Game_Action(run.actor)
    action.setSkill(weaponSkillId(weapon))
    const before = enemy.battler.hp
    nightwardActor(run.actor).withNightwardWeapon(weapon, () => action.apply(enemy.battler))
    const dealt = before - enemy.battler.hp
    if (dealt <= 0)
      return
    const power = enemy.battler.result().hpDamage
    run.damage[key] += power
    enemy.flash = 0.1
    enemy.applyKnockback(origin, knockback)
    const y = enemy.centerY(run.content.config.eliteScale)
    run.emit({ kind: 'hit', x: enemy.x, y, z: enemy.z, value: power, color: key === 'flask' ? 0xFFB860 : 0xF8EAC8, weapon: key, target: enemy })
    if (enemy.battler.isDead())
      this.killEnemy(run, enemy)
  }

  killEnemy(run: Game_NightwardRun, enemy: Game_NightwardEnemy): void {
    if (enemy.dead)
      return
    enemy.battler.setHp(0)
    enemy.dead = true
    enemy.dying = 0.18
    run.kills++
    const y = enemy.centerY(run.content.config.eliteScale)
    run.emit({ kind: 'death', x: enemy.x, y, z: enemy.z, value: enemy.elite ? 2 : 1, target: enemy })
    if (enemy.isReaper()) {
      run.bossDefeated = true
      run.emit({ kind: 'bossDeath', x: enemy.x, z: enemy.z })
      return
    }
    if (enemy.elite) {
      run.rewards.drop(run, 'gemBig', enemy)
      run.rewards.drop(run, 'chest', enemy)
      return
    }
    const drops = enemy.battler.makeDropItems()
      .map(item => run.content.itemKeyById.get(item.id))
      .filter((key): key is PickupKey => !!key)
    const gems = drops.filter(key => key.startsWith('gem'))
    const bestGem = gems.includes('gemBig') ? 'gemBig' : gems.includes('gemMedium') ? 'gemMedium' : gems[0]
    if (bestGem)
      run.rewards.drop(run, bestGem, enemy)
    for (const key of drops) {
      if (!key.startsWith('gem'))
        run.rewards.drop(run, key, enemy)
    }
  }

  hurtHero(run: Game_NightwardRun, enemy: Game_NightwardEnemy, origin: Point, contactScale?: number): void {
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

  updateContact(run: Game_NightwardRun): void {
    const touching = run.world.nearby(run.hero, run.content.hero.radius)
      .filter(enemy => enemy.state !== 'rise' && distance(enemy, run.hero) < enemy.radius + run.content.hero.radius)
    if (!touching.length)
      return
    const total = touching.reduce((sum, enemy) => sum + enemy.battler.atk, 0)
    const strongest = touching.reduce((a, b) => a.battler.atk > b.battler.atk ? a : b)
    const base = strongest.battler.atk
    const scale = base > 0 ? Math.min(1 + 0.25 * (total - base) / base, 1.6) : 1
    this.hurtHero(run, strongest, strongest, scale)
  }

  hitProps(run: Game_NightwardRun, point: Point, radius: number, weapon: MZ.Weapon, predicate?: (prop: Point) => boolean): void {
    for (const prop of run.world.props) {
      if (!prop.active || prop.kind !== 'brazier' || prop.broken || distance(point, prop) > radius + prop.radius || (predicate && !predicate(prop)))
        continue
      prop.hp -= this.weaponDamage(run, weapon)
      if (prop.hp > 0)
        continue
      this.breakProp(run, prop)
    }
  }

  breakProp(run: Game_NightwardRun, prop: Game_NightwardProp): void {
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
    run.rewards.drop(run, pickup, { x: prop.x + (prop.x > 0 ? -0.9 : 0.9), z: prop.z })
  }
}
