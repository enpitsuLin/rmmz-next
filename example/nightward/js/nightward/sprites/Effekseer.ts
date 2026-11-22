import type { Camera3D, RenderGraph, RenderSession } from '@pixi/3d'
import type { Texture, TextureSource, WebGLRenderer } from 'pixi.js'
import type { Assets } from '../managers/NightwardAssetManager'
import { Container3D, Frustum, getCameraData, Matrix4, Pass3D, RenderPassBit, Sphere } from '@pixi/3d'
import { EffectManager, Graphics } from 'rmmz-next'
import { NightwardEffectManager } from '../managers/NightwardEffectManager'

interface Slot { handle: effekseer.EffekseerHandle, name: string, revision: number, matrix: Float32Array, color?: number, value?: number, alpha?: number }
interface PreparedFrame {
  session?: RenderSession
  containers: { node: EffekseerParticles, shown: boolean, depth: number }[]
  opaque: effekseer.EffekseerHandle[]
  transparent: effekseer.EffekseerHandle[]
}
interface ParticleOptions {
  label?: string
  texture: Texture | Texture[]
  capacity: number
  blendMode?: string
  billboard?: string
  alphaMode?: string
  alphaCutoff?: number
  aspect?: number
  extraBits?: { name: string }[]
}
const sources = new WeakMap<TextureSource, string>()
const frames = new WeakMap<Texture, Map<string, string>>()
const context = (): effekseer.EffekseerContext => Graphics.effekseer
const clamp = (value: number): number => Math.min(1, Math.max(0, value))
const fract = (value: number): number => value - Math.floor(value)
const glowMargin = 48
const cullMatrix = new Matrix4()
const particleFrustum = new Frustum()
const particleBounds = new Sphere()

function prepareFrustum(camera: Camera3D): Frustum {
  const { viewProjection, frame } = getCameraData(camera)
  const clip = cullMatrix.copyFrom(viewProjection).elements
  const x = frame.width / (frame.width + glowMargin * 2)
  const y = frame.height / (frame.height + glowMargin * 2)
  for (let column = 0; column < 16; column += 4) {
    clip[column] *= x
    clip[column + 1] *= y
  }
  return particleFrustum.setFromProjectionMatrix(cullMatrix)
}

function intersectsParticle(frustum: Frustum, x: number, y: number, z: number, radius: number): boolean {
  particleBounds.center.set(x, y, z)
  particleBounds.radius = radius
  return frustum.intersectsSphere(particleBounds)
}

/** Packed reference presentation data, rendered entirely through Effekseer handles. */
export class EffekseerParticles extends Container3D {
  readonly data: { f32: Float32Array, u32: Uint32Array, floatStride: number, offsets: Record<string, number> }
  readonly uniforms: Record<string, number | number[]> = {}
  readonly opaque: boolean
  private textures: Texture[]
  private slots: (Slot | undefined)[] = []
  private live: effekseer.EffekseerHandle[] = []
  private matrix = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1])
  private pyro: boolean
  private streak: boolean
  private beam: boolean
  private revision = 0
  constructor(private options: ParticleOptions) {
    super({ label: options.label })
    const f32 = new Float32Array(options.capacity * 4 * 24)
    this.data = { f32, u32: new Uint32Array(f32.buffer), floatStride: 24, offsets: { aParticleSizeRot: 12, aParticleColor: 20, aBirth: 28, aLife: 32, aVel: 36, aLook: 48, aMotion: 64, aBeamOther: 80 } }
    this.textures = Array.isArray(options.texture) ? options.texture : [options.texture]
    this.pyro = !!options.extraBits?.some(bit => bit.name === 'pyro' || bit.name === 'pyroStreak')
    this.streak = !!options.extraBits?.some(bit => bit.name === 'pyroStreak')
    this.beam = !!options.extraBits?.some(bit => bit.name === 'fxBeam')
    this.opaque = options.alphaMode === 'mask'
  }

  writePacked(index: number, x: number, y: number, z: number, size: number, rotation = 0, color = 0xFFFFFFFF, frame = 0): void {
    for (let vertex = 0; vertex < 4; vertex++) {
      const at = (index * 4 + vertex) * 24
      const { f32, u32 } = this.data
      f32[at] = x
      f32[at + 1] = y
      f32[at + 2] = z
      f32[at + 3] = size
      f32[at + 4] = rotation
      u32[at + 5] = color
      f32[at + 6] = frame
    }
  }

  setParticleAt(index: number, x: number, y: number, z: number, size: number, rotation = 0, color = 0xFFFFFF, alpha = 1, frame = 0): void {
    const packed = (color >> 16 & 255) | (color >> 8 & 255) << 8 | (color & 255) << 16 | Math.round(clamp(alpha) * 255) << 24
    this.writePacked(index, x, y, z, size, rotation, packed >>> 0, frame)
  }

  upload(): void { /* The pass reads the retained data after the camera has been prepared. */ }
  markDirty(_start: number, _end: number): void { /* Beam vertices share the retained buffer. */ }
  clear(): void {
    this.data.f32.fill(0)
    for (const slot of this.slots) slot?.handle.stop()
    this.slots.length = 0
    this.live.length = 0
  }

  private native(index: number, texture: Texture, mode: string): Slot {
    let names = frames.get(texture)
    if (!names) {
      names = new Map()
      frames.set(texture, names)
    }
    let name = names.get(mode)
    if (!name) {
      name = NightwardEffectManager.effectName(sources.get(texture.source)!, texture.frame, mode)
      if (name)
        names.set(mode, name)
    }
    if (!name)
      throw new Error(`Missing Nightward Effekseer frame: ${texture.label} (${mode})`)
    let slot = this.slots[index]
    if (slot?.name !== name) {
      slot?.handle.stop()
      const handle = context().play(EffectManager.load(`nightward/${name}`)!)
      handle.setSpeed(0)
      handle.setDynamicInput(2, Number(this.options.blendMode === undefined || this.options.blendMode === 'normal'))
      slot = { handle, name, revision: this.revision, matrix: new Float32Array(16) }
      this.slots[index] = slot
    }
    slot.revision = this.revision
    this.live.push(slot.handle)
    return slot
  }

  private releaseInactive(): void {
    for (let index = 0; index < this.slots.length; index++) {
      const slot = this.slots[index]
      if (slot && slot.revision !== this.revision) {
        slot.handle.stop()
        this.slots[index] = undefined
      }
    }
  }

  private appearance(slot: Slot, packed: number, value: number, alpha: number): void {
    const handle = slot.handle
    if (slot.color !== packed) {
      handle.setAllColor(packed & 255, packed >>> 8 & 255, packed >>> 16 & 255, packed >>> 24)
      slot.color = packed
    }
    if (slot.value !== value) {
      handle.setDynamicInput(0, value)
      slot.value = value
    }
    if (slot.alpha !== alpha) {
      handle.setDynamicInput(1, alpha)
      slot.alpha = alpha
    }
    const matrix = this.matrix
    for (let index = 0; index < matrix.length; index++) {
      if (matrix[index] !== slot.matrix[index]) {
        handle.setMatrix(matrix)
        slot.matrix.set(matrix)
        break
      }
    }
  }

  private transform(x: number, y: number, z: number, rx: number, ry: number, rz: number, ux: number, uy: number, uz: number): void {
    const m = this.matrix
    m[0] = rx
    m[1] = ry
    m[2] = rz
    m[4] = ux
    m[5] = uy
    m[6] = uz
    m[8] = ry * uz - rz * uy
    m[9] = rz * ux - rx * uz
    m[10] = rx * uy - ry * ux
    m[12] = x
    m[13] = y
    m[14] = z
  }

  prepare(camera: Camera3D, shown: boolean, frustum: Frustum): readonly effekseer.EffekseerHandle[] {
    this.live.length = 0
    this.revision++
    if (!shown) {
      this.releaseInactive()
      return this.live
    }
    const v = camera.view.elements
    const { f32: data, u32 } = this.data
    let rx = v[0]
    let ry = v[4]
    let rz = v[8]
    let ux = v[1]
    let uy = v[5]
    let uz = v[9]
    if (this.options.billboard === 'horizontal') {
      rx = 1
      ry = 0
      rz = 0
      ux = 0
      uy = 0
      uz = 1
    }
    else if (this.options.billboard === 'cylindrical') {
      const length = Math.hypot(rx, rz)
      rx /= length
      ry = 0
      rz /= length
      ux = 0
      uy = 1
      uz = 0
    }
    const time = this.uniforms.uParticleTime as number
    const aspect = this.options.aspect ?? 1
    for (let index = 0; index < this.options.capacity; index++) {
      const at = index * 96
      if (this.beam) {
        const end = at + 48
        const widthB = data[at + 3]!
        const widthA = data[end + 3]!
        if (widthA <= 0 && widthB <= 0)
          continue
        const ax = data[end]!
        const ay = data[end + 1]!
        const az = data[end + 2]!
        const bx = data[at]!
        const by = data[at + 1]!
        const bz = data[at + 2]!
        const dx = bx - ax
        const dy = by - ay
        const dz = bz - az
        const radius = (Math.abs(dx) + Math.abs(dy) + Math.abs(dz) + Math.max(Math.abs(widthA), Math.abs(widthB))) * 0.5
        if (!intersectsParticle(frustum, (ax + bx) * 0.5, (ay + by) * 0.5, (az + bz) * 0.5, radius))
          continue
        const flatX = dx * rx + dy * ry + dz * rz
        const flatY = dx * ux + dy * uy + dz * uz
        const length = Math.hypot(flatX, flatY)
        const dirX = length > 1e-5 ? flatX / length : 0
        const dirY = length > 1e-5 ? flatY / length : 1
        const sx = ux * dirX - rx * dirY
        const sy = uy * dirX - ry * dirY
        const sz = uz * dirX - rz * dirY
        const alx = ax - sx * widthA / 2
        const aly = ay - sy * widthA / 2
        const alz = az - sz * widthA / 2
        const arx = ax + sx * widthA / 2
        const ary = ay + sy * widthA / 2
        const arz = az + sz * widthA / 2
        const blx = bx - sx * widthB / 2
        const bly = by - sy * widthB / 2
        const blz = bz - sz * widthB / 2
        const brx = bx + sx * widthB / 2
        const bry = by + sy * widthB / 2
        const brz = bz + sz * widthB / 2
        const packedA = u32[end + 5]!
        const packedB = u32[at + 5]!
        const other = (packedB & 255) * 65536 + (packedB >>> 8 & 255) * 256 + (packedB >>> 16 & 255)
        this.transform((brx + arx) / 2, (bry + ary) / 2, (brz + arz) / 2, brx - blx, bry - bly, brz - blz, arx - blx, ary - bly, arz - blz)
        this.appearance(this.native(index * 2, this.textures[0]!, 'beam-a'), packedA, other, (packedB >>> 24) / 255)
        this.transform((alx + blx) / 2, (aly + bly) / 2, (alz + blz) / 2, alx - arx, aly - ary, alz - arz, blx - arx, bly - ary, blz - arz)
        this.appearance(this.native(index * 2 + 1, this.textures[0]!, 'beam-b'), packedA, other, (packedB >>> 24) / 255)
        continue
      }
      let size = data[at + 3]!
      if (size <= 0)
        continue
      let x = data[at]!
      let y = data[at + 1]!
      let z = data[at + 2]!
      let rotation = data[at + 4]!
      let age = 0
      let progress = 0
      let rightX = rx
      let rightY = ry
      let rightZ = rz
      let upX = ux
      let upY = uy
      let upZ = uz
      let span = size
      if (this.pyro) {
        age = time - data[at + 7]!
        const life = data[at + 8]!
        if (life <= 0 || age < 0 || age > life)
          continue
        progress = clamp(age / Math.max(life, 1e-6))
        const drag = data[at + 16]!
        const decay = drag > 1e-3 ? Math.exp(-drag * age) : 1
        const a = drag > 1e-3 ? (1 - decay) / drag : age
        const b = drag > 1e-3 ? (age - a) / drag : age * age * 0.5
        const gravity = this.uniforms.uGravity as number[]
        const scale = data[at + 17]!
        const vx = data[at + 9]!
        const vy = data[at + 10]!
        const vz = data[at + 11]!
        const tx = vx * a + gravity[0]! * scale * b
        const ty = vy * a + gravity[1]! * scale * b
        const tz = vz * a + gravity[2]! * scale * b
        x += tx
        y += ty
        z += tz
        size += (data[at + 14]! - size) * (1 - (1 - progress) ** (this.uniforms.uGrowth as number))
        rotation += data[at + 15]! * age
        if (this.streak) {
          const wx = vx * decay + gravity[0]! * scale * a
          const wy = vy * decay + gravity[1]! * scale * a
          const wz = vz * decay + gravity[2]! * scale * a
          const sx = wx * rx + wy * ry + wz * rz
          const sy = wx * ux + wy * uy + wz * uz
          const speed = Math.hypot(sx, sy)
          const reach = Math.min(speed * ((this.uniforms.uShutter as number) * data[at + 15]! + data[at + 19]!), Math.hypot(tx, ty, tz))
          const dx = speed > 1e-5 ? sx / speed : 0
          const dy = speed > 1e-5 ? sy / speed : 1
          upX = rx * dx + ux * dy
          upY = ry * dx + uy * dy
          upZ = rz * dx + uz * dy
          rightX = ux * dx - rx * dy
          rightY = uy * dx - ry * dy
          rightZ = uz * dx - rz * dy
          x -= upX * reach / 2
          y -= upY * reach / 2
          z -= upZ * reach / 2
          span = size + reach
          rotation = 0
        }
        else {
          span = size
        }
      }
      const width = size * aspect
      if (!intersectsParticle(frustum, x, y, z, (Math.abs(width) + Math.abs(span)) * 0.5))
        continue
      let heat = 1
      let alpha = 1
      if (this.pyro) {
        heat = data[at + 12]! + (data[at + 13]! - data[at + 12]!) * progress ** (this.uniforms.uCooling as number)
        alpha = clamp(age / (this.uniforms.uFadeIn as number)) * (1 - progress ** (this.uniforms.uFadeOut as number))
        const flicker = data[at + 18]!
        if (flicker > 0) {
          const vx = data[at + 9]!
          const vy = data[at + 10]!
          const vz = data[at + 11]!
          alpha *= 1 - flicker * fract(fract(vx * 0.1031 + vy * 0.1173 + vz * 0.0973 + Math.floor(time * 30) * 0.618034) * 97.31)
        }
        if (this.streak)
          alpha *= (size / span) ** (this.uniforms.uStreakFade as number)
        const depth = -(v[2] * x + v[6] * y + v[10] * z + v[14])
        alpha *= clamp((depth - 0.3) / (this.uniforms.uNearFade as number))
      }
      const cosine = Math.cos(rotation)
      const sine = Math.sin(rotation)
      this.transform(x, y, z, (rightX * cosine + upX * sine) * width, (rightY * cosine + upY * sine) * width, (rightZ * cosine + upZ * sine) * width, (upX * cosine - rightX * sine) * span, (upY * cosine - rightY * sine) * span, (upZ * cosine - rightZ * sine) * span)
      const mode = this.opaque ? 'mask' : this.options.blendMode ?? 'normal'
      this.appearance(this.native(index, this.textures[data[at + 6]!]!, mode), u32[at + 5]!, heat, alpha)
    }
    this.releaseInactive()
    return this.live
  }

  override destroy(): void {
    this.clear()
    super.destroy()
  }
}

/** Joins the scene's color/depth attachments before Pixi3D bloom, focus and lens effects. */
export class EffekseerPass extends Pass3D {
  private static frames = new WeakMap<Container3D, PreparedFrame>()
  readonly stage: 'afterOpaque' | 'afterTransparent'
  private handles: readonly effekseer.EffekseerHandle[] = []
  private globals = new Float32Array(4)
  private fog = new Float32Array(4)
  private locations = new WeakMap<WebGLProgram, { globals: WebGLUniformLocation | null, fog: WebGLUniformLocation | null }>()
  constructor(assets: Assets, private opaque = false) {
    super()
    this.stage = opaque ? 'afterOpaque' : 'afterTransparent'
    sources.set(assets.combat.glow.source, 'combat-fx')
    sources.set(assets.albedo.source, 'actors-albedo')
    sources.set(assets.effects[0]!.source, 'effects')
  }

  build(graph: RenderGraph): void {
    graph.addPass({
      name: this.opaque ? 'nightward-effekseer-art' : 'nightward-effekseer-fx',
      bit: RenderPassBit.NONE,
      setup: (builder) => {
        builder.writeColor(builder.targetColor)
        builder.writeDepth(builder.targetDepth)
      },
      prepare: session => this.prepare(session),
      render: session => this.render(session),
    })
  }

  private prepare(session: RenderSession): void {
    const root = session.view3d.root
    let frame = EffekseerPass.frames.get(root)
    if (!frame) {
      frame = { containers: [], opaque: [], transparent: [] }
      EffekseerPass.frames.set(root, frame)
    }
    if (frame.session !== session) {
      const { containers, opaque, transparent } = frame
      const camera = session.view3d.camera
      const view = camera.view.elements
      const frustum = prepareFrustum(camera)
      containers.length = 0
      opaque.length = 0
      transparent.length = 0
      const visit = (node: Container3D, shown: boolean): void => {
        shown &&= node.visible
        if (node instanceof EffekseerParticles) {
          const world = node.worldTransform.elements
          containers.push({ node, shown, depth: -(view[2] * world[12] + view[6] * world[13] + view[10] * world[14] + view[14]) })
        }
        for (const child of node.children) visit(child, shown)
      }
      visit(root, true)
      containers.sort((a, b) => b.depth - a.depth)
      for (const entry of containers) {
        const handles = entry.node.opaque ? opaque : transparent
        for (const handle of entry.node.prepare(camera, entry.shown, frustum)) handles.push(handle)
      }
      // updateHandle scans native instance chunks per handle. One bulk update
      // refreshes every zero-speed instance after this frame's poses are ready.
      context().update()
      frame.session = session
    }
    this.handles = this.opaque ? frame.opaque : frame.transparent
  }

  private render(session: RenderSession): void {
    if (!this.handles.length)
      return
    const runtime = context()
    const camera = session.view3d.camera
    const renderer = session.renderer as WebGLRenderer
    const data = getCameraData(camera)
    runtime.setCameraMatrix(data.view.elements)
    runtime.setProjectionMatrix(data.projection.elements)
    const gl = renderer.gl
    const useProgram = gl.useProgram
    const drawElements = gl.drawElements
    let program = gl.getParameter(gl.CURRENT_PROGRAM) as WebGLProgram | null
    this.globals.set([session.view3d.exposure, camera.near, camera.far, 1.5])
    const uniforms = session.globalUniformGroup!.uniforms
    this.fog.set(uniforms.uFogColor as Float32Array)
    this.fog[3] = (uniforms.uFogParams as Float32Array)[2]!
    // The 1.70 JS API has no material-uniform setter. Supply the view-global
    // uniforms at the GL draw boundary; Effekseer still owns geometry and shading.
    gl.useProgram = (value) => {
      program = value
      useProgram.call(gl, value)
    }
    gl.drawElements = (mode, count, type, offset) => {
      if (program) {
        let locations = this.locations.get(program)
        if (!locations) {
          locations = { globals: gl.getUniformLocation(program, 'nightwardGlobals'), fog: gl.getUniformLocation(program, 'nightwardFog') }
          this.locations.set(program, locations)
        }
        if (locations.globals)
          gl.uniform4fv(locations.globals, this.globals)
        if (locations.fog)
          gl.uniform4fv(locations.fog, this.fog)
      }
      drawElements.call(gl, mode, count, type, offset)
    }
    try {
      runtime.beginDraw()
      for (const handle of this.handles) runtime.drawHandle(handle)
      runtime.endDraw()
    }
    finally {
      gl.useProgram = useProgram
      gl.drawElements = drawElements
      // Effekseer leaves FRONT_AND_BACK; Pixi only resets the culling toggle.
      gl.cullFace(gl.BACK)
      renderer.resetState()
      // resetState clears the winding inversion of the still-bound 3D target.
      renderer.renderTarget.onRenderTargetChange.emit(renderer.renderTarget.renderTarget)
      session.activeTarget = null
    }
  }
}
