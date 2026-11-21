import { Geometry3D, Mesh3D, ParticleContainer3D, PointLight, Sprite3D } from '@pixi/3d'
import type { BaseMaterial3D, View3D } from '@pixi/3d'
import type { Assets, ModelMesh, PropLight } from './assets'
import type { Prop } from './props'
import type { RunSession } from './session'

interface Span { prop: Prop, local: Float32Array, offset: { x: number, y: number, z: number }, at: number, version: number }
interface Batch { node: Mesh3D, geometry: Geometry3D, positions: Float32Array, spans: Span[] }
interface Emitter { prop: Prop, light: PropLight, fire?: Sprite3D }
interface Door { prop: Prop, node: Mesh3D, side: number }
export class PropView {
  private batches: Batch[] = []
  private emitters: Emitter[] = []
  private doors: Door[] = []
  private doorGeometries: Geometry3D[] = []
  private lamps: PointLight[] = []
  private glows?: ParticleContainer3D
  private revision = -1
  constructor(private run: RunSession, private assets: Assets, private view: View3D, private material: (name: string) => BaseMaterial3D) {
    for (let index = 0; index < 8; index++) {
      const light = new PointLight({ intensity: 0, range: 1 })
      light.visible = false; view.root.addChild(light); this.lamps.push(light)
    }
  }
  private values(mesh: ModelMesh): { positions: Float32Array, normals: Float32Array, uvs: Float32Array, colors: Uint8Array, indices: Uint16Array | Uint32Array } {
    const binary = this.assets.geometry, a = mesh.attributes
    return {
      positions: new Float32Array(binary, a.positions.offset, a.positions.length), normals: new Float32Array(binary, a.normals.offset, a.normals.length),
      uvs: new Float32Array(binary, a.uvs.offset, a.uvs.length), colors: new Uint8Array(binary, a.colors.offset, a.colors.length),
      indices: a.indices.type === 'Uint32Array' ? new Uint32Array(binary, a.indices.offset, a.indices.length) : new Uint16Array(binary, a.indices.offset, a.indices.length),
    }
  }
  private clear(): void {
    for (const batch of this.batches) { batch.node.destroy(); batch.geometry.destroy() }
    for (const door of this.doors) door.node.destroy()
    for (const geometry of this.doorGeometries) geometry.destroy()
    for (const emitter of this.emitters) emitter.fire?.destroy()
    this.glows?.destroy(); this.glows = undefined
    this.batches = []; this.doors = []; this.doorGeometries = []; this.emitters = []
  }
  private rebuild(): void {
    this.clear()
    const groups = new Map<string, { prop: Prop, mesh: ModelMesh }[]>()
    for (const prop of this.run.world.props) {
      for (const mesh of prop.model.meshes) {
        if (mesh.kind === 'door') {
          const geometry = new Geometry3D(this.values(mesh))
          this.doorGeometries.push(geometry)
          for (const side of [-1, 1]) {
            const node = new Mesh3D({ geometry, material: this.material(mesh.material), castShadow: true, receiveShadow: true })
            this.view.root.addChild(node); this.doors.push({ prop, node, side })
          }
        }
        else {
          const group = groups.get(mesh.material) ?? []
          group.push({ prop, mesh }); groups.set(mesh.material, group)
        }
      }
      for (const light of prop.model.lights) {
        let fire: Sprite3D | undefined
        if (light.kind === 'fire') {
          const animation = this.assets.animations['brazier.fire']!
          fire = new Sprite3D({ texture: animation.textures[0]!, height: animation.height, billboardMode: 'cylindrical', anchor: { x: .5, y: 1 }, alphaMode: 'blend' })
          this.view.root.addChild(fire)
        }
        this.emitters.push({ prop, light, fire })
      }
    }
    for (const [name, group] of groups) {
      const sources = group.map(entry => ({ ...entry, values: this.values(entry.mesh) }))
      const vertexCount = sources.reduce((sum, source) => sum + source.values.positions.length / 3, 0)
      const positions = new Float32Array(vertexCount * 3), normals = new Float32Array(vertexCount * 3), uvs = new Float32Array(vertexCount * 2), colors = new Uint8Array(vertexCount * 4)
      const indices = vertexCount > 65535 ? new Uint32Array(sources.reduce((sum, source) => sum + source.values.indices.length, 0)) : new Uint16Array(sources.reduce((sum, source) => sum + source.values.indices.length, 0))
      const spans: Span[] = []
      let vertex = 0, element = 0
      for (const { prop, mesh, values } of sources) {
        normals.set(values.normals, vertex * 3); uvs.set(values.uvs, vertex * 2); colors.set(values.colors, vertex * 4)
        for (const index of values.indices) indices[element++] = vertex + index
        spans.push({ prop, local: values.positions, offset: mesh.offset ?? { x: 0, y: 0, z: 0 }, at: vertex * 3, version: -1 })
        vertex += values.positions.length / 3
      }
      const geometry = new Geometry3D({ positions, normals, uvs, colors, indices, dynamic: true, interleave: false })
      const node = new Mesh3D({ geometry, material: this.material(name), castShadow: !['grass', 'dirt', 'cobble', 'flagstone', 'glass', 'bark', 'thicket', 'sky'].includes(name), receiveShadow: true })
      this.view.root.addChild(node); this.batches.push({ node, geometry, positions, spans })
    }
    this.glows = new ParticleContainer3D({ texture: [this.assets.effects[0]!, this.assets.effects[4]!], capacity: Math.max(1, this.emitters.length * 2), billboard: 'spherical', blendMode: 'add' })
    this.view.root.addChild(this.glows)
    this.revision = this.run.world.propsRevision
  }
  update(time: number): void {
    if (this.revision !== this.run.world.propsRevision) this.rebuild()
    for (const batch of this.batches) {
      let dirty = false
      for (const span of batch.spans) {
        const prop = span.prop
        if (span.version === prop.revision) continue
        for (let index = 0; index < span.local.length; index += 3) {
          batch.positions[span.at + index] = prop.x + (prop.active ? span.local[index]! + span.offset.x : 0)
          batch.positions[span.at + index + 1] = prop.y + (prop.active ? span.local[index + 1]! + span.offset.y : 0)
          batch.positions[span.at + index + 2] = prop.z + (prop.active ? span.local[index + 2]! + span.offset.z : 0)
        }
        span.version = prop.revision; dirty = true
      }
      if (dirty) batch.geometry.attributes.aPosition!.buffer.update()
    }
    const open = Math.max(0, Math.min(1, (this.run.time - 170) / 10)), angle = open * open * (3 - 2 * open) * 1.75
    for (const { prop, node, side } of this.doors) {
      const door = prop.model.door!
      node.visible = prop.active
      node.position.set(prop.x + side * door.hingeX, prop.y + door.y, prop.z + door.z - .12)
      node.rotation.y = side > 0 ? Math.PI + angle : -angle
    }
    const candidates: { x: number, y: number, z: number, color: number, intensity: number, range: number, radius: number, priority: number }[] = []
    const glow = this.glows!
    for (const [index, entry] of this.emitters.entries()) {
      const { prop, light, fire } = entry
      const x = prop.x + light.x, y = prop.y + light.y, z = prop.z + light.z
      glow.setParticleAt(index * 2, x, y, z, 0)
      glow.setParticleAt(index * 2 + 1, x, y, z, 0)
      if (fire) fire.visible = prop.active && !prop.broken
      if (!prop.active) continue
      let color = light.color, intensity = light.intensity, range = light.range, lampY = prop.y + (light.lampY ?? light.y), radius = .1
      if (fire) {
        const animation = this.assets.animations['brazier.fire']!
        fire.position.set(x, y, z)
        fire.texture = animation.textures[Math.floor(time * animation.fps + prop.id) % animation.textures.length]!
        if (prop.broken) {
          const flash = Math.exp(-(time - prop.brokenAt) * 7), flicker = .75 + .25 * Math.sin(time * 1.7 + index * 2.3)
          glow.setParticleAt(index * 2, x, prop.y + .95, z, 1.1 + flash * 3, 0, 0xff3a10, Math.min(1, .32 * flicker + flash * .8))
          glow.setParticleAt(index * 2 + 1, x, prop.y + .15, z + .3, .9, 0, 0xff3a10, .22 * flicker)
          intensity = 4 * flicker + flash * 60; color = flash > .2 ? light.color : 0xff3a10; range = 4; lampY = prop.y + .9
        }
        else { intensity *= 1 + Math.sin(time * 12 + index) * .1; radius = .8 }
      }
      else if (light.kind === 'crypt') {
        const pulse = .85 + .15 * Math.sin(time * 3.1) * Math.sin(time * 1.3)
        intensity = 36 * open * pulse
        if (open > .01) {
          const entrance = prop.z + prop.model.door!.z - .05
          glow.setParticleAt(index * 2, prop.x, prop.y + 1.9, entrance + .4, 5.5 * open * pulse, 0, 10498303, .4)
          glow.setParticleAt(index * 2 + 1, prop.x, prop.y + 1.6, entrance + .2, 2.4 * open, 0, 16736448, .5)
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
      if (intensity > .05) candidates.push({ x, y: lampY, z, color, intensity, range, radius, priority: Math.hypot(x - this.run.hero.x, z - this.run.hero.z) / (fire ? 1.7 : light.kind === 'window' ? 1.4 : 1) })
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
