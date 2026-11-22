import type { MZ } from 'rmmz-next/database-types'
import type { Content, EnemyData } from '../managers/NightwardDataManager'
import type { Point } from '../primitives/geometry'
import type { Game_NightwardRun } from './Game_NightwardRun'
import { Game_Enemy } from 'rmmz-next'
import { direction, distance } from '../primitives/geometry'

export class Game_NightwardEnemy implements Point {
  readonly id: number
  readonly battler: Game_Enemy
  readonly data: EnemyData
  readonly radius: number
  readonly speed: number
  readonly elite: boolean
  x: number
  z: number
  vx = 0
  vz = 0
  age = 0
  flash = 0
  dying = 0
  dead = false
  state: 'rise' | 'walk' | 'windup' | 'recover'
  phase: number
  swing: number
  aim: Point = { x: 0, z: 1 }

  constructor(
    id: number,
    entry: MZ.Enemy,
    data: EnemyData,
    point: Point,
    content: Content,
    runTime: number,
    elite: boolean,
    speedMultiplier: number,
  ) {
    const { eliteHpRate, eliteAtkRate, eliteScale } = content.config
    const boss = data.key === 'reaper'
    const battler = new Game_Enemy(entry.id, 0, 0)
    const healthScale = boss ? 1 : (1 + Math.max(0, runTime - 30) / 120) * (elite ? eliteHpRate : 1)
    battler.addParam(0, Math.round(entry.params[0]! * (healthScale - 1)))
    if (elite)
      battler.addParam(2, Math.round(entry.params[2]! * (eliteAtkRate - 1)))
    battler.recoverAll()
    battler.onBattleStart(false)

    this.id = id
    this.x = point.x
    this.z = point.z
    this.battler = battler
    this.data = data
    this.elite = elite
    this.radius = data.radius * (elite ? eliteScale : 1)
    this.speed = data.speed * speedMultiplier * (boss ? 1 : 1 + Math.min(0.25, runTime / 720))
    this.state = boss ? 'rise' : 'walk'
    this.phase = boss ? content.formations.reaper.rise : 0
    this.swing = content.formations.reaper.firstSwing
  }

  isReaper(): boolean {
    return this.data.key === 'reaper'
  }

  isRemovable(): boolean {
    return this.dead && this.dying <= 0
  }

  visualScale(eliteScale: number): number {
    return this.elite ? eliteScale : 1
  }

  hoverY(): number {
    return this.data.hover + Math.sin(this.age * 4 + this.id) * this.data.bob
  }

  centerY(eliteScale: number): number {
    return this.hoverY() + this.data.height * this.visualScale(eliteScale) * 0.5
  }

  applyKnockback(origin: Point, knockback: number): void {
    const n = direction(this.x - origin.x, this.z - origin.z)
    this.vx += n.x * knockback * this.data.knockback
    this.vz += n.z * knockback * this.data.knockback
  }

  update(run: Game_NightwardRun, dt: number): void {
    this.age += dt
    this.flash = Math.max(0, this.flash - dt)
    if (this.dead) {
      this.dying -= dt
      return
    }
    if (this.isReaper())
      this.updateBoss(run, dt)
    const moving = this.state === 'walk'
    const n = direction(run.hero.x - this.x, run.hero.z - this.z)
    run.world.move(
      this,
      ((moving ? n.x * this.speed : 0) + this.vx) * dt,
      ((moving ? n.z * this.speed : 0) + this.vz) * dt,
      this.radius,
      this.data.layer,
    )
    this.vx *= Math.exp(-dt * 8)
    this.vz *= Math.exp(-dt * 8)
    run.world.separate(this, dt)
  }

  private updateBoss(run: Game_NightwardRun, dt: number): void {
    const config = run.content.formations.reaper
    this.phase -= dt
    if (this.state === 'rise') {
      if (this.phase <= 0)
        this.state = 'walk'
      return
    }
    if (this.state === 'windup') {
      if (this.phase <= 0) {
        run.weapons.spawnWave(run, this)
        this.state = 'recover'
        this.phase = config.recover
      }
      return
    }
    if (this.state === 'recover') {
      if (this.phase <= 0)
        this.state = 'walk'
      return
    }
    this.swing -= dt
    if (this.swing <= 0 && distance(this, run.hero) < config.range) {
      this.state = 'windup'
      this.phase = config.windup
      this.swing = config.swingEvery
      this.aim = direction(run.hero.x - this.x, run.hero.z - this.z)
      run.emit({ kind: 'windup', x: this.x, z: this.z, side: Math.atan2(this.aim.z, this.aim.x) })
    }
  }
}
