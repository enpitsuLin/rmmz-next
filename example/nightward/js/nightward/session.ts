import { DataManager, Game_Interpreter, GlobalMananger as globals } from 'rmmz-next'
import type { Game_Action, Game_Actor, Game_Party, Game_Troop } from 'rmmz-next'
import type { PropScene } from './prop-scene'
import { PropManager } from './props'
import type { Prop } from './props'
import type { Content, FamilyKey, Passive, PassiveKey, PickupKey, Point, Weapon, WeaponKey } from './content'
import type { Enemy } from './world'
import type { DelayedCast, FirePool, Projectile, TomeState } from './weapons'
import type { DirectorState } from './director'
import type { Pickup, Reward } from './rewards'
import type { RunResult } from './records'
import { direction, distance, weaponKeys } from './content'
import { World } from './world'
import { breakProp, stepContact } from './combat'
import { stepDirector, stepEnemies } from './director'
import { stepFirePools, stepProjectiles, stepWeapons } from './weapons'
import { chooseRewards, grantReward, stepPickups } from './rewards'

export type RunState = 'running' | 'choosing' | 'chest' | 'paused' | 'results'
export interface RunEvent extends Point {
  kind: 'hit' | 'hurt' | 'death' | 'bossDeath' | 'pickup' | 'upgrade' | 'chest' | 'break' | 'relic' | 'lash' | 'lightning' | 'wand' | 'tomes' | 'ward' | 'flask' | 'boss' | 'ring' | 'scythe' | 'windup'
  value?: number
  extra?: number
  side?: number
  color?: number
  pickup?: PickupKey
  time?: number
  y?: number
  weapon?: WeaponKey
  target?: Enemy
  projectile?: Projectile
}
export class RunSession {
  readonly actor: Game_Actor
  readonly party: Game_Party
  readonly troop: Game_Troop
  readonly props: PropManager
  readonly world: World
  readonly interpreter: Game_Interpreter
  state: RunState = 'running'
  isSpawnVisible?: (point: Point) => boolean
  time = 0
  kills = 0
  nextId = 1
  invulnerable = 0
  readonly hero: Point & { vx: number, vz: number, facing: number, moving: boolean }
  pickups: Pickup[] = []
  projectiles: Projectile[] = []
  pools: FirePool[] = []
  delayed: DelayedCast[] = []
  events: RunEvent[] = []
  cooldowns = new Map<WeaponKey, number>()
  tomes: TomeState = { active: false, timer: 0, fade: 0, angle: 0, count: 0, radius: 0, hits: new Map() }
  wardPulse = 0
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
  propEventId?: string
  private propEvents: { id: number, prop: string }[] = []
  private pickupInterpreter = new Game_Interpreter()
  private pickupEvents: number[] = []
  constructor(readonly content: Content, readonly propScene: PropScene, readonly demo = false) {
    DataManager.setupNewGame()
    const player = globals.$gamePlayer
    player.performTransfer()
    this.hero = { x: player.x - content.map.center, z: player.y - content.map.center, vx: 0, vz: 0, facing: 1, moving: false }
    this.party = globals.$gameParty
    this.troop = globals.$gameTroop
    this.director.swarm = content.formations.swarm.first
    this.director.elite = content.formations.elite.first
    this.director.ring = content.formations.ring.first
    this.actor = this.party.members()[0]!
    for (const key of weaponKeys) this.cooldowns.set(key, content.weapons.get(key)![0]!.data.initialDelay)
    this.tomes.timer = content.weapons.get('tomes')![0]!.data.initialDelay
    this.interpreter = globals.$gameMap._interpreter
    const setup = this.interpreter.setup
    this.interpreter.setup = (list, eventId) => {
      this.propEventId = undefined
      setup.call(this.interpreter, list, eventId)
    }
    this.props = new PropManager(propScene, globals.$gameMap.events(), content.map.center)
    this.world = new World(content, this.props)
    this.party.onBattleStart(false)
    this.troop.onBattleStart(false)
    if (demo) {
      for (const [index, key] of weaponKeys.entries()) this.actor.forceChangeEquip(index, content.weapons.get(key)![0]!)
    }
  }
  get build(): RunResult['build'] {
    return (this.actor.equips() as (Weapon | Passive | null)[]).flatMap(item => item ? [{ key: item.data.key, rank: item.data.rank }] : [])
  }
  rank(key: FamilyKey): number { return this.build.find(item => item.key === key)?.rank ?? 0 }
  weapon(key: WeaponKey): Weapon | undefined { return (this.actor.weapons() as Weapon[]).find(weapon => weapon.data.key === key) }
  passiveValue(key: PassiveKey): number {
    return (this.actor.armors() as Passive[]).find(armor => armor.data.key === key)?.data.value ?? 0
  }
  cooldownScale(): number { return 1 - this.passiveValue('cinder') }
  emit(event: RunEvent): void { this.events.push({ ...event, time: this.time }) }
  breakProp(prop: Prop): void { breakProp(this, prop) }
  queuePropEvent(id: number, prop: string): void { this.propEvents.push({ id, prop }) }
  propContext(interpreter: Game_Interpreter): string | undefined {
    for (let current: Game_Interpreter | null = this.interpreter; current; current = Reflect.get(current, '_childInterpreter') as Game_Interpreter | null) {
      if (current === interpreter) return this.propEventId
    }
  }

  applyPickupEffects(action: Game_Action): void {
    const queue = globals.$gameTemp._commonEventQueue
    const start = queue.length
    action.applyGlobal()
    if (queue.length === start)
      return
    // Settle pickup rewards before checking upgrades, even if the map interpreter is waiting.
    this.pickupEvents.push(...queue.splice(start))
    if (!this.pickupInterpreter.isRunning())
      this.updatePickupEvents()
  }

  private updatePickupEvents(): void {
    const interpreter = this.pickupInterpreter
    if (!interpreter.isRunning() && !this.pickupEvents.length)
      return
    const previousLevel = this.actor.level
    interpreter.update()
    if (!interpreter.isRunning() && this.pickupEvents.length) {
      const commands = this.pickupEvents.splice(0).map(id => ({ code: 117, indent: 0, parameters: [id] }))
      interpreter.setup(commands)
      interpreter.update()
    }
    this.pendingLevels = Math.max(0, this.pendingLevels + this.actor.level - previousLevel)
  }

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
    globals.$gameMap.update(true)
    if (!this.interpreter.isRunning()) {
      this.propEventId = undefined
      const next = this.propEvents.shift()
      if (next) {
        this.interpreter.setup(globals.$dataCommonEvents[next.id]!.list, 0)
        this.propEventId = next.prop
      }
    }
    this.props.updateEvents()
    this.world.syncProps()
    this.invulnerable = Math.max(0, this.invulnerable - dt)
    const movement = this.demo ? this.demoInput() : input, n = Math.hypot(movement.x, movement.z) > 1 ? direction(movement.x, movement.z) : movement
    this.hero.moving = Math.hypot(n.x, n.z) > .1
    if (Math.abs(n.x) > .1) this.hero.facing = n.x > 0 ? 1 : -1
    const speed = this.content.hero.speed * (1 + this.passiveValue('haste'))
    this.world.move(this.hero, (n.x * speed + this.hero.vx) * dt, (n.z * speed + this.hero.vz) * dt, this.content.hero.radius)
    this.hero.vx *= Math.exp(-dt * 9); this.hero.vz *= Math.exp(-dt * 9)
    globals.$gamePlayer.locate(this.hero.x + this.content.map.center, this.hero.z + this.content.map.center)
    stepDirector(this, dt)
    stepEnemies(this, dt)
    stepWeapons(this, dt)
    stepFirePools(this)
    stepProjectiles(this, dt)
    stepContact(this)
    this.updatePickupEvents()
    stepPickups(this, dt)
    this.turn += dt
    if (this.turn >= 1) {
      this.turn -= 1
      this.actor.onTurnEnd()
      for (const enemy of this.world.enemies) if (!enemy.dead) enemy.battler.onTurnEnd()
    }
    if (this.actor.isDead()) this.finish(false)
    else if (this.bossDefeated) this.finish(true)
    else if (this.demo && this.chestPending) { this.chestPending = false; this.chestRewards = [] }
    else this.checkRewards()
  }
  private finish(won: boolean): void {
    this.state = 'results'
    this.result = { won, time: this.time, level: this.actor.level, kills: this.kills, gold: this.party.gold(), build: this.build, damage: { ...this.damage } }
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
    this.props.dispose()
    this.world.enemies.length = 0
    this.pickups.length = 0
    this.projectiles.length = 0
    this.pools.length = 0
    this.delayed.length = 0
    this.events.length = 0
    this.interpreter.clear()
    this.pickupInterpreter.clear()
    this.pickupEvents.length = 0
    this.propEvents.length = 0
    this.propEventId = undefined
  }
}
