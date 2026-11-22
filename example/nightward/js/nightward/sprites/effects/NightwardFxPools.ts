import type { Container3D, View3D } from '@pixi/3d'
import type { Animation } from '../../managers/NightwardAssetManager'
import type { Game_NightwardRun, RunEvent } from '../../objects/Game_NightwardRun'
import type { NightwardLensState } from './NightwardLens'
import { PointLight } from '@pixi/3d'
import { Rectangle, Texture } from 'pixi.js'
import { EffekseerParticles } from '../Effekseer'

export const CombatFrame = {
  glow: 0,
  hotGlow: 1,
  spark: 2,
  puff: 3,
  ring: 4,
  crescent: 5,
  bolt: 6,
  beam: 7,
  shard: 8,
  ember: 9,
  scorch: 10,
  rune: 11,
  flame: 12,
  halo: 13,
} as const

export const FxSeed = {
  lash: 101,
  wand: 102,
  wandTrail: 103,
  tomes: 104,
  tomesTrail: 105,
  storm: 106,
  ward: 107,
  flask: 108,
  flaskTrail: 109,
  firePool: 110,
  hit: 111,
  kill: 112,
  relicKill: 113,
  pickup: 114,
  brazier: 115,
} as const

const SRGB_TO_LINEAR_BYTE = (() => {
  const table = new Uint8Array(256)
  for (let i = 0; i < 256; i++) {
    const n = i / 255
    const linear = n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4
    table[i] = Math.round(linear * 255)
  }
  return table
})()

export function packLinearRgba(rgb: number, alpha: number): number {
  const r = SRGB_TO_LINEAR_BYTE[rgb >> 16 & 255]!
  const g = SRGB_TO_LINEAR_BYTE[rgb >> 8 & 255]!
  const b = SRGB_TO_LINEAR_BYTE[rgb & 255]!
  const a = alpha <= 0 ? 0 : alpha >= 1 ? 255 : (alpha * 255 + 0.5) | 0
  return (r | g << 8 | b << 16 | a << 24) >>> 0
}

export function exposureCompensate(rgb: number, targetGain: number, exposure: number): number {
  const scale = Math.min(1, targetGain / exposure) ** (1 / 2.2)
  const r = Math.round((rgb >> 16 & 255) * scale)
  const g = Math.round((rgb >> 8 & 255) * scale)
  const b = Math.round((rgb & 255) * scale)
  return r << 16 | g << 8 | b
}

export function clamp01(value: number): number {
  return value < 0 ? 0 : value > 1 ? 1 : value
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp01((x - edge0) / (edge1 - edge0))
  return t * t * (3 - 2 * t)
}

export function flickerNoise(time: number, phase: number): number {
  return Math.sin(time * 31.7 + phase) * 0.5
    + Math.sin(time * 53.3 + phase * 2.1) * 0.3
    + Math.sin(time * 97.1 + phase * 3.7) * 0.2
}

export function ballisticPosition(t: number, start: number, velocity: number, accel: number, drag: number): number {
  if (drag <= 1e-3)
    return start + velocity * t + 0.5 * accel * t * t
  const decay = (1 - Math.exp(-drag * t)) / drag
  return start + velocity * decay + accel * ((t - decay) / drag)
}

export function ballisticVelocity(t: number, velocity: number, accel: number, drag: number): number {
  if (drag <= 1e-3)
    return velocity + accel * t
  const decay = Math.exp(-drag * t)
  return velocity * decay + accel * ((1 - decay) / drag)
}

export function findGroundImpact(y0: number, vy: number, accel: number, drag: number, maxTime: number): number {
  if (ballisticPosition(maxTime, y0, vy, accel, drag) > 0.01)
    return -1
  let low = 0
  let high = maxTime
  for (let step = 1; step <= 8; step++) {
    const sample = maxTime * step / 8
    if (ballisticPosition(sample, y0, vy, accel, drag) <= 0.01) {
      high = sample
      low = maxTime * (step - 1) / 8
      break
    }
  }
  for (let i = 0; i < 12; i++) {
    const mid = (low + high) / 2
    if (ballisticPosition(mid, y0, vy, accel, drag) > 0.01)
      low = mid
    else
      high = mid
  }
  return high
}

export function eventSeed(event: RunEvent): number {
  const subject = event.target?.id ?? event.projectile?.id ?? 0
  return (Math.round((event.time ?? 0) * 60) * 2048 + subject) | 0
}

/** Deterministic PRNG used to reproduce identical particle scatter per event. */
export class FxRng {
  private state = 0

  seed(channel: number, salt: number): this {
    let s = Math.imul(channel ^ 2654435769, 2246822507) ^ Math.imul(salt + 1663821211, 3266489909)
    s ^= s >>> 15
    s = Math.imul(s, 739982445)
    s ^= s >>> 12
    this.state = s | 0
    return this
  }

  next(): number {
    const t = this.state = (this.state + 1831565813) | 0
    let e = Math.imul(t ^ t >>> 15, t | 1)
    e ^= e + Math.imul(e ^ e >>> 7, e | 61)
    return ((e ^ e >>> 14) >>> 0) / 4294967296
  }

  range(min: number, max: number): number {
    return min + (max - min) * this.next()
  }

  signed(): number {
    return this.next() * 2 - 1
  }
}

const MAX_LIGHT_REQUESTS = 96
const LIGHT_STRIDE = 6

/** Priority pool allocating the top N brightest dynamic combat PointLights each frame. */
export class FxLightPool {
  private lights: PointLight[] = []
  private requests = new Float32Array(MAX_LIGHT_REQUESTS * LIGHT_STRIDE)
  private count = 0

  constructor(parent: Container3D, capacity: number) {
    for (let i = 0; i < capacity; i++) {
      const light = new PointLight({ label: `fx-light-${i}`, intensity: 0, range: 1 })
      light.visible = false
      this.lights.push(light)
      parent.addChild(light)
    }
  }

  set(x: number, y: number, z: number, color: number, intensity: number, range: number): void {
    if (intensity <= 0.05)
      return
    const requests = this.requests
    let slot = this.count
    if (slot === MAX_LIGHT_REQUESTS) {
      let lowest = 0
      for (let i = 1; i < MAX_LIGHT_REQUESTS; i++) {
        if (requests[i * LIGHT_STRIDE + 4]! < requests[lowest * LIGHT_STRIDE + 4]!)
          lowest = i
      }
      if (requests[lowest * LIGHT_STRIDE + 4]! >= intensity)
        return
      slot = lowest
    }
    else {
      this.count++
    }
    const at = slot * LIGHT_STRIDE
    requests[at] = x
    requests[at + 1] = y
    requests[at + 2] = z
    requests[at + 3] = color
    requests[at + 4] = intensity
    requests[at + 5] = range
  }

  flush(enabled: boolean): void {
    const requests = this.requests
    const count = this.count
    let active = 0
    if (enabled) {
      for (; active < this.lights.length && active < count; active++) {
        let best = active
        for (let i = active + 1; i < count; i++) {
          if (requests[i * LIGHT_STRIDE + 4]! > requests[best * LIGHT_STRIDE + 4]!)
            best = i
        }
        if (best !== active)
          this.swapRequests(best, active)
        const at = active * LIGHT_STRIDE
        const light = this.lights[active]!
        light.position.set(requests[at]!, requests[at + 1]!, requests[at + 2]!)
        light.color.setValue(requests[at + 3]!)
        light.intensity = requests[at + 4]!
        light.range = requests[at + 5]!
        light.visible = true
      }
    }
    for (let i = active; i < this.lights.length; i++)
      this.lights[i]!.visible = false
    this.count = 0
  }

  destroy(): void {
    for (const light of this.lights)
      light.destroy()
    this.lights.length = 0
    this.count = 0
  }

  private swapRequests(a: number, b: number): void {
    const ia = a * LIGHT_STRIDE
    const ib = b * LIGHT_STRIDE
    for (let i = 0; i < LIGHT_STRIDE; i++) {
      const tmp = this.requests[ia + i]!
      this.requests[ia + i] = this.requests[ib + i]!
      this.requests[ib + i] = tmp
    }
  }
}

export interface FxPyroOptions {
  label: string
  texture: Texture | Texture[]
  capacity: number
  blendMode: string
  gravity: number[]
  streak?: boolean
  growth?: number
  fadeIn?: number
  fadeOut?: number
  nearFade?: number
  cooling?: number
  streakFade?: number
}

const VERTS_PER_QUAD = 4

/** Ring-buffered ballistic/pyro particle pool backed by EffekseerParticles. */
export class FxPyroPool {
  readonly container: EffekseerParticles
  readonly pull: number[]
  x = 0
  y = 0
  z = 0
  vx = 0
  vy = 0
  vz = 0
  birth = 0
  life = 1
  size = 0.1
  sizeEnd = 0.1
  color = 0xFFFFFFFF
  rotation = 0
  spin = 0
  heat = 1
  heatEnd = 1
  drag = 0
  gravity = 1
  flicker = 0
  trail = 0
  streak = 1
  frame = 0

  private f32: Float32Array
  private stride: number
  private iBirth: number
  private iLife: number
  private iVel: number
  private iLook: number
  private iMotion: number
  private capacity: number
  private isStreak: boolean
  private cursor = 0
  private liveUntil = -1

  constructor(parent: Container3D, options: FxPyroOptions) {
    const isStreak = options.streak ?? false
    const container = new EffekseerParticles({
      label: options.label,
      texture: options.texture,
      capacity: options.capacity,
      blendMode: options.blendMode,
      billboard: 'spherical',
      extraBits: [{ name: isStreak ? 'pyroStreak' : 'pyro' }],
    })
    const { f32, floatStride, offsets } = container.data
    const uniforms = container.uniforms
    uniforms.uGravity = options.gravity
    uniforms.uGrowth = options.growth ?? 1
    uniforms.uFadeIn = Math.max(1e-3, options.fadeIn ?? 1e-3)
    uniforms.uFadeOut = options.fadeOut ?? 1
    uniforms.uNearFade = options.nearFade ?? 0.8
    uniforms.uCooling = options.cooling ?? 1
    uniforms.uParticleTime = 0
    if (isStreak) {
      uniforms.uShutter = 0
      uniforms.uStreakFade = options.streakFade ?? 0.4
    }
    this.container = container
    this.pull = options.gravity
    this.f32 = f32
    this.stride = floatStride
    this.iBirth = offsets.aBirth! / 4
    this.iLife = offsets.aLife! / 4
    this.iVel = offsets.aVel! / 4
    this.iLook = offsets.aLook! / 4
    this.iMotion = offsets.aMotion! / 4
    this.capacity = options.capacity
    this.isStreak = isStreak
    container.visible = false
    parent.addChild(container)
  }

  reset(frame = 0): this {
    this.vx = this.vy = this.vz = 0
    this.rotation = 0
    this.spin = 0
    this.heat = 1
    this.heatEnd = 1
    this.drag = 0
    this.gravity = 1
    this.flicker = 0
    this.trail = 0
    this.streak = 1
    this.frame = frame
    return this
  }

  tint(rgb: number, alpha: number): this {
    this.color = packLinearRgba(rgb, alpha)
    return this
  }

  emit(): void {
    const slot = this.cursor
    const f32 = this.f32
    const stride = this.stride
    let offset = slot * VERTS_PER_QUAD * stride
    this.container.writePacked(slot, this.x, this.y, this.z, this.size, this.rotation, this.color, this.frame)
    for (let v = 0; v < VERTS_PER_QUAD; v++, offset += stride) {
      f32[offset + this.iBirth] = this.birth
      f32[offset + this.iLife] = this.life
      const vel = offset + this.iVel
      f32[vel] = this.vx
      f32[vel + 1] = this.vy
      f32[vel + 2] = this.vz
      const look = offset + this.iLook
      f32[look] = this.heat
      f32[look + 1] = this.heatEnd
      f32[look + 2] = this.sizeEnd
      f32[look + 3] = this.isStreak ? this.streak : this.spin
      const motion = offset + this.iMotion
      f32[motion] = this.drag
      f32[motion + 1] = this.gravity
      f32[motion + 2] = this.flicker
      f32[motion + 3] = this.trail
    }
    this.cursor = slot + 1 === this.capacity ? 0 : slot + 1
    const end = this.birth + this.life
    if (end > this.liveUntil)
      this.liveUntil = end
  }

  update(worldTime: number, shutter: number, visible: boolean): void {
    const uniforms = this.container.uniforms
    const active = visible && worldTime <= this.liveUntil
    uniforms.uParticleTime = worldTime
    if (this.isStreak)
      uniforms.uShutter = shutter
    if (active)
      this.container.upload()
    this.container.visible = active
  }

  clear(): void {
    this.container.clear()
    this.container.visible = false
    this.cursor = 0
    this.liveUntil = -1
  }

  destroy(): void {
    this.container.destroy()
  }
}

/** Immediate-mode per-frame billboard / horizontal sprite pool. */
export class FxSpritePool {
  readonly container: EffekseerParticles
  private capacity: number
  private count = 0
  private lastCount = 0

  constructor(parent: Container3D, label: string, textures: Texture[], capacity: number, billboard: string, blendMode = 'add') {
    this.container = new EffekseerParticles({ label, texture: textures, capacity, blendMode, billboard })
    this.container.visible = false
    this.capacity = capacity
    parent.addChild(this.container)
  }

  add(x: number, y: number, z: number, size: number, color: number, alpha: number, rotation = 0, frame = 0): void {
    if (this.count === this.capacity || size <= 0 || alpha <= 2e-3)
      return
    this.container.writePacked(this.count++, x, y, z, size, rotation, packLinearRgba(color, alpha), frame)
  }

  flush(visible: boolean, upload: boolean): void {
    for (let i = this.count; i < this.lastCount; i++)
      this.container.writePacked(i, 0, 0, 0, 0, 0, 0)
    const active = visible && this.count > 0
    if (upload && active)
      this.container.upload()
    this.container.visible = active
    this.lastCount = this.count
    this.count = 0
  }

  clear(): void {
    this.count = 0
    this.flush(false, false)
  }

  destroy(): void {
    this.container.destroy()
  }
}

/** Opaque alpha-masked sprite pool for orbiting tomes and thrown flasks. */
export class FxArtPool {
  readonly container: EffekseerParticles
  private frames: Texture[] = []
  private offsets: number[] = []
  private capacity: number
  private count = 0
  private lastCount = 0

  constructor(parent: Container3D, animations: Animation[], capacity: number) {
    for (const animation of animations) {
      this.offsets.push(this.frames.length)
      for (const tex of animation.textures) {
        const { x, y, width, height } = tex.frame
        const size = Math.max(width, height)
        const square = new Rectangle(x + (width - size) / 2, y + (height - size) / 2, size, size)
        this.frames.push(new Texture({ source: tex.source, frame: square, label: 'fx-art' }))
      }
    }
    this.container = new EffekseerParticles({
      label: 'combat-art',
      texture: this.frames,
      capacity,
      alphaMode: 'mask',
      alphaCutoff: 0.5,
      billboard: 'spherical',
    })
    this.capacity = capacity
    this.container.visible = false
    parent.addChild(this.container)
  }

  frameOf(group: number, index: number): number {
    return this.offsets[group]! + index
  }

  add(x: number, y: number, z: number, size: number, color: number, rotation: number, frame: number): void {
    if (this.count === this.capacity || size <= 0)
      return
    this.container.writePacked(this.count++, x, y, z, size, rotation, packLinearRgba(color, 1), frame)
  }

  flush(upload: boolean): void {
    for (let i = this.count; i < this.lastCount; i++)
      this.container.writePacked(i, 0, 0, 0, 0, 0, 0)
    const active = this.count > 0
    if (upload && active)
      this.container.upload()
    this.container.visible = active
    this.lastCount = this.count
    this.count = 0
  }

  clear(): void {
    this.count = 0
    this.flush(false)
  }

  destroy(): void {
    this.container.destroy()
    for (const tex of this.frames)
      tex.destroy(false)
    this.frames.length = 0
  }
}

/** Immediate-mode ribbon/beam segment pool backed by EffekseerParticles. */
export class FxBeamPool {
  readonly container: EffekseerParticles
  private capacity: number
  private f32: Float32Array
  private u32: Uint32Array
  private stride: number
  private iSizeRot: number
  private iColor: number
  private iOther: number
  private count = 0
  private lastCount = 0

  constructor(parent: Container3D, label: string, texture: Texture, capacity: number, pull = 1.5) {
    const container = new EffekseerParticles({
      label,
      texture,
      capacity,
      blendMode: 'add',
      billboard: 'spherical',
      extraBits: [{ name: 'fxBeam' }],
    })
    const { f32, u32, floatStride, offsets } = container.data
    container.uniforms.uBeamPull = pull
    this.container = container
    this.capacity = capacity
    this.f32 = f32
    this.u32 = u32
    this.stride = floatStride
    this.iSizeRot = offsets.aParticleSizeRot! / 4
    this.iColor = offsets.aParticleColor! / 4
    this.iOther = offsets.aBeamOther! / 4
    container.visible = false
    parent.addChild(container)
  }

  segment(
    ax: number,
    ay: number,
    az: number,
    bx: number,
    by: number,
    bz: number,
    widthA: number,
    widthB: number,
    colorA: number,
    alphaA: number,
    colorB: number,
    alphaB: number,
  ): void {
    if (this.count === this.capacity || (alphaA <= 2e-3 && alphaB <= 2e-3))
      return
    const slot = this.count++
    const packedA = packLinearRgba(colorA, alphaA)
    const packedB = colorB === colorA && alphaB === alphaA ? packedA : packLinearRgba(colorB, alphaB)
    let offset = slot * VERTS_PER_QUAD * this.stride
    for (let v = 0; v < VERTS_PER_QUAD; v++, offset += this.stride) {
      const isB = v < 2
      this.writeVertex(
        offset,
        isB ? bx : ax,
        isB ? by : ay,
        isB ? bz : az,
        isB ? ax : bx,
        isB ? ay : by,
        isB ? az : bz,
        isB ? widthB : widthA,
        isB ? packedB : packedA,
      )
    }
    this.container.markDirty(slot, slot)
  }

  flush(visible: boolean, upload: boolean): void {
    for (let i = this.count; i < this.lastCount; i++) {
      let offset = i * VERTS_PER_QUAD * this.stride
      for (let v = 0; v < VERTS_PER_QUAD; v++, offset += this.stride)
        this.f32[offset + this.iSizeRot] = 0
      this.container.markDirty(i, i)
    }
    const active = visible && this.count > 0
    if (upload && active)
      this.container.upload()
    this.container.visible = active
    this.lastCount = this.count
    this.count = 0
  }

  clear(): void {
    this.count = 0
    this.flush(false, false)
  }

  destroy(): void {
    this.container.destroy()
  }

  private writeVertex(offset: number, x: number, y: number, z: number, ox: number, oy: number, oz: number, width: number, color: number): void {
    const f32 = this.f32
    const other = offset + this.iOther
    f32[offset] = x
    f32[offset + 1] = y
    f32[offset + 2] = z
    f32[offset + this.iSizeRot] = width
    f32[offset + this.iSizeRot + 1] = 0
    this.u32[offset + this.iColor] = color
    f32[other] = ox
    f32[other + 1] = oy
    f32[other + 2] = oz
  }
}

const MAX_PULSES = 48
const PULSE_STRIDE = 9
const RING_INNER_RATIO = 0.86

/** Expanding ground pulse rings + optional lens shockwave distortion. */
export class FxPulsePool {
  private data = new Float32Array(MAX_PULSES * PULSE_STRIDE)
  private cursor = 0

  add(time: number, x: number, z: number, startRadius: number, endRadius: number, duration: number, color: number, alpha: number, shockStrength = 0): void {
    const at = this.cursor * PULSE_STRIDE
    this.data[at] = time
    this.data[at + 1] = x
    this.data[at + 2] = z
    this.data[at + 3] = startRadius
    this.data[at + 4] = endRadius
    this.data[at + 5] = duration
    this.data[at + 6] = color
    this.data[at + 7] = alpha
    this.data[at + 8] = shockStrength
    this.cursor = (this.cursor + 1) % MAX_PULSES
  }

  update(ground: FxSpritePool, lens: NightwardLensState, worldTime: number): void {
    const data = this.data
    for (let at = 0; at < MAX_PULSES * PULSE_STRIDE; at += PULSE_STRIDE) {
      const duration = data[at + 5]!
      const age = worldTime - data[at]!
      if (duration <= 0 || age < 0 || age >= duration)
        continue
      const progress = age / duration
      const radius = data[at + 3]! + (data[at + 4]! - data[at + 3]!) * (1 - (1 - progress) * (1 - progress))
      const fade = (1 - progress) ** 1.4
      ground.add(data[at + 1]!, 0.06, data[at + 2]!, radius * 2 / RING_INNER_RATIO, data[at + 6]!, data[at + 7]! * fade, 0, CombatFrame.ring)
      if (data[at + 8]! > 0)
        lens.shockwave(data[at + 1]!, 0, data[at + 2]!, radius, data[at + 8]! * fade)
    }
  }

  reset(): void {
    this.data.fill(0)
    this.cursor = 0
  }
}

const MAX_FLASHES = 32
const FLASH_STRIDE = 8

/** Exponentially decaying dynamic point-light flashes. */
export class FxFlashPool {
  private data = new Float32Array(MAX_FLASHES * FLASH_STRIDE)
  private cursor = 0

  add(time: number, x: number, y: number, z: number, color: number, intensity: number, decay: number, range: number): void {
    const at = this.cursor * FLASH_STRIDE
    this.data[at] = time
    this.data[at + 1] = x
    this.data[at + 2] = y
    this.data[at + 3] = z
    this.data[at + 4] = color
    this.data[at + 5] = intensity
    this.data[at + 6] = decay
    this.data[at + 7] = range
    this.cursor = (this.cursor + 1) % MAX_FLASHES
  }

  update(lights: FxLightPool, worldTime: number): void {
    const data = this.data
    for (let at = 0; at < MAX_FLASHES * FLASH_STRIDE; at += FLASH_STRIDE) {
      const decay = data[at + 6]!
      const age = worldTime - data[at]!
      if (decay <= 0 || age < 0 || age > decay * 5)
        continue
      lights.set(data[at + 1]!, data[at + 2]!, data[at + 3]!, data[at + 4]!, data[at + 5]! * Math.exp(-age / decay), data[at + 7]!)
    }
  }

  reset(): void {
    this.data.fill(0)
    this.cursor = 0
  }
}

export interface CombatFxKit {
  readonly view: View3D
  readonly run: Game_NightwardRun
  readonly lens: NightwardLensState
  readonly lights: FxLightPool
  readonly rng: FxRng
  readonly firePoolsAtFullDensity?: number
  readonly sparks: FxPyroPool
  readonly glows: FxPyroPool
  readonly flames: FxPyroPool
  readonly debris: FxPyroPool
  readonly beams: FxBeamPool
  readonly sprites: FxSpritePool
  readonly ground: FxSpritePool
  readonly decals: FxSpritePool
  readonly art: FxArtPool
  readonly pulses: FxPulsePool
  readonly flashes: FxFlashPool
}

export interface CombatFxPresenter {
  onEvent: (event: RunEvent) => void
  update: (worldTime: number, prevWorldTime: number, warp: number) => void
  reset: () => void
}
