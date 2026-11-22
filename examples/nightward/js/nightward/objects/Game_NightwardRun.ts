import type { Game_Action, Game_Actor, Game_Interpreter, Game_Party, Game_Troop } from 'rmmz-next'
import type { MZ } from 'rmmz-next/database-types'
import type { Content, FamilyKey, PassiveKey, PickupKey, WeaponKey } from '../managers/NightwardDataManager'
import type { PropScene } from '../managers/NightwardPropSceneManager'
import type { RunResult } from '../managers/NightwardRecordManager'
import type { Point } from '../primitives/geometry'
import type { Game_NightwardEnemy } from './Game_NightwardEnemy'
import type { Game_NightwardProp } from './Game_NightwardProp'
import type { Pickup, Reward } from './Game_NightwardRewards'
import type { FirePool, Projectile, TomeState } from './Game_NightwardWeapons'
import { GlobalMananger as globals } from 'rmmz-next'
import { weaponKeys } from '../managers/NightwardDataManager'
import { NightwardSound } from '../patches/AudioManager'
import { nightwardActor } from '../patches/Game_Actor'
import { direction, distance } from '../primitives/geometry'
import { Game_NightwardCombat } from './Game_NightwardCombat'
import { Game_NightwardDirector } from './Game_NightwardDirector'
import { Game_NightwardEvents } from './Game_NightwardEvents'
import { Game_NightwardProps } from './Game_NightwardProps'
import { Game_NightwardRewards } from './Game_NightwardRewards'
import { Game_NightwardWeapons } from './Game_NightwardWeapons'
import { Game_NightwardWorld } from './Game_NightwardWorld'

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
  target?: Game_NightwardEnemy
  projectile?: Projectile
}

export class Game_NightwardRun {
  readonly actor: Game_Actor
  readonly party: Game_Party
  readonly troop: Game_Troop
  readonly props: Game_NightwardProps
  readonly world: Game_NightwardWorld
  readonly commonEvents: Game_NightwardEvents
  readonly combat: Game_NightwardCombat
  readonly director: Game_NightwardDirector
  readonly weapons: Game_NightwardWeapons
  readonly rewards: Game_NightwardRewards
  state: RunState = 'running'
  isSpawnVisible?: (point: Point) => boolean
  time = 0
  kills = 0
  nextId = 1
  invulnerable = 0
  readonly hero: Point & { vx: number, vz: number, facing: number, moving: boolean }
  boss?: Game_NightwardEnemy
  bossDefeated = false
  damage: Record<WeaponKey, number> = { lash: 0, wand: 0, tomes: 0, storm: 0, ward: 0, flask: 0 }
  result?: RunResult

  private turn = 0
  private ended = false
  private _audioEvents: RunEvent[] = []
  private _effectEvents: RunEvent[] = []
  private _hudEvents: RunEvent[] = []

  constructor(readonly content: Content, readonly propScene: PropScene, readonly demo = false) {
    const player = globals.$gamePlayer
    this.hero = { x: player.x - content.map.center, z: player.y - content.map.center, vx: 0, vz: 0, facing: 1, moving: false }
    this.party = globals.$gameParty
    this.troop = globals.$gameTroop
    this.actor = this.party.members()[0]!
    this.commonEvents = new Game_NightwardEvents(demo)
    this.props = new Game_NightwardProps(propScene, globals.$gameMap.events(), content.map.center)
    this.world = new Game_NightwardWorld(content, this.props)
    this.combat = new Game_NightwardCombat()
    this.director = new Game_NightwardDirector(content)
    this.weapons = new Game_NightwardWeapons(content)
    this.rewards = new Game_NightwardRewards()
    this.party.onBattleStart(false)
    this.troop.onBattleStart(false)
    if (demo) {
      for (const [index, key] of weaponKeys.slice(0, content.config.weaponSlots).entries())
        this.actor.forceChangeEquip(index, content.weapons.get(key)![0]!)
    }
  }

  get build(): RunResult['build'] { return nightwardActor(this.actor).nightwardBuild() }
  get pickups(): Pickup[] { return this.rewards.pickups }
  get projectiles(): Projectile[] { return this.weapons.projectiles }
  get pools(): FirePool[] { return this.weapons.pools }
  get tomes(): TomeState { return this.weapons.tomes }
  get wardPulse(): number { return this.weapons.wardPulse }
  get choices(): Reward[] { return this.rewards.choices }
  get chestRewards(): Reward[] { return this.rewards.chestRewards }
  get chestGold(): boolean { return this.rewards.chestGold }

  rank(key: FamilyKey): number { return nightwardActor(this.actor).nightwardRank(key) }
  weapon(key: WeaponKey): MZ.Weapon | undefined { return nightwardActor(this.actor).nightwardWeapon(key) }
  passiveValue(key: PassiveKey): number { return nightwardActor(this.actor).nightwardPassiveValue(key) }
  cooldownScale(): number { return nightwardActor(this.actor).nightwardCooldownScale() }

  emit(event: RunEvent): void {
    const stamped: RunEvent = { ...event, time: this.time }
    this._audioEvents.push(stamped)
    this._effectEvents.push(stamped)
    this._hudEvents.push(stamped)
  }

  drainEffectEvents(): RunEvent[] { return this._effectEvents.splice(0) }
  drainHudEvents(): RunEvent[] { return this._hudEvents.splice(0) }

  breakProp(prop: Game_NightwardProp): void { this.combat.breakProp(this, prop) }
  triggerVacuum(): void { this.rewards.activateVacuum() }
  triggerRelic(radius = 26, delay = 0.4): void { this.rewards.triggerRelic(this.time, radius, delay) }
  triggerChest(): void { this.rewards.openChest(this) }

  queuePropEvent(id: number, prop: string): void {
    this.trackLevels(() => this.commonEvents.run(id, prop))
  }

  propContext(interpreter: Game_Interpreter): string | undefined {
    return this.commonEvents.propContext(interpreter)
  }

  applyActionEvents(action: Game_Action): void {
    this.trackLevels(() => this.commonEvents.applyAction(action))
  }

  private trackLevels(fn: () => void): void {
    const previousLevel = this.actor.level
    fn()
    this.rewards.pendingLevels = Math.max(0, this.rewards.pendingLevels + this.actor.level - previousLevel)
  }

  pause(): void {
    if (this.state === 'running')
      this.state = 'paused'
  }

  resume(): void {
    if (this.state === 'paused')
      this.state = 'running'
  }

  select(index: number): void {
    this.rewards.select(this, index)
  }

  closeChest(): void {
    this.rewards.closeChest(this)
  }

  private demoInput(): Point {
    let target: Pickup | undefined
    let nearest = 7
    for (const pickup of this.rewards.pickups) {
      if (!pickup.key.startsWith('gem'))
        continue
      const range = distance(this.hero, pickup)
      if (range < nearest) {
        nearest = range
        target = pickup
      }
    }
    const goal = target ?? { x: Math.sin(this.time * 0.13) * 5, z: 4 + Math.cos(this.time * 0.17) * 4 }
    return direction(goal.x - this.hero.x, goal.z - this.hero.z)
  }

  update(input: Point, dt = 1 / 60): void {
    if (this.state !== 'running')
      return
    this.time += dt
    globals.$gameMap.update(true)
    this.props.updateEvents()
    this.world.syncProps()
    this.invulnerable = Math.max(0, this.invulnerable - dt)
    const movement = this.demo ? this.demoInput() : input
    const n = Math.hypot(movement.x, movement.z) > 1 ? direction(movement.x, movement.z) : movement
    this.hero.moving = Math.hypot(n.x, n.z) > 0.1
    if (Math.abs(n.x) > 0.1)
      this.hero.facing = n.x > 0 ? 1 : -1
    const speed = this.content.hero.speed * this.actor.paramRate(6)
    this.world.move(this.hero, (n.x * speed + this.hero.vx) * dt, (n.z * speed + this.hero.vz) * dt, this.content.hero.radius)
    this.hero.vx *= Math.exp(-dt * 9)
    this.hero.vz *= Math.exp(-dt * 9)
    globals.$gamePlayer.locate(this.hero.x + this.content.map.center, this.hero.z + this.content.map.center)
    const eventStart = this._audioEvents.length
    this.director.update(this, dt)
    this.director.updateEnemies(this, dt)
    this.weapons.update(this, dt)
    this.combat.updateContact(this)
    this.rewards.update(this, dt)
    this.trackLevels(() => {
      this.commonEvents.update(this.time)
      for (let i = eventStart; i < this._audioEvents.length; i++) {
        const { kind } = this._audioEvents[i]!
        if (kind === 'boss' || kind === 'bossDeath')
          this.commonEvents.queue(kind)
      }
    })
    NightwardSound.playNightwardRunEvents(this._audioEvents.splice(0))
    this.turn += dt
    if (this.turn >= 1) {
      this.turn -= 1
      this.actor.onTurnEnd()
      for (const enemy of this.world.enemies) {
        if (!enemy.dead)
          enemy.battler.onTurnEnd()
      }
    }
    if (this.actor.isDead()) {
      this.finish(false)
    }
    else if (this.bossDefeated) {
      this.finish(true)
    }
    else if (this.demo && this.rewards.chestPending) {
      this.rewards.chestPending = false
      this.rewards.chestRewards = []
    }
    else {
      this.rewards.checkPending(this)
    }
  }

  private finish(won: boolean): void {
    this.state = 'results'
    this.result = {
      won,
      time: this.time,
      level: this.actor.level,
      kills: this.kills,
      gold: this.party.gold(),
      build: this.build,
      damage: { ...this.damage },
    }
    this.endBattle()
  }

  private endBattle(): void {
    if (this.ended)
      return
    this.ended = true
    this.party.onBattleEnd()
    this.troop.onBattleEnd()
  }

  dispose(): void {
    this.endBattle()
    this.props.dispose()
    this.world.enemies.length = 0
    this.weapons.clear()
    this.rewards.clear()
    this._audioEvents.length = 0
    this._effectEvents.length = 0
    this._hudEvents.length = 0
    this.commonEvents.clear()
  }
}
