import { Geometry3D, Matrix3, Matrix4, Mesh3D, ParticleContainer3D, PointLight } from '@pixi/3d'
import type { BaseMaterial3D, View3D } from '@pixi/3d'
import type { Assets, ModelMesh, PropLight } from './assets'
import type { Prop } from './props'
import type { RunSession } from './session'
import { EffekseerParticles } from './effekseer'
import { transformPoint } from './prop-scene'

interface Span { prop: Prop, mesh: ModelMesh, at: number, version: number }
interface Batch { node: Mesh3D, geometry: Geometry3D, positions: Float32Array, normals: Float32Array, spans: Span[] }
interface Emitter { prop: Prop, light: PropLight, fire?: EffekseerParticles, afterglow?: EffekseerParticles }
interface Door { prop: Prop, node: Mesh3D, mesh: ModelMesh }
export class PropView {
  private batches: Batch[] = []
  private emitters: Emitter[] = []
  private doors: Door[] = []
  private lamps: PointLight[] = []
  private glows?: ParticleContainer3D
  private revision = -1
  private geometryRevision = -1
  constructor(private run: RunSession, private assets: Assets, private view: View3D, private material: (name: string) => BaseMaterial3D) {
    for (let index = 0; index < 8; index++) {
      const light = new PointLight({ intensity: 0, range: 1 })
      light.visible = false; view.root.addChild(light); this.lamps.push(light)
    }
  }
  private clear(): void {
    for (const batch of this.batches) { batch.node.destroy(); batch.geometry.destroy() }
    for (const door of this.doors) door.node.destroy()
    for (const emitter of this.emitters) { emitter.fire?.destroy(); emitter.afterglow?.destroy() }
    this.glows?.destroy(); this.glows = undefined
    this.batches = []; this.doors = []; this.emitters = []
  }
  private rebuild(): void {
    this.clear()
    const groups = new Map<string, { prop: Prop, mesh: ModelMesh }[]>()
    for (const prop of this.run.world.props) {
      for (const mesh of prop.model.meshes) {
        if (mesh.doorSide !== undefined) {
          const node = new Mesh3D({ geometry: mesh.geometry, material: this.material(mesh.material), castShadow: true, receiveShadow: true })
          this.view.root.addChild(node); this.doors.push({ prop, node, mesh })
        }
        else {
          const group = groups.get(mesh.material) ?? []
          group.push({ prop, mesh }); groups.set(mesh.material, group)
        }
      }
      for (const light of prop.model.lights) {
        let fire: EffekseerParticles | undefined, afterglow: EffekseerParticles | undefined
        if (light.kind === 'fire') {
          const animation = this.assets.animations['brazier.fire']!
          fire = new EffekseerParticles({ texture: animation.textures, capacity: 1, billboard: 'cylindrical', blendMode: 'normal', aspect: animation.width / animation.height })
          afterglow = new EffekseerParticles({ texture: this.assets.effects[0]!, capacity: 2, billboard: 'spherical', blendMode: 'add' })
          this.view.root.addChild(fire, afterglow)
        }
        this.emitters.push({ prop, light, fire, afterglow })
      }
    }
    for (const [name, group] of groups) {
      const sources = group.map(entry => ({ ...entry, values: entry.mesh.values }))
      const vertexCount = sources.reduce((sum, source) => sum + source.values.positions.length / 3, 0)
      const positions = new Float32Array(vertexCount * 3), normals = new Float32Array(vertexCount * 3), uvs = new Float32Array(vertexCount * 2), colors = new Uint8Array(vertexCount * 4)
      const indices = vertexCount > 65535 ? new Uint32Array(sources.reduce((sum, source) => sum + source.values.indices.length, 0)) : new Uint16Array(sources.reduce((sum, source) => sum + source.values.indices.length, 0))
      const spans: Span[] = []
      let vertex = 0, element = 0
      for (const { prop, mesh, values } of sources) {
        normals.set(values.normals, vertex * 3); uvs.set(values.uvs, vertex * 2); colors.set(values.colors, vertex * 4)
        for (const index of values.indices) indices[element++] = vertex + index
        spans.push({ prop, mesh, at: vertex * 3, version: -1 })
        vertex += values.positions.length / 3
      }
      const geometry = new Geometry3D({ positions, normals, uvs, colors, indices, dynamic: true, interleave: false })
      const node = new Mesh3D({ geometry, material: this.material(name), castShadow: !['grass', 'dirt', 'cobble', 'flagstone', 'glass', 'bark', 'thicket', 'sky'].includes(name), receiveShadow: true })
      this.view.root.addChild(node); this.batches.push({ node, geometry, positions, normals, spans })
    }
    this.glows = new ParticleContainer3D({ texture: [this.assets.effects[0]!, this.assets.effects[4]!], capacity: Math.max(1, this.emitters.length * 2), billboard: 'spherical', blendMode: 'add' })
    this.view.root.addChild(this.glows)
    this.revision = this.run.world.propsRevision
    this.geometryRevision = -1
  }
  update(time: number): void {
    if (this.revision !== this.run.world.propsRevision) this.rebuild()
    if (this.geometryRevision !== this.run.props.revision) {
      const matrix = new Matrix4(), normal = new Matrix3()
      for (const batch of this.batches) {
        let dirty = false
        for (const span of batch.spans) {
          const prop = span.prop
          if (span.version === prop.revision) continue
          matrix.multiplyMatrices(prop.matrix, span.mesh.matrix); normal.getNormalMatrix(matrix)
          const m = matrix.elements, n = normal.elements, local = span.mesh.values.positions, normals = span.mesh.values.normals
          for (let index = 0; index < local.length; index += 3) {
            const x = local[index]!, y = local[index + 1]!, z = local[index + 2]!
            batch.positions[span.at + index] = prop.active ? m[0]! * x + m[4]! * y + m[8]! * z + m[12]! : prop.x
            batch.positions[span.at + index + 1] = prop.active ? m[1]! * x + m[5]! * y + m[9]! * z + m[13]! : prop.y
            batch.positions[span.at + index + 2] = prop.active ? m[2]! * x + m[6]! * y + m[10]! * z + m[14]! : prop.z
            const nx = normals[index]!, ny = normals[index + 1]!, nz = normals[index + 2]!
            const tx = n[0]! * nx + n[3]! * ny + n[6]! * nz, ty = n[1]! * nx + n[4]! * ny + n[7]! * nz, tz = n[2]! * nx + n[5]! * ny + n[8]! * nz
            const length = Math.hypot(tx, ty, tz) || 1
            batch.normals[span.at + index] = tx / length; batch.normals[span.at + index + 1] = ty / length; batch.normals[span.at + index + 2] = tz / length
          }
          span.version = prop.revision; dirty = true
        }
        if (dirty) { batch.geometry.attributes.aPosition!.buffer.update(); batch.geometry.attributes.aNormal!.buffer.update() }
      }
      this.geometryRevision = this.run.props.revision
    }
    const matrix = new Matrix4(), rotation = new Matrix4()
    for (const { prop, node, mesh } of this.doors) {
      const open = this.run.props.doorAmount(prop, this.run.time), angle = open * open * (3 - 2 * open) * 1.75
      node.visible = prop.active
      matrix.multiplyMatrices(prop.matrix, mesh.matrix).multiply(rotation.makeRotationY(mesh.doorSide! * angle))
      matrix.decompose(node.position, node.quaternion, node.scale)
    }
    const candidates: { x: number, y: number, z: number, color: number, intensity: number, range: number, radius: number, priority: number }[] = []
    const glow = this.glows!
    for (const [index, entry] of this.emitters.entries()) {
      const { prop, light, fire, afterglow } = entry
      const { x, y, z } = transformPoint(prop.matrix, light.x, light.y, light.z)
      const localPoint = (px: number, py: number, pz: number): { x: number, y: number, z: number } => transformPoint(prop.matrix, px, py, pz)
      const fireScale = Math.hypot(prop.matrix.elements[4]!, prop.matrix.elements[5]!, prop.matrix.elements[6]!)
      const open = this.run.props.doorAmount(prop, this.run.time)
      glow.setParticleAt(index * 2, x, y, z, 0)
      glow.setParticleAt(index * 2 + 1, x, y, z, 0)
      if (fire) fire.visible = prop.active && !prop.broken
      if (afterglow) afterglow.visible = prop.active && prop.broken
      if (!prop.active) continue
      let color = light.color, intensity = light.intensity, range = light.range, lamp = localPoint(light.x, light.lampY ?? light.y, light.z), radius = .1
      if (fire) {
        const animation = this.assets.animations['brazier.fire']!
        fire.position.set(x, y, z)
        afterglow!.position.copyFrom(localPoint(light.x, .95, light.z))
        fire.setParticleAt(0, x, y + animation.height * fireScale / 2, z, animation.height * fireScale, 0, 0xffffff, 1, Math.floor(time * animation.fps + prop.seed) % animation.textures.length)
        if (prop.broken) {
          const flash = Math.exp(-(time - prop.brokenAt) * 7), flicker = .75 + .25 * Math.sin(time * 1.7 + index * 2.3)
          const upper = localPoint(light.x, .95, light.z), lower = localPoint(light.x, .15, light.z + .3)
          afterglow!.setParticleAt(0, upper.x, upper.y, upper.z, (1.1 + flash * 3) * fireScale, 0, 0xff3a10, Math.min(1, .32 * flicker + flash * .8))
          afterglow!.setParticleAt(1, lower.x, lower.y, lower.z, .9 * fireScale, 0, 0xff3a10, .22 * flicker)
          intensity = 4 * flicker + flash * 60; color = flash > .2 ? light.color : 0xff3a10; range = 4; lamp = localPoint(light.x, .9, light.z)
        }
        else { intensity *= 1 + Math.sin(time * 12 + index) * .1; radius = .8 }
      }
      else if (light.kind === 'crypt') {
        const pulse = .85 + .15 * Math.sin(time * 3.1) * Math.sin(time * 1.3)
        intensity = 36 * open * pulse
        if (open > .01) {
          const entrance = prop.model.door!.z - .05, upper = localPoint(0, 1.9, entrance + .4), lower = localPoint(0, 1.6, entrance + .2)
          glow.setParticleAt(index * 2, upper.x, upper.y, upper.z, 5.5 * open * pulse, 0, 10498303, .4)
          glow.setParticleAt(index * 2 + 1, lower.x, lower.y, lower.z, 2.4 * open, 0, 16736448, .5)
        }
      }
      else {
        const pulse = 1 + .07 * Math.sin(time * 2.3 + index * 1.71) + .05 * Math.sin(time * 7.9 + index * 2.93) + .03 * Math.sin(time * 17.3 + index * .57)
        intensity *= pulse
        if (light.kind === 'candle-flame') {
          glow.setParticleAt(index * 2, x, y, z, .12 * pulse, 0, 16756816, .75, 1)
          glow.setParticleAt(index * 2 + 1, x, y + .02, z, .7, 0, 16751168, .16)
        }
        else if (light.kind === 'window') {
          const size = light.size!
          glow.setParticleAt(index * 2, x, y, z, size * pulse, 0, color, .2)
          glow.setParticleAt(index * 2 + 1, x, y, z + .2, size * .45 * pulse, 0, 16765088, .12)
        }
      }
      if (intensity > .05) candidates.push({ ...lamp, color, intensity, range, radius, priority: Math.hypot(x - this.run.hero.x, z - this.run.hero.z) / (fire ? 1.7 : light.kind === 'window' ? 1.4 : 1) })
    }
    glow.upload()
    candidates.sort((a, b) => a.priority - b.priority)
    for (const [index, lamp] of this.lamps.entries()) {
      const light = candidates[index]
      lamp.visible = !!light && Math.hypot(light.x - this.run.hero.x, light.z - this.run.hero.z) < 24
      if (!light) continue
      lamp.position.set(light.x, light.y, light.z); lamp.color.setValue(light.color); lamp.intensity = light.intensity; lamp.range = light.range; lamp.radius = light.radius
    }
  }
  destroy(): void { this.clear(); for (const light of this.lamps) light.destroy() }
}
