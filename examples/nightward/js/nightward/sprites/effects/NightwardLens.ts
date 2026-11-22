import { PostEffect } from '@pixi/3d'
import { UniformGroup } from 'pixi.js'
import lensGlsl from './shaders/lens.glsl?raw'
import lensWgsl from './shaders/lens.wgsl?raw'

const MAX_SHOCKWAVES = 4
const MAX_FLARES = 8
const SPLIT_TONE_STRENGTH = 0.24
const TRAUMA_DECAY = 1.3
const SHOCK_STRIDE = 5
const FLARE_STRIDE = 5

const LENS_FRAGMENT = {
  gpu: lensWgsl,
  gl: lensGlsl,
}

function writeVec4(target: Float32Array, offset: number, x: number, y: number, z: number, w: number): void {
  target[offset] = x
  target[offset + 1] = y
  target[offset + 2] = z
  target[offset + 3] = w
}

const redChannel = (rgb: number): number => (rgb >> 16 & 255) / 255
const greenChannel = (rgb: number): number => (rgb >> 8 & 255) / 255
const blueChannel = (rgb: number): number => (rgb & 255) / 255

function writeToneOffset(target: Float32Array, rgb: number): void {
  const r = redChannel(rgb)
  const g = greenChannel(rgb)
  const b = blueChannel(rgb)
  const luma = r * 0.2126 + g * 0.7152 + b * 0.0722
  target[0] = (r - luma) * SPLIT_TONE_STRENGTH
  target[1] = (g - luma) * SPLIT_TONE_STRENGTH
  target[2] = (b - luma) * SPLIT_TONE_STRENGTH
}

function findMinSlot(buffer: Float32Array | Float64Array, count: number, stride: number, fieldOffset: number): number {
  let lowest = 0
  for (let i = 1; i < count; i++) {
    if (buffer[i * stride + fieldOffset]! < buffer[lowest * stride + fieldOffset]!)
      lowest = i
  }
  return lowest
}

export function lensNoise(time: number, seed: number): number {
  return Math.sin(time * 37.1 + seed * 1.7) * 0.5
    + Math.sin(time * 61.7 + seed * 4.1) * 0.3
    + Math.sin(time * 97.3 + seed * 2.3) * 0.2
}

/**
 * Full-screen Pixi3D PostEffect for chromatic aberration, shockwaves, lens flares,
 * zoom blur, film grain, vignette, color grading, and flash overlays.
 */
export class NightwardLensPass extends PostEffect {
  uniforms = new UniformGroup({
    uFx: { value: new Float32Array([0, 0, 1, 0]), type: 'vec4<f32>' },
    uZoom: { value: new Float32Array([0.5, 0.5, 0, 0.12]), type: 'vec4<f32>' },
    uGrade: { value: new Float32Array([1, 1, 0, 0]), type: 'vec4<f32>' },
    uGrain: { value: new Float32Array([0, 0.28, 0, 1]), type: 'vec4<f32>' },
    uTint: { value: new Float32Array([1, 1, 1, 0]), type: 'vec4<f32>' },
    uShadowTone: { value: new Float32Array(4), type: 'vec4<f32>' },
    uHighlightTone: { value: new Float32Array(4), type: 'vec4<f32>' },
    uFlash: { value: new Float32Array(4), type: 'vec4<f32>' },
    uShock: { value: new Float32Array(16), type: 'mat4x4<f32>' },
    uFlareA0: { value: new Float32Array(16), type: 'mat4x4<f32>' },
    uFlareA1: { value: new Float32Array(16), type: 'mat4x4<f32>' },
    uFlareB0: { value: new Float32Array(16), type: 'mat4x4<f32>' },
    uFlareB1: { value: new Float32Array(16), type: 'mat4x4<f32>' },
  })

  fragment = LENS_FRAGMENT

  setLens(aberration: number, vignette: number, aspect: number, grain: number): void {
    writeVec4(this.uniforms.uniforms.uFx, 0, aberration, vignette, aspect, grain)
    this.uniforms.update()
  }

  setGrade(contrast: number, saturation: number, split: number, lift: number, tint: number, shadowTint: number, highlightTint: number): void {
    writeVec4(this.uniforms.uniforms.uGrade, 0, contrast, saturation, split, lift)
    writeVec4(this.uniforms.uniforms.uTint, 0, redChannel(tint), greenChannel(tint), blueChannel(tint), 0)
    writeToneOffset(this.uniforms.uniforms.uShadowTone, shadowTint)
    writeToneOffset(this.uniforms.uniforms.uHighlightTone, highlightTint)
    this.uniforms.update()
  }

  setGrain(time: number, squash: number): void {
    const grain = this.uniforms.uniforms.uGrain
    grain[0] = time % 1000
    grain[3] = squash
    this.uniforms.update()
  }

  setFlash(color: number, alpha: number): void {
    writeVec4(this.uniforms.uniforms.uFlash, 0, redChannel(color), greenChannel(color), blueChannel(color), alpha)
    this.uniforms.update()
  }

  setZoom(u: number, v: number, strength: number, innerRadius: number): void {
    writeVec4(this.uniforms.uniforms.uZoom, 0, u, v, strength, innerRadius)
    this.uniforms.update()
  }

  setShock(index: number, u: number, v: number, radius: number, strength: number): void {
    writeVec4(this.uniforms.uniforms.uShock, index * 4, u, v, radius, strength)
    this.uniforms.update()
  }

  setFlare(index: number, u: number, v: number, intensity: number, color: number, size: number): void {
    const offset = (index & 3) * 4
    writeVec4(index < 4 ? this.uniforms.uniforms.uFlareA0 : this.uniforms.uniforms.uFlareA1, offset, u, v, 0, intensity)
    writeVec4(index < 4 ? this.uniforms.uniforms.uFlareB0 : this.uniforms.uniforms.uFlareB1, offset, redChannel(color), greenChannel(color), blueChannel(color), size)
    this.uniforms.update()
  }
}

/**
 * Per-frame transient camera/lens state accumulated by weapon and impact effects.
 */
export class NightwardLensState {
  shocks = new Float32Array(MAX_SHOCKWAVES * SHOCK_STRIDE)
  shockCount = 0
  flares = new Float64Array(MAX_FLARES * FLARE_STRIDE)
  flareCount = 0
  zoom = 0
  zoomAt = { x: 0, y: 0, z: 0 }
  extraAberration = 0
  strike = 0
  trauma = 0
  flashPeak = 0
  flashColor = 0xFFFFFF
  flashDecay = 6
  flashTime = 0
  now = 0
  shakeGain = 1
  private flashPending = false
  private pendingTrauma = 0

  flash(peak: number, color = 0xFFFFFF, decay = 6): void {
    const current = this.flashPending ? this.flashPeak : this.flashAt(this.now)
    if (peak > current) {
      this.flashPeak = Math.min(1, peak)
      this.flashColor = color
      this.flashDecay = decay
      this.flashPending = true
    }
  }

  shockwave(x: number, y: number, z: number, radius: number, strength: number): void {
    if (!(strength > 0))
      return
    let slot = this.shockCount
    if (slot === MAX_SHOCKWAVES) {
      slot = findMinSlot(this.shocks, MAX_SHOCKWAVES, SHOCK_STRIDE, 4)
      if (this.shocks[slot * SHOCK_STRIDE + 4]! >= strength)
        return
    }
    else {
      this.shockCount++
    }
    const at = slot * SHOCK_STRIDE
    this.shocks[at] = x
    this.shocks[at + 1] = y
    this.shocks[at + 2] = z
    this.shocks[at + 3] = radius
    this.shocks[at + 4] = strength
  }

  shake(amount: number): void {
    if (amount > 0)
      this.pendingTrauma += amount * this.shakeGain
  }

  zoomBlur(strength: number, x: number, y: number, z: number): void {
    if (strength > this.zoom) {
      this.zoom = Math.min(1, strength)
      this.zoomAt.x = x
      this.zoomAt.y = y
      this.zoomAt.z = z
    }
  }

  aberration(amount: number): void {
    if (amount > this.extraAberration)
      this.extraAberration = Math.min(1, amount)
  }

  flare(x: number, y: number, z: number, color: number, intensity: number): void {
    if (!(intensity > 0))
      return
    let slot = this.flareCount
    if (slot === MAX_FLARES) {
      slot = findMinSlot(this.flares, MAX_FLARES, FLARE_STRIDE, 4)
      if (this.flares[slot * FLARE_STRIDE + 4]! >= intensity)
        return
    }
    else {
      this.flareCount++
    }
    const at = slot * FLARE_STRIDE
    this.flares[at] = x
    this.flares[at + 1] = y
    this.flares[at + 2] = z
    this.flares[at + 3] = color
    this.flares[at + 4] = intensity
  }

  lightning(amount: number): void {
    if (amount > this.strike)
      this.strike = Math.min(1, amount)
  }

  flashAt(time: number): number {
    return this.flashPeak <= 0 ? 0 : this.flashPeak * Math.exp(-this.flashDecay * Math.max(0, time - this.flashTime))
  }

  advance(time: number, dt: number): void {
    if (this.flashPending) {
      this.flashTime = time
      this.flashPending = false
    }
    this.trauma = Math.min(1, Math.max(0, this.trauma - TRAUMA_DECAY * dt) + this.pendingTrauma)
    this.pendingTrauma = 0
    this.now = time
  }

  endFrame(): void {
    this.shockCount = 0
    this.flareCount = 0
    this.zoom = 0
    this.extraAberration = 0
    this.strike = 0
  }

  reset(): void {
    this.endFrame()
    this.trauma = 0
    this.flashPeak = 0
    this.flashTime = 0
    this.now = 0
    this.flashPending = false
    this.pendingTrauma = 0
  }
}
