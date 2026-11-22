import type { Animation } from '../../managers/NightwardAssetManager'
import type { RunEvent } from '../../objects/Game_NightwardRun'
import type { CombatFxKit, CombatFxPresenter } from './NightwardFxPools'
import { NightwardDataManager } from '../../managers/NightwardDataManager'
import { clamp01, CombatFrame, eventSeed, exposureCompensate, flickerNoise, FxSeed } from './NightwardFxPools'

const TWO_PI = Math.PI * 2

interface LashPoint {
  x: number
  y: number
  z: number
  nx: number
  ny: number
  nz: number
  tx: number
  tz: number
}

const LASH_SLOTS = 6
const LASH_SWING_TIME = 0.12
const LASH_LIFE = 0.36
const LASH_HALF_ANGLE = 1.85
const LASH_SEGMENTS = 16
const LASH_OUTER_COLOR = 16742936
const LASH_MID_COLOR = 16762976
const LASH_CORE_COLOR = 16774880

function sampleLashArc(out: LashPoint, ox: number, oz: number, side: number, reach: number, halfHeight: number, t: number): void {
  const angle = LASH_HALF_ANGLE - 2 * LASH_HALF_ANGLE * t
  const rx = reach * 0.88
  const rz = Math.max(0.6, halfHeight * 1.15)
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  let nx = side * cos / rx
  let nz = -sin / rz
  const nLen = Math.hypot(nx, nz) || 1
  nx /= nLen
  nz /= nLen
  out.x = ox + side * reach * 0.12 + side * rx * cos
  out.y = 0.85 + 0.25 * sin
  out.z = oz - rz * sin
  out.nx = nx
  out.ny = 0
  out.nz = nz
  let tx = side * rx * sin
  let tz = rz * cos
  const tLen = Math.hypot(tx, tz) || 1
  tx /= tLen
  tz /= tLen
  out.tx = tx
  out.tz = tz
}

/** Whip-arc ribbon, spark spray, and ground glow for Lash. */
export class LashFx implements CombatFxPresenter {
  private swings: { time: number, side: number, reach: number, halfHeight: number }[] = []
  private point: LashPoint = { x: 0, y: 0, z: 0, nx: 0, ny: 0, nz: 0, tx: 0, tz: 0 }
  private cursor = 0

  constructor(private kit: CombatFxKit) {
    this.reset()
  }

  onEvent(event: RunEvent): void {
    if (event.kind !== 'lash')
      return
    const side = (event.side ?? 1) < 0 ? -1 : 1
    const reach = (event.value ?? 0) > 0 ? event.value! : 3
    const halfHeight = (event.extra ?? 0) > 0 ? event.extra! : 0.8
    this.swings[this.cursor] = { time: event.time ?? 0, side, reach, halfHeight }
    this.cursor = (this.cursor + 1) % LASH_SLOTS
    this.emitSparks(event, side, reach, halfHeight)
  }

  update(worldTime: number): void {
    for (const swing of this.swings) {
      const age = worldTime - swing.time
      if (swing.reach > 0 && age >= 0 && age <= LASH_LIFE)
        this.drawArc(age, swing.side, swing.reach, swing.halfHeight)
    }
  }

  reset(): void {
    this.swings = Array.from({ length: LASH_SLOTS }, () => ({ time: 0, side: 1, reach: 0, halfHeight: 0 }))
    this.cursor = 0
  }

  private drawArc(age: number, side: number, reach: number, halfHeight: number): void {
    const kit = this.kit
    const head = 1 - (1 - clamp01(age / LASH_SWING_TIME)) ** 3
    const tailRaw = clamp01((age - 0.035) / 0.27)
    const tail = tailRaw * tailRaw * (3 - 2 * tailRaw)
    const span = head - tail
    if (span < 0.01)
      return
    const fade = 1 - clamp01((age - 0.08) / (LASH_LIFE - 0.08)) ** 1.4
    const maxWidth = 0.7 + reach * 0.1
    const heroX = kit.run.hero.x
    const heroZ = kit.run.hero.z
    const pt = this.point
    const beams = kit.beams
    let prevX = 0
    let prevY = 0
    let prevZ = 0
    let prevCoreX = 0
    let prevCoreY = 0
    let prevCoreZ = 0
    let prevWidth = 0
    for (let i = 0; i <= LASH_SEGMENTS; i++) {
      const u = i / LASH_SEGMENTS
      const arcT = tail + span * u
      const profile = Math.sin(Math.PI * u ** 1.6) ** 0.7
      sampleLashArc(pt, heroX, heroZ, side, reach, halfHeight, arcT)
      const width = maxWidth * profile
      const coreX = pt.x + pt.nx * width * 0.32
      const coreY = pt.y + pt.ny * width * 0.32
      const coreZ = pt.z + pt.nz * width * 0.32
      if (i > 0) {
        const prevAlpha = fade * Math.sin(Math.PI * ((i - 1) / LASH_SEGMENTS) ** 1.6) ** 0.7
        const alpha = fade * profile
        beams.segment(prevX, prevY, prevZ, pt.x, pt.y, pt.z, prevWidth * 2.2, width * 2.2, LASH_OUTER_COLOR, 0.32 * prevAlpha, LASH_OUTER_COLOR, 0.32 * alpha)
        beams.segment(prevX, prevY, prevZ, pt.x, pt.y, pt.z, prevWidth, width, LASH_MID_COLOR, 0.7 * prevAlpha, LASH_MID_COLOR, 0.7 * alpha)
        beams.segment(prevCoreX, prevCoreY, prevCoreZ, coreX, coreY, coreZ, prevWidth * 0.3, width * 0.3, LASH_CORE_COLOR, prevAlpha, LASH_CORE_COLOR, alpha)
      }
      prevX = pt.x
      prevY = pt.y
      prevZ = pt.z
      prevCoreX = coreX
      prevCoreY = coreY
      prevCoreZ = coreZ
      prevWidth = width
    }
    sampleLashArc(pt, heroX, heroZ, side, reach, halfHeight, head)
    kit.lights.set(pt.x, 1.1, pt.z, 16760944, 16 * fade, 5.5)
    kit.ground.add(heroX + side * reach * 0.55, 0.05, heroZ, reach * 1.7, 16752704, 0.2 * fade, 0, CombatFrame.glow)
  }

  private emitSparks(event: RunEvent, side: number, reach: number, halfHeight: number): void {
    const kit = this.kit
    const rng = kit.rng.seed(FxSeed.lash, eventSeed(event))
    const sparks = kit.sparks
    const glows = kit.glows
    const pt = this.point
    const ox = event.x !== 0 || event.z !== 0 ? event.x : kit.run.hero.x
    const oz = event.x !== 0 || event.z !== 0 ? event.z : kit.run.hero.z
    const time = event.time ?? 0
    sparks.reset().tint(16769704, 1)
    sparks.drag = 2.2
    sparks.gravity = 0.7
    sparks.heatEnd = 0.45
    for (let i = 0; i < 26; i++) {
      const arcT = rng.range(0.05, 0.95)
      const tangentSpeed = rng.range(4, 9.5)
      const outwardSpeed = rng.range(1, 3)
      sampleLashArc(pt, ox, oz, side, reach, halfHeight, arcT)
      sparks.x = pt.x + pt.nx * 0.15
      sparks.y = pt.y
      sparks.z = pt.z + pt.nz * 0.15
      sparks.vx = pt.tx * tangentSpeed + pt.nx * outwardSpeed
      sparks.vy = rng.range(0.5, 3)
      sparks.vz = pt.tz * tangentSpeed + pt.nz * outwardSpeed
      sparks.birth = time + LASH_SWING_TIME * (1 - Math.cbrt(1 - arcT))
      sparks.life = rng.range(0.22, 0.45)
      sparks.size = rng.range(0.045, 0.08)
      sparks.sizeEnd = sparks.size * 0.6
      sparks.heat = rng.range(1.4, 1.8)
      sparks.emit()
    }
    glows.reset(CombatFrame.spark).tint(16773328, 0.9)
    glows.gravity = 0
    for (let i = 0; i < 5; i++) {
      const arcT = 0.15 + i * 0.17 + rng.range(-0.05, 0.05)
      sampleLashArc(pt, ox, oz, side, reach, halfHeight, arcT)
      glows.x = pt.x + pt.nx * 0.2
      glows.y = pt.y
      glows.z = pt.z + pt.nz * 0.2
      glows.vx = pt.tx * 1.5
      glows.vy = 0
      glows.vz = pt.tz * 1.5
      glows.birth = time + LASH_SWING_TIME * (1 - Math.cbrt(1 - arcT))
      glows.life = 0.18
      glows.size = rng.range(0.5, 0.75)
      glows.sizeEnd = 0.08
      glows.rotation = rng.next() * Math.PI
      glows.spin = 6
      glows.emit()
    }
  }
}

const WAND_MAX_LIGHTS = 4
const WAND_EMBER_RATE = 60
const WAND_TRAIL_SEGMENTS = 5
const WAND_TRAIL_MAX_LENGTH = 1.9
const WAND_CORE_COLOR = 15660799
const WAND_MID_COLOR = 6990079
const WAND_OUTER_COLOR = 2377983

/** Wisp Wand bolt glow, ribbon trail, muzzle flash, and hit burst. */
export class WandFx implements CombatFxPresenter {
  constructor(private kit: CombatFxKit) {}

  onEvent(event: RunEvent): void {
    if (event.kind === 'wand')
      this.emitMuzzle(event)
    else if (event.kind === 'hit' && event.weapon === 'wand')
      this.emitImpact(event)
  }

  update(worldTime: number, prevWorldTime: number): void {
    const kit = this.kit
    const spin = worldTime * 7
    let litCount = 0
    for (const projectile of kit.run.projectiles) {
      if (projectile.kind !== 'bolt')
        continue
      const { x, y, z, vx, vy, vz, age, id } = projectile
      const speed = Math.hypot(vx, vy, vz) || 1
      const ramp = Math.max(0.35, clamp01(Math.hypot(x - kit.run.hero.x, z - kit.run.hero.z) / 1.5))
      kit.sprites.add(x, y, z, 1.35 * ramp, WAND_MID_COLOR, 0.42, 0, CombatFrame.glow)
      kit.sprites.add(x, y, z, 0.42 * ramp, WAND_CORE_COLOR, 1, 0, CombatFrame.hotGlow)
      kit.sprites.add(x, y, z, 0.9 * ramp, 12114175, 0.45, spin + id, CombatFrame.spark)
      this.drawTrail(x, y, z, vx / speed, vy / speed, vz / speed, Math.min(WAND_TRAIL_MAX_LENGTH, age * speed))
      this.emitEmbers(id, x, y, z, vx, vy, vz, age, prevWorldTime, worldTime)
      if (litCount < WAND_MAX_LIGHTS && ramp >= 0.5) {
        kit.lights.set(x, y, z, 8368383, 6 * ramp * ramp, 4.5)
        litCount++
      }
    }
  }

  reset(): void {}

  private drawTrail(x: number, y: number, z: number, dx: number, dy: number, dz: number, length: number): void {
    if (length < 0.05)
      return
    const beams = this.kit.beams
    let px = x
    let py = y
    let pz = z
    for (let i = 1; i <= WAND_TRAIL_SEGMENTS; i++) {
      const f0 = (i - 1) / WAND_TRAIL_SEGMENTS
      const f1 = i / WAND_TRAIL_SEGMENTS
      const nx = x - dx * length * f1
      const ny = y - dy * length * f1
      const nz = z - dz * length * f1
      const a0 = 1 - f0
      const a1 = 1 - f1
      beams.segment(px, py, pz, nx, ny, nz, 0.75 * a0 + 0.08, 0.75 * a1 + 0.08, WAND_OUTER_COLOR, 0.3 * a0, WAND_OUTER_COLOR, 0.3 * a1)
      beams.segment(px, py, pz, nx, ny, nz, 0.24 * a0 + 0.02, 0.24 * a1 + 0.02, f0 < 0.2 ? WAND_CORE_COLOR : WAND_MID_COLOR, 0.9 * a0 * a0, WAND_MID_COLOR, 0.9 * a1 * a1)
      px = nx
      py = ny
      pz = nz
    }
  }

  private emitEmbers(id: number, x: number, y: number, z: number, vx: number, vy: number, vz: number, age: number, prevTime: number, worldTime: number): void {
    const kit = this.kit
    const glows = kit.glows
    const startStep = Math.max(Math.floor(prevTime * WAND_EMBER_RATE) + 1, Math.ceil((worldTime - age) * WAND_EMBER_RATE))
    const endStep = Math.floor(worldTime * WAND_EMBER_RATE)
    for (let step = startStep; step <= endStep; step++) {
      const birth = step / WAND_EMBER_RATE
      const elapsed = worldTime - birth
      const rng = kit.rng.seed(FxSeed.wandTrail, step * 256 + (id & 255))
      glows.reset(CombatFrame.ember).tint(11062527, 0.85)
      glows.x = x - vx * elapsed + rng.signed() * 0.06
      glows.y = y - vy * elapsed + rng.signed() * 0.06
      glows.z = z - vz * elapsed + rng.signed() * 0.06
      glows.vx = rng.signed() * 0.6 - vx * 0.05
      glows.vy = rng.signed() * 0.6
      glows.vz = rng.signed() * 0.6 - vz * 0.05
      glows.birth = birth
      glows.life = rng.range(0.25, 0.45)
      glows.size = rng.range(0.08, 0.13)
      glows.sizeEnd = 0.02
      glows.gravity = 0.1
      glows.flicker = 0.4
      glows.emit()
    }
  }

  private emitMuzzle(event: RunEvent): void {
    const projectile = event.projectile
    if (!projectile)
      return
    const kit = this.kit
    const rng = kit.rng.seed(FxSeed.wand, eventSeed(event))
    const { x, y, z, vx, vy, vz } = projectile
    const len = Math.hypot(vx, vy, vz) || 1
    const dx = vx / len
    const dy = vy / len
    const dz = vz / len
    const time = event.time ?? 0
    const glows = kit.glows
    const sparks = kit.sparks
    glows.reset(CombatFrame.hotGlow).tint(14215423, 1)
    glows.x = x + dx * 0.5
    glows.y = y + dy * 0.5
    glows.z = z + dz * 0.5
    glows.birth = time
    glows.life = 0.12
    glows.size = 0.25
    glows.sizeEnd = 0.6
    glows.gravity = 0
    glows.emit()
    sparks.reset().tint(13164799, 1)
    sparks.drag = 3
    sparks.gravity = 0.3
    sparks.heatEnd = 0.6
    for (let i = 0; i < 6; i++) {
      const speed = rng.range(4, 8)
      sparks.x = x
      sparks.y = y
      sparks.z = z
      sparks.vx = dx * speed + rng.signed() * 2
      sparks.vy = dy * speed + rng.signed() * 2
      sparks.vz = dz * speed + rng.signed() * 2
      sparks.birth = time
      sparks.life = rng.range(0.12, 0.25)
      sparks.size = 0.05
      sparks.sizeEnd = 0.03
      sparks.heat = 1.6
      sparks.emit()
    }
  }

  private emitImpact(event: RunEvent): void {
    const kit = this.kit
    const rng = kit.rng.seed(FxSeed.wand, eventSeed(event) + 1)
    const x = event.x
    const y = (event.y ?? 0) > 0 ? event.y! : 0.6
    const z = event.z
    const time = event.time ?? 0
    const dist = Math.hypot(x - kit.run.hero.x, z - kit.run.hero.z)
    const scale = 0.35 + 0.65 * clamp01(dist / 1.5)
    const flashScale = clamp01(dist / 3)
    const sparks = kit.sparks
    const glows = kit.glows
    sparks.reset().tint(12639487, 1)
    sparks.drag = 2
    sparks.gravity = 0.8
    sparks.heatEnd = 0.5
    for (let i = 0; i < 12; i++) {
      const angle = rng.next() * TWO_PI
      const speed = rng.range(3, 8)
      sparks.x = x
      sparks.y = y
      sparks.z = z + 0.05
      sparks.vx = Math.cos(angle) * speed
      sparks.vy = rng.range(-1, 5)
      sparks.vz = Math.sin(angle) * speed * 0.6
      sparks.birth = time - rng.next() * rng.next() * 0.03
      sparks.life = rng.range(0.18, 0.38)
      sparks.size = rng.range(0.04, 0.07)
      sparks.sizeEnd = 0.03
      sparks.heat = rng.range(1.3, 1.7)
      sparks.emit()
    }
    glows.reset(CombatFrame.hotGlow).tint(14216447, 1)
    glows.x = x
    glows.y = y
    glows.z = z + 0.1
    glows.birth = time
    glows.life = 0.16
    glows.size = 0.5 * scale
    glows.sizeEnd = 1.5 * scale
    glows.gravity = 0
    glows.emit()
    glows.reset(CombatFrame.ring).tint(9091327, 0.7)
    glows.x = x
    glows.y = y
    glows.z = z + 0.1
    glows.birth = time
    glows.life = 0.22
    glows.size = 0.3 * scale
    glows.sizeEnd = 1.6 * scale
    glows.gravity = 0
    glows.emit()
    kit.flashes.add(time, x, y + 0.3, z, 9091327, 9 * flashScale * flashScale, 0.1, 4.5)
  }
}

const TOMES_RIBBON_ARC = 1.15
const TOMES_RIBBON_OFFSET = 0.16
const TOMES_RIBBON_SEGMENTS = 9
const TOMES_FLAME_RATE = 45
const TOMES_HEIGHT = 0.95
const TOMES_DEFAULT_SPIN = 3.4

/** Orbiting Holy Tomes book sprites, fiery ribbons, trail puffs, and summon burst. */
export class TomesFx implements CombatFxPresenter {
  private spin = TOMES_DEFAULT_SPIN

  constructor(private kit: CombatFxKit, private animation: Animation, private artGroup: number) {}

  onEvent(event: RunEvent): void {
    if (event.kind === 'tomes')
      this.emitBurst(event)
  }

  update(worldTime: number, prevWorldTime: number): void {
    const kit = this.kit
    const tomes = kit.run.tomes
    const weapon = kit.run.weapon('tomes')
    if (weapon)
      this.spin = NightwardDataManager.weaponData(weapon).spin ?? TOMES_DEFAULT_SPIN
    const fade = tomes.fade
    if (fade <= 0.01 || tomes.count <= 0)
      return
    const count = tomes.count
    const radius = tomes.radius
    const baseAngle = tomes.angle
    const heroX = kit.run.hero.x
    const heroZ = kit.run.hero.z
    const tint = exposureCompensate(16767120, 0.9, kit.view.exposure)
    const anim = this.animation
    kit.ground.add(heroX, 0.05, heroZ, radius * 2 / 0.86, 16762976, 0.22 * fade, 0, CombatFrame.ring)
    kit.ground.add(heroX, 0.05, heroZ, radius * 2.6, 16756800, 0.07 * fade, 0, CombatFrame.halo)
    kit.lights.set(heroX, 3.6, heroZ, 16764016, 5 * fade, radius + 3.5)
    for (let i = 0; i < count; i++) {
      const angle = baseAngle + i * TWO_PI / count
      const x = heroX + Math.cos(angle) * radius
      const z = heroZ + Math.sin(angle) * radius
      const y = TOMES_HEIGHT + 0.07 * Math.sin(worldTime * 5 + i * 1.7)
      const frameIndex = Math.floor(worldTime * anim.fps + i) % anim.textures.length
      const size = Math.max(anim.width, anim.height) * (0.6 + 0.4 * fade)
      this.drawRibbon(heroX, heroZ, radius, angle, y, fade)
      kit.sprites.add(x, y - 0.1, z - 0.3, 1.3, 16760928, 0.26 * fade, 0, CombatFrame.glow)
      kit.art.add(x, y, z - 0.02, size, tint, Math.sin(worldTime * 3 + i) * 0.25, kit.art.frameOf(this.artGroup, frameIndex))
      this.emitFlames(i, count, heroX, heroZ, radius, baseAngle, fade, prevWorldTime, worldTime)
    }
  }

  reset(): void {
    this.spin = TOMES_DEFAULT_SPIN
  }

  private drawRibbon(cx: number, cz: number, radius: number, angle: number, y: number, fade: number): void {
    const beams = this.kit.beams
    const dir = this.spin >= 0 ? -1 : 1
    const startAngle = angle + dir * TOMES_RIBBON_OFFSET
    let px = cx + Math.cos(startAngle) * radius
    let pz = cz + Math.sin(startAngle) * radius
    for (let i = 1; i <= TOMES_RIBBON_SEGMENTS; i++) {
      const f0 = (i - 1) / TOMES_RIBBON_SEGMENTS
      const f1 = i / TOMES_RIBBON_SEGMENTS
      const a1 = startAngle + dir * TOMES_RIBBON_ARC * f1
      const nx = cx + Math.cos(a1) * radius
      const nz = cz + Math.sin(a1) * radius
      const alpha0 = (1 - f0) * fade
      const alpha1 = (1 - f1) * fade
      const color0 = f0 < 0.2 ? 16773312 : f0 < 0.55 ? 16752688 : 13647888
      const color1 = f1 < 0.2 ? 16773312 : f1 < 0.55 ? 16752688 : 13647888
      beams.segment(px, y, pz, nx, y, nz, 0.9 * (1 - f0) + 0.1, 0.9 * (1 - f1) + 0.1, 16744480, 0.16 * alpha0, 16736272, 0.16 * alpha1)
      beams.segment(px, y, pz, nx, y, nz, 0.34 * (1 - f0) + 0.04, 0.34 * (1 - f1) + 0.04, color0, 0.75 * alpha0, color1, 0.75 * alpha1)
      px = nx
      pz = nz
    }
  }

  private emitFlames(index: number, count: number, cx: number, cz: number, radius: number, baseAngle: number, fade: number, prevTime: number, worldTime: number): void {
    const kit = this.kit
    const flames = kit.flames
    const startStep = Math.floor(prevTime * TOMES_FLAME_RATE) + 1
    const endStep = Math.floor(worldTime * TOMES_FLAME_RATE)
    const dir = this.spin >= 0 ? -1 : 1
    for (let step = startStep; step <= endStep; step++) {
      const birth = step / TOMES_FLAME_RATE
      const rng = kit.rng.seed(FxSeed.tomesTrail, step * 16 + index)
      if (rng.next() > fade)
        continue
      const angle = baseAngle - this.spin * (worldTime - birth) + index * TWO_PI / count + dir * TOMES_RIBBON_OFFSET
      const tx = -Math.sin(angle) * dir
      const tz = Math.cos(angle) * dir
      flames.reset(CombatFrame.puff).tint(16765072, 0.9)
      flames.x = cx + Math.cos(angle) * radius + rng.signed() * 0.08
      flames.y = TOMES_HEIGHT + rng.signed() * 0.08
      flames.z = cz + Math.sin(angle) * radius + rng.signed() * 0.08
      flames.vx = tx * 1.2 + rng.signed() * 0.4
      flames.vy = rng.range(0.3, 1)
      flames.vz = tz * 1.2 + rng.signed() * 0.4
      flames.birth = birth
      flames.life = rng.range(0.28, 0.48)
      flames.size = rng.range(0.1, 0.16)
      flames.sizeEnd = rng.range(0.28, 0.4)
      flames.heat = rng.range(1.2, 1.5)
      flames.heatEnd = 0.2
      flames.drag = 2
      flames.gravity = 0.3
      flames.rotation = rng.next() * TWO_PI
      flames.spin = rng.signed() * 3
      flames.emit()
    }
  }

  private emitBurst(event: RunEvent): void {
    const kit = this.kit
    const tomes = kit.run.tomes
    const count = Math.max(1, event.value || tomes.count)
    const radius = tomes.radius > 0 ? tomes.radius : 2
    const heroX = kit.run.hero.x
    const heroZ = kit.run.hero.z
    const time = event.time ?? 0
    const rng = kit.rng.seed(FxSeed.tomes, eventSeed(event))
    const sparks = kit.sparks
    const glows = kit.glows
    sparks.reset().tint(16770728, 1)
    sparks.drag = 2.5
    sparks.gravity = 0.6
    sparks.heatEnd = 0.5
    glows.reset(CombatFrame.hotGlow)
    for (let i = 0; i < count; i++) {
      const angle = tomes.angle + i * TWO_PI / count
      const x = heroX + Math.cos(angle) * radius
      const z = heroZ + Math.sin(angle) * radius
      for (let p = 0; p < 10; p++) {
        const dir = rng.next() * TWO_PI
        const speed = rng.range(2.5, 6)
        sparks.x = x
        sparks.y = TOMES_HEIGHT
        sparks.z = z
        sparks.vx = Math.cos(dir) * speed
        sparks.vy = rng.range(0, 4)
        sparks.vz = Math.sin(dir) * speed
        sparks.birth = time
        sparks.life = rng.range(0.25, 0.45)
        sparks.size = rng.range(0.04, 0.07)
        sparks.sizeEnd = 0.03
        sparks.heat = rng.range(1.3, 1.7)
        sparks.emit()
      }
      glows.tint(16773320, 1)
      glows.x = x
      glows.y = TOMES_HEIGHT
      glows.z = z
      glows.birth = time
      glows.life = 0.22
      glows.size = 0.6
      glows.sizeEnd = 2
      glows.gravity = 0
      glows.emit()
    }
    kit.pulses.add(time, heroX, heroZ, 0.4, radius * 1.3, 0.42, 16767120, 0.85)
    kit.flashes.add(time, heroX, 3.2, heroZ, 16765056, 14, 0.18, radius + 5)
  }
}

const STORM_SLOTS = 16
const STORM_BOLT_LIFE = 0.34
const STORM_SCORCH_LIFE = 2.2
const STORM_MAIN_POINTS = 14
const STORM_FORK_COUNT = 3
const STORM_FORK_POINTS = 5
const STORM_SKY_HEIGHT = 13
const STORM_OUTER_COLOR = 9068799
const STORM_MID_COLOR = 13152511
const STORM_CORE_COLOR = 16777215
const STORM_HERO_CLEAR_RADIUS = 1.5
const STORM_NEAR_HERO_SCALE = 0.35

/** Sky-to-ground forked lightning strikes, scorch decals, bursts, and lens flashes for Storm Ring. */
export class StormFx implements CombatFxPresenter {
  private strikes: { time: number, x: number, z: number, radius: number, seed: number }[] = []
  private mainPath = new Float32Array(STORM_MAIN_POINTS * 3)
  private branchPath = new Float32Array(STORM_FORK_POINTS * 3)
  private cursor = 0
  private brightnessShare = 1

  constructor(private kit: CombatFxKit) {
    this.reset()
  }

  onEvent(event: RunEvent): void {
    if (event.kind !== 'lightning')
      return
    const radius = (event.value ?? 0) > 0 ? event.value! : 1.6
    const seed = eventSeed(event)
    const time = event.time ?? 0
    this.strikes[this.cursor] = { time, x: event.x, z: event.z, radius, seed: seed & 0xFFFFFF }
    this.cursor = (this.cursor + 1) % STORM_SLOTS
    this.emitBurst(event, radius, seed)
    this.kit.lens.flash(0.06, 14208255, 18)
    this.kit.lens.shake(0.16)
    this.kit.pulses.add(time, event.x, event.z, 0.3, radius * 1.6, 0.36, 14205183, 1.1, 0.22)
    this.kit.pulses.add(time + 0.05, event.x, event.z, 0.2, radius * 1.05, 0.5, 10121471, 0.6)
  }

  update(worldTime: number, _prevWorldTime: number, warp: number): void {
    const timeScale = Math.min(1, 0.35 + warp)
    let activeBolts = 0
    for (const strike of this.strikes) {
      const age = worldTime - strike.time
      if (strike.radius > 0 && age >= 0 && age / timeScale <= STORM_BOLT_LIFE)
        activeBolts++
    }
    this.brightnessShare = activeBolts > 1 ? 1 / Math.sqrt(activeBolts) : 1
    for (const strike of this.strikes) {
      const age = worldTime - strike.time
      if (strike.radius > 0 && age >= 0 && age <= STORM_SCORCH_LIFE)
        this.drawStrike(age, timeScale, strike.x, strike.z, strike.radius, strike.seed)
    }
  }

  reset(): void {
    this.strikes = Array.from({ length: STORM_SLOTS }, () => ({ time: 0, x: 0, z: 0, radius: 0, seed: 0 }))
    this.cursor = 0
  }

  private drawStrike(age: number, timeScale: number, x: number, z: number, radius: number, seed: number): void {
    const kit = this.kit
    const fade = 1 - clamp01((age - 1.1) / (STORM_SCORCH_LIFE - 1.1))
    kit.decals.add(x, 0.04, z, radius * 2.3, exposureCompensate(2628656, 0.5, kit.view.exposure), 0.9 * fade, seed, CombatFrame.scorch)
    kit.ground.add(x, 0.05, z, radius * 1.5, 16738864, 0.5 * Math.exp(-age / 0.45), 0, CombatFrame.glow)
    kit.ground.add(x, 0.05, z, radius * 2.8, 10121471, 0.4 * Math.exp(-age / 0.2), 0, CombatFrame.glow)
    const scaled = age / timeScale
    if (scaled > STORM_BOLT_LIFE)
      return
    const intensity = scaled < 0.06 ? 1 : scaled < 0.1 ? 0.12 : scaled < 0.2 ? 0.95 : 0.7 * (1 - (scaled - 0.2) / (STORM_BOLT_LIFE - 0.2))
    const variant = scaled < 0.1 ? 0 : 1
    const share = this.brightnessShare
    const dx = x - kit.run.hero.x
    const dz = z - kit.run.hero.z
    const nearHero = dx * dx + dz * dz < STORM_HERO_CLEAR_RADIUS * STORM_HERO_CLEAR_RADIUS
    this.drawBolt(x, z, seed, variant, intensity, nearHero ? STORM_NEAR_HERO_SCALE : 1)
    if (!nearHero) {
      kit.sprites.add(x, 0.35, z, 0.7 * share, STORM_CORE_COLOR, 0.7 * intensity, 0, CombatFrame.hotGlow)
      kit.sprites.add(x, 0.8, z, 1.8, STORM_OUTER_COLOR, 0.1 * intensity, 0, CombatFrame.glow)
      kit.lens.flare(x, 0.4, z, STORM_MID_COLOR, 0.3 * intensity)
    }
    kit.lights.set(x, 2.2, z, 13482239, 12 * intensity * share, 6)
    kit.lens.lightning(0.15 * intensity * share * (nearHero ? 0.5 : 1))
  }

  private drawBolt(x: number, z: number, seed: number, variant: number, intensity: number, scale: number): void {
    const rng = this.kit.rng.seed(FxSeed.storm, seed * 2 + variant)
    const path = this.mainPath
    const topX = x + rng.signed() * 2.5
    const topZ = z - rng.range(1.5, 3.5)
    let jitterX = 0
    let jitterZ = 0
    for (let i = 0; i < STORM_MAIN_POINTS; i++) {
      const t = i / (STORM_MAIN_POINTS - 1)
      path[i * 3] = topX + (x - topX) * t + jitterX
      path[i * 3 + 1] = STORM_SKY_HEIGHT * (1 - t)
      path[i * 3 + 2] = topZ + (z - topZ) * t + jitterZ
      jitterX += rng.signed() * 0.75 * (1 - t * 0.6)
      jitterZ += rng.signed() * 0.35
    }
    const errX = path[(STORM_MAIN_POINTS - 1) * 3]! - x
    const errZ = path[(STORM_MAIN_POINTS - 1) * 3 + 2]! - z
    for (let i = 0; i < STORM_MAIN_POINTS; i++) {
      const t = i / (STORM_MAIN_POINTS - 1)
      path[i * 3] = path[i * 3]! - errX * t
      path[i * 3 + 2] = path[i * 3 + 2]! - errZ * t
    }
    this.drawStrip(path, STORM_MAIN_POINTS, 2.2 * scale, 0.7 * scale, 0.2 * scale, intensity * scale)
    for (let i = 0; i < STORM_FORK_COUNT; i++)
      this.drawFork(rng, intensity * scale, scale)
  }

  private drawFork(rng: CombatFxKit['rng'], intensity: number, scale: number): void {
    const main = this.mainPath
    const branch = this.branchPath
    const startIndex = 3 + Math.floor(rng.next() * (STORM_MAIN_POINTS - 7))
    const side = rng.next() < 0.5 ? -1 : 1
    let bx = main[startIndex * 3]!
    let by = main[startIndex * 3 + 1]!
    let bz = main[startIndex * 3 + 2]!
    for (let i = 0; i < STORM_FORK_POINTS; i++) {
      branch[i * 3] = bx
      branch[i * 3 + 1] = by
      branch[i * 3 + 2] = bz
      bx += side * rng.range(0.4, 1.1)
      by = Math.max(0.2, by - rng.range(0.5, 1.2))
      bz += rng.signed() * 0.4
    }
    this.drawStrip(branch, STORM_FORK_POINTS, 1.2 * scale, 0.38 * scale, 0.1 * scale, intensity * 0.75)
  }

  private drawStrip(points: Float32Array, count: number, outerW: number, midW: number, coreW: number, alpha: number): void {
    const beams = this.kit.beams
    for (let i = 1; i < count; i++) {
      const a = (i - 1) * 3
      const b = i * 3
      const taperA = count > 2 ? 1 - (i - 1) / (count - 1) * 0.35 : 1
      const taperB = count > 2 ? 1 - i / (count - 1) * 0.35 : 1
      const ax = points[a]!
      const ay = points[a + 1]!
      const az = points[a + 2]!
      const bx = points[b]!
      const by = points[b + 1]!
      const bz = points[b + 2]!
      beams.segment(ax, ay, az, bx, by, bz, outerW * taperA, outerW * taperB, STORM_OUTER_COLOR, 0.32 * alpha, STORM_OUTER_COLOR, 0.32 * alpha)
      beams.segment(ax, ay, az, bx, by, bz, midW * taperA, midW * taperB, STORM_MID_COLOR, 0.7 * alpha, STORM_MID_COLOR, 0.7 * alpha)
      beams.segment(ax, ay, az, bx, by, bz, coreW, coreW, STORM_CORE_COLOR, alpha, STORM_CORE_COLOR, alpha)
    }
  }

  private emitBurst(event: RunEvent, radius: number, seed: number): void {
    const kit = this.kit
    const rng = kit.rng.seed(FxSeed.storm, seed * 2 + 7)
    const sparks = kit.sparks
    const debris = kit.debris
    const glows = kit.glows
    const { x, z } = event
    const time = event.time ?? 0
    sparks.reset().tint(14733567, 1)
    sparks.drag = 1.2
    sparks.heatEnd = 0.55
    for (let i = 0; i < 34; i++) {
      const angle = rng.next() * TWO_PI
      const speed = rng.range(3, 9) * (0.6 + radius * 0.25)
      sparks.x = x
      sparks.y = 0.15
      sparks.z = z
      sparks.vx = Math.cos(angle) * speed
      sparks.vy = rng.range(2, 7.5)
      sparks.vz = Math.sin(angle) * speed
      sparks.birth = time - rng.next() * rng.next() * 0.03
      sparks.life = rng.range(0.35, 0.8)
      sparks.size = rng.range(0.05, 0.09)
      sparks.sizeEnd = 0.03
      sparks.heat = rng.range(1.3, 1.8)
      sparks.emit()
    }
    debris.reset(CombatFrame.shard).tint(exposureCompensate(3813416, 0.9, kit.view.exposure), 1)
    debris.drag = 0.5
    for (let i = 0; i < 12; i++) {
      const angle = rng.next() * TWO_PI
      const speed = rng.range(1.5, 4.5)
      debris.x = x + Math.cos(angle) * 0.2
      debris.y = 0.1
      debris.z = z + Math.sin(angle) * 0.2
      debris.vx = Math.cos(angle) * speed
      debris.vy = rng.range(3, 6.5)
      debris.vz = Math.sin(angle) * speed
      debris.birth = time
      debris.life = rng.range(0.55, 0.8)
      debris.size = rng.range(0.07, 0.13)
      debris.sizeEnd = debris.size
      debris.rotation = rng.next() * 6
      debris.spin = rng.signed() * 14
      debris.emit()
    }
    glows.reset(CombatFrame.ember).tint(STORM_MID_COLOR, 0.9)
    glows.flicker = 0.8
    glows.drag = 1.5
    glows.gravity = 0.25
    for (let i = 0; i < 14; i++) {
      const angle = rng.next() * TWO_PI
      const dist = rng.range(0.1, radius)
      glows.x = x + Math.cos(angle) * dist
      glows.y = rng.range(0.1, 0.6)
      glows.z = z + Math.sin(angle) * dist
      glows.vx = rng.signed() * 0.6
      glows.vy = rng.range(0.4, 1.4)
      glows.vz = rng.signed() * 0.6
      glows.birth = time + rng.range(0, 0.15)
      glows.life = rng.range(0.7, 1.2)
      glows.size = rng.range(0.1, 0.16)
      glows.sizeEnd = 0.03
      glows.emit()
    }
  }
}

const WARD_RING_RATIO = 0.86
const WARD_RUNE_RATIO = 0.93

/** Rotating rune aura, pulse shockwave, dust puffs, and embers for Ward. */
export class WardFx implements CombatFxPresenter {
  constructor(private kit: CombatFxKit) {}

  onEvent(event: RunEvent): void {
    if (event.kind === 'ward')
      this.emitPulse(event)
  }

  update(worldTime: number): void {
    const kit = this.kit
    const weapon = kit.run.weapon('ward')
    const radius = weapon ? NightwardDataManager.weaponData(weapon).radius ?? 0 : 0
    if (radius <= 0)
      return
    const pulse = kit.run.wardPulse
    const heroX = kit.run.hero.x
    const heroZ = kit.run.hero.z
    const ground = kit.ground
    ground.add(heroX, 0.05, heroZ, radius * 2.5, 16758864, 0.03 + 0.06 * pulse, 0, CombatFrame.halo)
    ground.add(heroX, 0.06, heroZ, radius * 2 / WARD_RING_RATIO, 16767120, 0.25 + 0.35 * pulse, 0, CombatFrame.ring)
    ground.add(heroX, 0.07, heroZ, radius * 2 * 0.97 / WARD_RUNE_RATIO, 16767114, 0.2 + 0.25 * pulse, worldTime * 0.3, CombatFrame.rune)
    ground.add(heroX, 0.07, heroZ, radius * 2 * 0.55 / WARD_RUNE_RATIO, 16769184, 0.1 + 0.18 * pulse, -worldTime * 0.55, CombatFrame.rune)
    kit.lights.set(heroX, 3.6, heroZ, 16767120, 3 + 6 * pulse, radius + 3)
  }

  reset(): void {}

  private emitPulse(event: RunEvent): void {
    const kit = this.kit
    const weapon = kit.run.weapon('ward')
    const radius = (event.value ?? 0) > 0 ? event.value! : (weapon ? NightwardDataManager.weaponData(weapon).radius ?? 0 : 0)
    if (radius <= 0)
      return
    const heroX = kit.run.hero.x
    const heroZ = kit.run.hero.z
    const time = event.time ?? 0
    const rng = kit.rng.seed(FxSeed.ward, eventSeed(event))
    const debris = kit.debris
    const glows = kit.glows
    kit.pulses.add(time, heroX, heroZ, radius * 0.55, radius * 1.18, 0.34, 16769184, 0.6, 0.12)
    debris.reset(CombatFrame.puff).tint(exposureCompensate(9080988, 0.8, kit.view.exposure), 0.32)
    debris.drag = 3
    debris.gravity = -0.01
    for (let i = 0; i < 18; i++) {
      const angle = i / 18 * TWO_PI + rng.signed() * 0.15
      const speed = rng.range(2.5, 4.5)
      debris.x = heroX + Math.cos(angle) * radius
      debris.y = 0.15
      debris.z = heroZ + Math.sin(angle) * radius
      debris.vx = Math.cos(angle) * speed
      debris.vy = rng.range(0.1, 0.5)
      debris.vz = Math.sin(angle) * speed
      debris.birth = time
      debris.life = rng.range(0.5, 0.8)
      debris.size = rng.range(0.25, 0.4)
      debris.sizeEnd = rng.range(0.7, 1)
      debris.rotation = rng.next() * 6
      debris.spin = rng.signed()
      debris.emit()
    }
    glows.reset(CombatFrame.ember).tint(16769184, 0.9)
    glows.gravity = 0.3
    glows.flicker = 0.4
    for (let i = 0; i < 12; i++) {
      const angle = rng.next() * TWO_PI
      glows.x = heroX + Math.cos(angle) * radius
      glows.y = 0.1
      glows.z = heroZ + Math.sin(angle) * radius
      glows.vx = Math.cos(angle) * 0.4
      glows.vy = rng.range(0.8, 1.8)
      glows.vz = Math.sin(angle) * 0.4
      glows.birth = time
      glows.life = rng.range(0.5, 0.9)
      glows.size = rng.range(0.1, 0.15)
      glows.sizeEnd = 0.03
      glows.emit()
    }
  }
}

const FLASK_TRAIL_RATE = 40
const POOL_FLAME_RATE = 60
const POOL_FLAME_DENSITY = 20
const POOL_AFTERGLOW = 0.6
const FLASK_MAX_LIGHTS = 2
const REMEMBERED_POOLS = 16

interface RememberedPool {
  id: number
  x: number
  z: number
  radius: number
  start: number
  end: number
}

/** Thrown Flame Flask spinning sprite, flame trail, shatter explosion, and lingering fire pools. */
export class FlaskFx implements CombatFxPresenter {
  private pools: RememberedPool[] = []
  private cursor = 0

  constructor(private kit: CombatFxKit, private animation: Animation, private artGroup: number) {
    this.reset()
  }

  onEvent(event: RunEvent): void {
    if (event.kind === 'flask')
      this.emitBurst(event)
  }

  update(worldTime: number, prevWorldTime: number): void {
    const kit = this.kit
    const anim = this.animation
    const tint = exposureCompensate(0xFFFFFF, 1.05, kit.view.exposure)
    const size = Math.max(anim.width, anim.height)
    let litCount = 0
    for (const projectile of kit.run.projectiles) {
      if (projectile.kind !== 'flask')
        continue
      const { x, y, z, vx, vy, vz, age, id } = projectile
      const frameIndex = Math.floor(worldTime * anim.fps) % anim.textures.length
      kit.art.add(x, y, z, size, tint, age * 9 * (vx < 0 ? 1 : -1), kit.art.frameOf(this.artGroup, frameIndex))
      kit.sprites.add(x, y, z, 0.8, 16752704, 0.3, 0, CombatFrame.glow)
      this.emitTrail(id, x, y, z, vx, vy, vz, age, prevWorldTime, worldTime)
      if (litCount < FLASK_MAX_LIGHTS) {
        kit.lights.set(x, y, z, 16751168, 4, 3.5)
        litCount++
      }
    }
    this.rememberPools()
    for (const pool of this.pools) {
      if (pool.end > 0 && worldTime >= pool.start && worldTime <= pool.end + POOL_AFTERGLOW + 1.5)
        this.drawPool(pool, prevWorldTime, worldTime)
    }
  }

  reset(): void {
    this.pools = Array.from({ length: REMEMBERED_POOLS }, () => ({ id: -1, x: 0, z: 0, radius: 0, start: 0, end: 0 }))
    this.cursor = 0
  }

  private rememberPools(): void {
    for (const active of this.kit.run.pools) {
      const radius = NightwardDataManager.weaponData(active.weapon).radius!
      const start = active.startedAt
      const end = active.startedAt + active.life
      let slot = this.pools.find(entry => entry.id === active.id)
      if (!slot) {
        slot = this.pools[this.cursor]!
        this.cursor = (this.cursor + 1) % REMEMBERED_POOLS
      }
      slot.id = active.id
      slot.x = active.x
      slot.z = active.z
      slot.radius = radius
      slot.start = start
      slot.end = end
    }
  }

  private emitTrail(id: number, x: number, y: number, z: number, vx: number, vy: number, vz: number, age: number, prevTime: number, worldTime: number): void {
    const kit = this.kit
    const flames = kit.flames
    const startStep = Math.max(Math.floor(prevTime * FLASK_TRAIL_RATE) + 1, Math.ceil((worldTime - age) * FLASK_TRAIL_RATE))
    const endStep = Math.floor(worldTime * FLASK_TRAIL_RATE)
    for (let step = startStep; step <= endStep; step++) {
      const birth = step / FLASK_TRAIL_RATE
      const elapsed = worldTime - birth
      const rng = kit.rng.seed(FxSeed.flaskTrail, step * 64 + (id & 63))
      flames.reset(CombatFrame.puff).tint(16756832, 0.8)
      flames.x = x - vx * elapsed
      flames.y = y - vy * elapsed + 0.05
      flames.z = z - vz * elapsed
      flames.vx = rng.signed() * 0.3
      flames.vy = rng.range(0.2, 0.7)
      flames.vz = rng.signed() * 0.3
      flames.birth = birth
      flames.life = rng.range(0.2, 0.35)
      flames.size = 0.08
      flames.sizeEnd = 0.26
      flames.heat = 1.3
      flames.heatEnd = 0.2
      flames.gravity = 0.2
      flames.rotation = rng.next() * TWO_PI
      flames.emit()
    }
  }

  private drawPool(pool: RememberedPool, prevTime: number, worldTime: number): void {
    const kit = this.kit
    const { x, z, radius, start, end } = pool
    const age = worldTime - start
    const burn = clamp01(age / 0.15) * clamp01((end - worldTime) / 0.4)
    const phase = Math.round(start * 60) & 0xFFFF
    const scorchFade = 1 - clamp01((worldTime - end) / (POOL_AFTERGLOW + 1.5))
    const flicker = flickerNoise(worldTime, phase)
    kit.decals.add(x, 0.04, z, radius * 2.6, exposureCompensate(2759186, 0.5, kit.view.exposure), 0.8 * clamp01(age / 0.35) * scorchFade, phase, CombatFrame.scorch)
    if (worldTime < end + POOL_AFTERGLOW) {
      const glow = Math.max(burn, 0.25 * (1 - clamp01((worldTime - end) / POOL_AFTERGLOW)))
      kit.ground.add(x, 0.05, z, radius * 3, 16747056, glow * (0.34 + 0.08 * flicker), 0, CombatFrame.glow)
      kit.ground.add(x, 0.05, z, radius * 1.6, 16760928, glow * (0.3 + 0.06 * flicker), 0, CombatFrame.glow)
    }
    if (burn > 0)
      kit.lights.set(x, 1.5, z, 16751162, (24 + 7 * flicker) * burn, radius + 5.5)
    this.emitPoolFlames(x, z, radius, start, end, phase, prevTime, worldTime)
  }

  private emitPoolFlames(x: number, z: number, radius: number, start: number, end: number, phase: number, prevTime: number, worldTime: number): void {
    const kit = this.kit
    const flames = kit.flames
    const sparks = kit.sparks
    const startStep = Math.max(Math.floor(prevTime * POOL_FLAME_RATE) + 1, Math.ceil(start * POOL_FLAME_RATE))
    const endStep = Math.min(Math.floor(worldTime * POOL_FLAME_RATE), Math.floor(end * POOL_FLAME_RATE))
    const baseRate = POOL_FLAME_DENSITY * Math.PI * radius * radius / POOL_FLAME_RATE
    const density = kit.firePoolsAtFullDensity === undefined
      ? 1
      : Math.min(1, kit.firePoolsAtFullDensity / Math.max(1, kit.run.pools.length))
    for (let step = startStep; step <= endStep; step++) {
      const birth = step / POOL_FLAME_RATE
      const rng = kit.rng.seed(FxSeed.firePool, phase * 65536 + (step & 0xFFFF))
      const envelope = clamp01((birth - start) / 0.15) * clamp01((end - birth) / 0.5)
      const count = Math.floor(baseRate * density * envelope + rng.next())
      for (let i = 0; i < count; i++) {
        const angle = rng.next() * TWO_PI
        const dist = Math.sqrt(rng.next()) * radius * 0.85
        const ratio = dist / radius
        flames.reset(CombatFrame.flame).tint(ratio > 0.6 ? 16747056 : 16756816, 0.85)
        flames.x = x + Math.cos(angle) * dist
        flames.y = 0.12
        flames.z = z + Math.sin(angle) * dist
        flames.vx = rng.signed() * 0.2
        flames.vy = rng.range(0.4, 1.1) * (1 - ratio * 0.4)
        flames.vz = rng.signed() * 0.2
        flames.birth = birth
        flames.life = rng.range(0.4, 0.75) * (1 - ratio * 0.35)
        flames.size = rng.range(0.3, 0.45) * (1 - ratio * 0.3)
        flames.sizeEnd = rng.range(0.55, 0.8) * (1 - ratio * 0.4)
        flames.heat = rng.range(1, 1.25)
        flames.heatEnd = 0.1
        flames.drag = 0.5
        flames.gravity = 0.25
        flames.emit()
      }
      if (rng.next() < 0.35 * envelope) {
        sparks.reset().tint(16760944, 1)
        sparks.x = x + rng.signed() * radius * 0.6
        sparks.y = 0.3
        sparks.z = z + rng.signed() * radius * 0.6
        sparks.vx = rng.signed() * 0.8
        sparks.vy = rng.range(1.5, 3.5)
        sparks.vz = rng.signed() * 0.8
        sparks.birth = birth
        sparks.life = rng.range(0.6, 1.1)
        sparks.size = 0.04
        sparks.sizeEnd = 0.02
        sparks.heat = 1.3
        sparks.heatEnd = 0.4
        sparks.drag = 1.5
        sparks.gravity = -0.08
        sparks.flicker = 0.5
        sparks.streak = 0.4
        sparks.emit()
      }
    }
  }

  private emitBurst(event: RunEvent): void {
    const kit = this.kit
    const radius = (event.value ?? 0) > 0 ? event.value! : 1.5
    const { x, z } = event
    const time = event.time ?? 0
    const rng = kit.rng.seed(FxSeed.flask, eventSeed(event))
    const flames = kit.flames
    const sparks = kit.sparks
    const debris = kit.debris
    const glows = kit.glows
    for (let i = 0; i < 26; i++) {
      const angle = rng.next() * TWO_PI
      const speed = rng.range(4, 9) * (0.5 + radius * 0.3)
      flames.reset(CombatFrame.puff).tint(16756832, 0.9)
      flames.x = x
      flames.y = 0.3
      flames.z = z
      flames.vx = Math.cos(angle) * speed
      flames.vy = rng.range(0.5, 3.5)
      flames.vz = Math.sin(angle) * speed * 0.8
      flames.birth = time
      flames.life = rng.range(0.45, 0.8)
      flames.size = rng.range(0.25, 0.4)
      flames.sizeEnd = rng.range(0.9, 1.3)
      flames.heat = rng.range(1.4, 1.8)
      flames.heatEnd = 0.2
      flames.drag = rng.range(4, 5.5)
      flames.gravity = 0.4
      flames.rotation = rng.next() * TWO_PI
      flames.spin = rng.signed() * 2
      flames.emit()
    }
    for (let i = 0; i < 6; i++) {
      flames.reset(CombatFrame.puff).tint(0xFFFFFF, 1)
      flames.x = x + rng.signed() * 0.2
      flames.y = 0.4
      flames.z = z + rng.signed() * 0.2
      flames.vy = rng.range(0.5, 1.5)
      flames.birth = time
      flames.life = rng.range(0.2, 0.3)
      flames.size = 0.4
      flames.sizeEnd = 1.1
      flames.heat = 1.6
      flames.heatEnd = 0.5
      flames.rotation = rng.next() * TWO_PI
      flames.emit()
    }
    sparks.reset().tint(16763000, 1)
    sparks.drag = 1.4
    sparks.heatEnd = 0.4
    for (let i = 0; i < 24; i++) {
      const angle = rng.next() * TWO_PI
      const speed = rng.range(3, 8)
      sparks.x = x
      sparks.y = 0.35
      sparks.z = z
      sparks.vx = Math.cos(angle) * speed
      sparks.vy = rng.range(2, 6)
      sparks.vz = Math.sin(angle) * speed
      sparks.birth = time
      sparks.life = rng.range(0.35, 0.7)
      sparks.size = rng.range(0.04, 0.07)
      sparks.sizeEnd = 0.03
      sparks.heat = rng.range(1.4, 1.8)
      sparks.emit()
    }
    debris.reset(CombatFrame.shard).tint(exposureCompensate(13167871, 1.3, kit.view.exposure), 1)
    debris.drag = 0.6
    for (let i = 0; i < 16; i++) {
      const angle = rng.next() * TWO_PI
      const speed = rng.range(2, 5)
      debris.x = x
      debris.y = 0.4
      debris.z = z
      debris.vx = Math.cos(angle) * speed
      debris.vy = rng.range(2, 5)
      debris.vz = Math.sin(angle) * speed
      debris.birth = time
      debris.life = rng.range(0.4, 0.7)
      debris.size = rng.range(0.05, 0.09)
      debris.sizeEnd = debris.size
      debris.rotation = rng.next() * 6
      debris.spin = rng.signed() * 16
      debris.emit()
    }
    glows.reset(CombatFrame.hotGlow).tint(16769200, 1)
    glows.x = x
    glows.y = 0.5
    glows.z = z
    glows.birth = time
    glows.life = 0.16
    glows.size = 0.9
    glows.sizeEnd = 2.6
    glows.gravity = 0
    glows.emit()
    kit.pulses.add(time, x, z, radius * 0.3, radius * 1.6, 0.32, 16756832, 0.9, 0.12)
    kit.flashes.add(time, x, 1.2, z, 16751168, 30, 0.12, radius + 7)
    kit.lens.shake(0.1)
  }
}
