import type { EnemyKey, WeaponKey } from '../../managers/NightwardDataManager'
import type { RunEvent } from '../../objects/Game_NightwardRun'
import type { CombatFxKit, CombatFxPresenter } from './NightwardFxPools'
import { FRAME_DT } from '../../primitives/ui'
import { ballisticPosition, ballisticVelocity, CombatFrame, eventSeed, exposureCompensate, findGroundImpact, FxSeed, smoothstep } from './NightwardFxPools'

const TWO_PI = Math.PI * 2
const HIT_SPARK_BUDGET = 40
const HIT_GLOW_BUDGET = 160
const KILL_FULL_BUDGET = 48
const FRAME_BUDGET_MULTIPLIER = 2
const RELIC_WAVE_SPEED = 60
const DEBRIS_GRAVITY = -16
const DISSOLVE_MIN_SCALE = 0.25

const WEAPON_HIT_COLORS: Record<WeaponKey, number> = {
  lash: 16765562,
  wand: 10275071,
  tomes: 16769178,
  storm: 13678847,
  ward: 16773320,
  flask: 16752704,
}

const ENEMY_CENTER_HEIGHT: Record<EnemyKey, number> = {
  bat: 0.3,
  skeleton: 0.7,
  ghoul: 0.7,
  wraith: 0.65,
  skull: 0.3,
  reaper: 2.5,
}

const ENEMY_WIDTH: Record<EnemyKey, number> = {
  bat: 0.8,
  skeleton: 0.9,
  ghoul: 1,
  wraith: 0.9,
  skull: 0.6,
  reaper: 4,
}

const ENEMY_DEBRIS_PALETTE: Record<EnemyKey, [number, number, number]> = {
  bat: [5913210, 10119880, 16730714],
  skeleton: [15129792, 12103316, 8024674],
  ghoul: [7245390, 4744762, 10532984],
  wraith: [9083600, 13161727, 4871816],
  skull: [15787728, 16751152, 16733208],
  reaper: [3156026, 9075354, 13682912],
}

const ENEMY_DEATH_GLOW: Record<EnemyKey, number> = {
  bat: 14196991,
  skeleton: 16773840,
  ghoul: 13172640,
  wraith: 12112127,
  skull: 16756832,
  reaper: 16736384,
}

const GEM_SMALL_COLOR = 5941503
const GEM_BIG_COLOR = 16732256

/**
 * Handles combat impact feedback: weapon hit flashes/sparks, enemy death shards with
 * ground bounce, elite bursts, relic dissolve waves, and brazier breakage sparks.
 */
export class ImpactFx implements CombatFxPresenter {
  private tick = -1
  private tickHits = 0
  private tickKills = 0
  private frameHits = 0
  private frameKills = 0
  private relicTick = -1
  private relicX = 0
  private relicZ = 0
  private relicTime = 0

  constructor(private kit: CombatFxKit) {}

  beginFrame(): void {
    this.frameHits = 0
    this.frameKills = 0
  }

  onEvent(event: RunEvent): void {
    const tick = Math.round((event.time ?? 0) / FRAME_DT)
    if (tick !== this.tick) {
      this.tick = tick
      this.tickHits = 0
      this.tickKills = 0
    }
    switch (event.kind) {
      case 'hit':
        this.emitHit(event)
        break
      case 'death':
        if (tick === this.relicTick)
          this.emitDissolve(event)
        else
          this.emitKill(event)
        break
      case 'relic':
        this.relicTick = tick
        this.relicX = event.x !== 0 || event.z !== 0 ? event.x : this.kit.run.hero.x
        this.relicZ = event.x !== 0 || event.z !== 0 ? event.z : this.kit.run.hero.z
        this.relicTime = event.time ?? 0
        break
      case 'break':
        this.emitBrazier(event)
        break
    }
  }

  update(): void {}

  reset(): void {
    this.beginFrame()
    this.tick = -1
    this.relicTick = -1
  }

  private resolvePosition(event: RunEvent): { x: number, y: number, z: number } {
    const target = event.target
    const defaultY = target ? ENEMY_CENTER_HEIGHT[target.data.key] : 0.6
    if (event.x !== 0 || event.z !== 0)
      return { x: event.x, y: (event.y ?? 0) > 0 ? event.y! : defaultY, z: event.z }
    if (target) {
      const scale = target.visualScale(this.kit.run.content.config.eliteScale)
      return { x: target.x, y: target.hoverY() + defaultY * scale, z: target.z }
    }
    return { x: 0, y: defaultY, z: 0 }
  }

  private emitHit(event: RunEvent): void {
    if (this.tickHits >= HIT_GLOW_BUDGET || this.frameHits >= HIT_GLOW_BUDGET * FRAME_BUDGET_MULTIPLIER)
      return
    const kit = this.kit
    const heavy = (event.value ?? 0) >= 25
    const weapon = event.weapon
    const color = weapon ? WEAPON_HIT_COLORS[weapon] : 0xFFFFFF
    const weaponSeed = weapon ? weapon.charCodeAt(0) : 0
    const rng = kit.rng.seed(FxSeed.hit, eventSeed(event) * 8 + weaponSeed)
    const pos = this.resolvePosition(event)
    let dx = pos.x - kit.run.hero.x
    let dz = pos.z - kit.run.hero.z
    const dist = Math.hypot(dx, dz) || 1
    dx /= dist
    dz /= dist
    const time = event.time ?? 0

    const glows = kit.glows
    glows.reset(heavy ? CombatFrame.spark : CombatFrame.hotGlow).tint(color, heavy ? 1 : 0.8)
    glows.x = pos.x - dx * 0.1
    glows.y = pos.y
    glows.z = pos.z - dz * 0.1 + 0.1
    glows.birth = time
    glows.life = heavy ? 0.16 : 0.1
    glows.size = heavy ? 0.6 : 0.35
    glows.sizeEnd = heavy ? 1.6 : 0.95
    glows.gravity = 0
    glows.rotation = rng.next() * TWO_PI
    glows.emit()

    this.tickHits++
    this.frameHits++
    if (this.tickHits > HIT_SPARK_BUDGET || this.frameHits > HIT_SPARK_BUDGET * FRAME_BUDGET_MULTIPLIER)
      return

    const sparks = kit.sparks
    const count = 3 + Math.min(10, Math.floor((event.value ?? 0) / 6))
    sparks.reset().tint(color, 1)
    sparks.drag = 2.4
    sparks.gravity = 0.8
    sparks.heatEnd = 0.45
    for (let i = 0; i < count; i++) {
      const speed = rng.range(3, heavy ? 10 : 7)
      const vxDir = dx + rng.signed() * 0.9
      const vzDir = dz + rng.signed() * 0.9
      sparks.x = pos.x
      sparks.y = pos.y + rng.signed() * 0.15
      sparks.z = pos.z + 0.05
      sparks.vx = vxDir * speed
      sparks.vy = rng.range(0, 4.5)
      sparks.vz = vzDir * speed * 0.7
      sparks.birth = time - rng.next() * rng.next() * 0.03
      sparks.life = rng.range(0.16, 0.36)
      sparks.size = rng.range(0.035, 0.065)
      sparks.sizeEnd = 0.025
      sparks.heat = rng.range(1.3, 1.8)
      sparks.emit()
    }
    if (heavy)
      kit.flashes.add(time, pos.x, pos.y + 0.4, pos.z, color, 8, 0.08, 4)
  }

  private emitKill(event: RunEvent): void {
    if (this.tickKills >= KILL_FULL_BUDGET || this.frameKills >= KILL_FULL_BUDGET * FRAME_BUDGET_MULTIPLIER) {
      this.emitDissolve(event)
      return
    }
    this.tickKills++
    this.frameKills++
    const kit = this.kit
    const target = event.target
    const key: EnemyKey = target?.data.key ?? 'bat'
    const elite = !!target?.elite
    const scale = elite ? 1.6 : 1
    const height = ENEMY_CENTER_HEIGHT[key] * scale
    const width = ENEMY_WIDTH[key] * scale
    const palette = ENEMY_DEBRIS_PALETTE[key]
    const glowColor = ENEMY_DEATH_GLOW[key]
    const exposure = kit.view.exposure
    const rng = kit.rng.seed(FxSeed.kill, eventSeed(event))
    const pos = this.resolvePosition(event)
    const time = event.time ?? 0
    const debris = kit.debris
    const glows = kit.glows
    const sparks = kit.sparks

    const shardCount = elite ? 34 : 16
    debris.reset(CombatFrame.shard)
    debris.drag = 0.6
    for (let i = 0; i < shardCount; i++) {
      const color = palette[i % 3]!
      const ox = rng.signed() * width * 0.4
      const oy = rng.signed() * height * 0.8
      const speed = rng.range(1.2, 3.8) * (elite ? 1.3 : 1)
      const angle = rng.next() * TWO_PI
      const jitter = rng.next() * rng.next() * 0.04
      debris.tint(exposureCompensate(color, 0.8, exposure), 1)
      debris.x = pos.x + ox
      debris.y = pos.y + oy
      debris.z = pos.z + 0.05
      debris.vx = Math.cos(angle) * speed + ox * 2
      debris.vy = rng.range(1.5, 5) + oy
      debris.vz = Math.sin(angle) * speed * 0.7
      debris.birth = time - jitter
      debris.size = rng.range(0.06, 0.1) * (elite ? 1.25 : 1)
      debris.sizeEnd = debris.size * 0.8
      debris.rotation = rng.next() * 6
      debris.spin = rng.signed() * 12
      this.emitBouncingShard(rng.range(0.55, 0.9))
    }

    glows.reset(CombatFrame.ember).tint(11067647, 0.9)
    glows.gravity = 0.25
    glows.flicker = 0.5
    for (let i = 0; i < (elite ? 8 : 3); i++) {
      glows.x = pos.x + rng.signed() * width * 0.3
      glows.y = pos.y
      glows.z = pos.z
      glows.vx = rng.signed() * 0.4
      glows.vy = rng.range(0.5, 1.1)
      glows.vz = rng.signed() * 0.2
      glows.birth = time + rng.range(0, 0.12)
      glows.life = rng.range(0.9, 1.5)
      glows.size = rng.range(0.13, 0.18)
      glows.sizeEnd = 0.05
      glows.emit()
    }

    glows.reset(CombatFrame.hotGlow).tint(glowColor, 0.9)
    glows.x = pos.x
    glows.y = pos.y
    glows.z = pos.z + 0.1
    glows.birth = time
    glows.life = 0.14
    glows.size = height * 1.2
    glows.sizeEnd = height * 2.8
    glows.gravity = 0
    glows.emit()

    glows.reset(CombatFrame.spark).tint(elite ? GEM_BIG_COLOR : GEM_SMALL_COLOR, 1)
    glows.x = pos.x
    glows.y = 0.4
    glows.z = pos.z + 0.1
    glows.birth = time + 0.05
    glows.life = 0.32
    glows.size = 0.25
    glows.sizeEnd = 0.9
    glows.spin = 3
    glows.gravity = 0
    glows.emit()

    if (elite) {
      sparks.reset().tint(glowColor, 1)
      sparks.drag = 1.8
      sparks.heatEnd = 0.4
      for (let i = 0; i < 18; i++) {
        const angle = rng.next() * TWO_PI
        const speed = rng.range(4, 10)
        sparks.x = pos.x
        sparks.y = pos.y
        sparks.z = pos.z
        sparks.vx = Math.cos(angle) * speed
        sparks.vy = rng.range(1, 6)
        sparks.vz = Math.sin(angle) * speed * 0.7
        sparks.birth = time - rng.next() * 0.02
        sparks.life = rng.range(0.3, 0.6)
        sparks.size = rng.range(0.05, 0.08)
        sparks.sizeEnd = 0.03
        sparks.heat = rng.range(1.4, 1.8)
        sparks.emit()
      }
      kit.pulses.add(time, pos.x, pos.z, 0.4, 3.2, 0.4, 16756896, 0.9, 0.2)
      kit.flashes.add(time, pos.x, pos.y + 0.6, pos.z, 16740432, 26, 0.15, 7)
      kit.lens.shake(0.12)
    }
  }

  private emitBouncingShard(totalLife: number): void {
    const debris = this.kit.debris
    const accelY = DEBRIS_GRAVITY * debris.gravity
    const impactTime = findGroundImpact(debris.y, debris.vy, accelY, debris.drag, totalLife)
    if (impactTime < 0 || impactTime > totalLife - 0.08) {
      debris.life = totalLife
      debris.emit()
      return
    }
    const { x, z, vx, vy, vz, birth } = debris
    debris.life = impactTime
    debris.emit()
    debris.x = ballisticPosition(impactTime, x, vx, 0, debris.drag)
    debris.z = ballisticPosition(impactTime, z, vz, 0, debris.drag)
    debris.y = 0.02
    debris.vx = ballisticVelocity(impactTime, vx, 0, debris.drag) * 0.45
    debris.vy = Math.abs(ballisticVelocity(impactTime, vy, accelY, debris.drag)) * 0.3
    debris.vz = ballisticVelocity(impactTime, vz, 0, debris.drag) * 0.45
    debris.birth = birth + impactTime
    debris.life = Math.min(0.4, totalLife - impactTime)
    debris.emit()
  }

  private emitDissolve(event: RunEvent): void {
    const kit = this.kit
    const target = event.target
    const key: EnemyKey = target?.data.key ?? 'bat'
    const height = ENEMY_CENTER_HEIGHT[key] * (target?.elite ? 1.6 : 1)
    const palette = ENEMY_DEBRIS_PALETTE[key]
    const exposure = kit.view.exposure
    const rng = kit.rng.seed(FxSeed.relicKill, eventSeed(event))
    const pos = this.resolvePosition(event)
    const time = event.time ?? 0
    const fromRelic = Math.round(time / FRAME_DT) === this.relicTick
    const delay = fromRelic ? Math.hypot(pos.x - this.relicX, pos.z - this.relicZ) / RELIC_WAVE_SPEED : 0
    const birth = (fromRelic ? this.relicTime : time) + delay
    const scale = DISSOLVE_MIN_SCALE + (1 - DISSOLVE_MIN_SCALE) * smoothstep(0.8, 2.2, Math.hypot(pos.x - kit.run.hero.x, pos.z - kit.run.hero.z))

    const glows = kit.glows
    const sparks = kit.sparks
    const debris = kit.debris

    glows.reset(CombatFrame.glow).tint(16769184, 0.4)
    glows.x = pos.x
    glows.y = pos.y
    glows.z = pos.z + 0.1
    glows.birth = birth
    glows.life = 0.36
    glows.size = height * 0.9 * scale
    glows.sizeEnd = height * 1.8 * scale
    glows.gravity = 0
    glows.emit()

    sparks.reset().tint(16771248, 1)
    sparks.x = pos.x + rng.signed() * 0.2
    sparks.y = pos.y
    sparks.z = pos.z
    sparks.vx = rng.signed() * 0.4
    sparks.vy = rng.range(2.5, 4.5)
    sparks.vz = rng.signed() * 0.2
    sparks.birth = birth
    sparks.life = rng.range(0.6, 0.95)
    sparks.size = 0.07 * scale
    sparks.sizeEnd = 0.03
    sparks.heat = 1.5
    sparks.heatEnd = 0.8
    sparks.gravity = -0.35
    sparks.emit()

    glows.reset(CombatFrame.ember).tint(16771232, 0.9)
    glows.gravity = 0.4
    glows.flicker = 0.4
    for (let i = 0; i < 2; i++) {
      glows.x = pos.x + rng.signed() * 0.3
      glows.y = pos.y + rng.signed() * height * 0.5
      glows.z = pos.z
      glows.vx = rng.signed() * 0.5
      glows.vy = rng.range(1, 2.5)
      glows.vz = rng.signed() * 0.3
      glows.birth = birth + rng.range(0, 0.1)
      glows.life = rng.range(0.8, 1.3)
      glows.size = rng.range(0.12, 0.17) * scale
      glows.sizeEnd = 0.04
      glows.emit()
    }

    debris.reset(CombatFrame.shard)
    debris.drag = 0.8
    for (let i = 0; i < 2; i++) {
      const angle = rng.next() * TWO_PI
      const speed = rng.range(1, 2.5)
      debris.tint(exposureCompensate(palette[i]!, 1.1, exposure), 1)
      debris.x = pos.x
      debris.y = pos.y
      debris.z = pos.z + 0.05
      debris.vx = Math.cos(angle) * speed
      debris.vy = rng.range(2, 4)
      debris.vz = Math.sin(angle) * speed * 0.6
      debris.birth = birth
      debris.life = rng.range(0.4, 0.6)
      debris.size = rng.range(0.07, 0.11)
      debris.sizeEnd = debris.size * 0.6
      debris.rotation = rng.next() * 6
      debris.spin = rng.signed() * 10
      debris.emit()
    }
  }

  private emitBrazier(event: RunEvent): void {
    const kit = this.kit
    const rng = kit.rng.seed(FxSeed.brazier, eventSeed(event))
    const sparks = kit.sparks
    const x = event.x
    const y = event.y ?? 0
    const z = event.z
    const time = event.time ?? 0
    sparks.reset().tint(16756832, 1)
    sparks.drag = 1.2
    sparks.heatEnd = 0.35
    for (let i = 0; i < 30; i++) {
      const angle = rng.next() * TWO_PI
      const speed = rng.range(2, 6)
      sparks.x = x
      sparks.y = y + 1
      sparks.z = z
      sparks.vx = Math.cos(angle) * speed
      sparks.vy = rng.range(2, 7)
      sparks.vz = Math.sin(angle) * speed
      sparks.birth = time
      sparks.life = rng.range(0.4, 0.9)
      sparks.size = rng.range(0.04, 0.07)
      sparks.sizeEnd = 0.03
      sparks.heat = rng.range(1.3, 1.7)
      sparks.emit()
    }
    kit.flashes.add(time, x, y + 1.2, z, 16752720, 30, 0.15, 7)
  }
}
