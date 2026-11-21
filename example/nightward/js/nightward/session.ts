import { DataManager, Game_Interpreter, GlobalMananger as globals } from 'rmmz-next'
import type { Game_Actor, Game_Party, Game_Troop } from 'rmmz-next'
import type { Content, FamilyKey, PassiveKey, PickupKey, Point, WeaponKey } from './content'
import type { Enemy } from './world'
import type { DelayedCast, FirePool, Projectile, TomeState, WeaponSkill } from './weapons'
import type { DirectorState } from './director'
import type { Pickup, Reward } from './rewards'
import type { RunResult } from './records'
import { direction, distance } from './content'
import { World } from './world'
import { stepContact } from './combat'
import { stepDirector, stepEnemies } from './director'
import { stepProjectiles, stepWeapons } from './weapons'
import { chooseRewards, grantReward, rankOf, stepPickups } from './rewards'

export type RunState = 'running' | 'choosing' | 'chest' | 'paused' | 'results'
export interface RunEvent extends Point {
  kind: 'hit' | 'hurt' | 'death' | 'bossDeath' | 'pickup' | 'upgrade' | 'chest' | 'break' | 'relic' | 'lash' | 'lightning' | 'wand' | 'tomes' | 'ward' | 'flask' | 'boss' | 'ring' | 'scythe' | 'windup'
  value?: number
  extra?: number
  side?: number
  color?: number
  pickup?: PickupKey
}
export class RunSession {
  readonly actor: Game_Actor
  readonly party: Game_Party
  readonly troop: Game_Troop
  readonly world: World
  readonly buildOrder: FamilyKey[] = ['lash']
  readonly interpreter = new Game_Interpreter()
  state: RunState = 'running'
  isSpawnVisible?: (point: Point) => boolean
  time = 0
  kills = 0
  nextId = 1
  invulnerable = 0
  hero = { x: 0, z: 6, vx: 0, vz: 0, facing: 1, moving: false }
  pickups: Pickup[] = []
  projectiles: Projectile[] = []
  pools: FirePool[] = []
  delayed: DelayedCast[] = []
  events: RunEvent[] = []
  cooldowns = new Map<WeaponKey, number>()
  tomes: TomeState = { active: false, timer: 0, fade: 0, angle: 0, hits: new Map() }
  director: DirectorState = { budget: 0, opening: 0, swarm: 14, elite: 35, ring: 60, boss: false }
  boss?: Enemy
  bossDefeated = false
  pendingLevels = 0
  choices: Reward[] = []
  chestRewards: Reward[] = []
  chestGold = false
  chestPending = false
  relicAt = -1
  damage: Record<WeaponKey, number> = { lash: 0, wand: 0, tomes: 0, storm: 0, ward: 0, flask: 0 }
  result?: RunResult
  private turn = 0
  private ended = false
  constructor(readonly content: Content, readonly demo = false) {
    DataManager.setupNewGame()
    globals.$gameMap.setup(1)
    globals.$gamePlayer.locate(90, 96)
    globals.$gamePlayer.clearTransferInfo()
    this.party = globals.$gameParty
    this.troop = globals.$gameTroop
    this.director.swarm = content.formations.swarm.first
    this.director.elite = content.formations.elite.first
    this.director.ring = content.formations.ring.first
    this.actor = this.party.members()[0]!
    this.cooldowns.set('lash', .3)
    this.world = new World(content)
    this.party.onBattleStart(false)
    this.troop.onBattleStart(false)
    if (demo) {
      for (const key of ['wand', 'tomes', 'storm', 'ward', 'flask'] as const) this.actor.learnSkill(content.weapons.get(key)![0]!.id)
      this.buildOrder.push('wand', 'tomes', 'storm', 'ward', 'flask')
    }
  }
  rank(key: FamilyKey): number { return rankOf(this, key) }
  weapon(key: WeaponKey): WeaponSkill | undefined {
    const rank = this.rank(key)
    return rank ? this.content.weapons.get(key)![rank - 1] : undefined
  }
  passiveValue(key: PassiveKey): number {
    const rank = this.rank(key)
    return rank ? this.content.passives.get(key)![rank - 1]!.data.value : 0
  }
  emit(event: RunEvent): void { this.events.push(event) }
  pause(): void { if (this.state === 'running') this.state = 'paused' }
  resume(): void { if (this.state === 'paused') this.state = 'running' }
  select(index: number): void {
    const reward = this.choices[index]
    if (this.state !== 'choosing' || !reward) return
    grantReward(this, reward)
    this.pendingLevels--
    this.state = 'running'
    this.choices = []
    this.checkRewards()
  }
  closeChest(): void {
    if (this.state !== 'chest') return
    this.chestRewards = []
    this.chestPending = false
    this.state = 'running'
    this.checkRewards()
  }
  private checkRewards(): void {
    if (this.chestPending) { this.state = 'chest'; return }
    if (this.pendingLevels <= 0) return
    this.choices = chooseRewards(this)
    if (!this.choices.length) { this.party.gainGold(25 * this.pendingLevels); this.pendingLevels = 0; return }
    if (this.demo) { this.selectDemoReward(); return }
    this.state = 'choosing'
  }
  private selectDemoReward(): void {
    grantReward(this, this.choices[0]!)
    this.pendingLevels--
    this.choices = []
  }
  private demoInput(): Point {
    const target = this.pickups.filter(pickup => pickup.key.startsWith('gem')).sort((a, b) => distance(this.hero, a) - distance(this.hero, b))[0]
    const orbit = { x: Math.sin(this.time * .13) * 5, z: 4 + Math.cos(this.time * .17) * 4 }
    const goal = target && distance(target, this.hero) < 7 ? target : orbit
    return direction(goal.x - this.hero.x, goal.z - this.hero.z)
  }
  update(input: Point, dt = 1 / 60): void {
    if (this.state !== 'running') return
    this.time += dt
    this.invulnerable = Math.max(0, this.invulnerable - dt)
    const movement = this.demo ? this.demoInput() : input, n = Math.hypot(movement.x, movement.z) > 1 ? direction(movement.x, movement.z) : movement
    this.hero.moving = Math.hypot(n.x, n.z) > .1
    if (Math.abs(n.x) > .1) this.hero.facing = n.x > 0 ? 1 : -1
    const speed = this.content.hero.speed
    this.world.move(this.hero, (n.x * speed + this.hero.vx) * dt, (n.z * speed + this.hero.vz) * dt, this.content.hero.radius)
    this.hero.vx *= Math.exp(-dt * 9); this.hero.vz *= Math.exp(-dt * 9)
    globals.$gamePlayer.locate(this.hero.x + 90, this.hero.z + 90)
    stepDirector(this, dt)
    stepEnemies(this, dt)
    stepWeapons(this, dt)
    stepProjectiles(this, dt)
    stepContact(this)
    stepPickups(this, dt)
    this.turn += dt
    if (this.turn >= 1) {
      this.turn -= 1
      this.actor.onTurnEnd()
      for (const enemy of this.world.enemies) if (!enemy.dead) enemy.battler.onTurnEnd()
    }
    if (!this.interpreter.isRunning()) this.interpreter.setupReservedCommonEvent()
    this.interpreter.update()
    if (this.actor.isDead()) this.finish(false)
    else if (this.bossDefeated) this.finish(true)
    else if (this.demo && this.chestPending) { this.chestPending = false; this.chestRewards = [] }
    else this.checkRewards()
  }
  private finish(won: boolean): void {
    this.state = 'results'
    this.result = { won, time: this.time, level: this.actor.level, kills: this.kills, gold: this.party.gold(), build: this.buildOrder.map(key => ({ key, rank: this.rank(key) })), damage: { ...this.damage } }
    this.endBattle()
  }
  private endBattle(): void {
    if (this.ended) return
    this.ended = true
    // Keep references: setupNewGame replaces globals before another session begins.
    this.party.onBattleEnd()
    this.troop.onBattleEnd()
  }
  dispose(): void {
    this.endBattle()
    this.world.enemies.length = 0
    this.pickups.length = 0
    this.projectiles.length = 0
    this.pools.length = 0
    this.delayed.length = 0
    this.events.length = 0
    this.interpreter.clear()
  }
}
