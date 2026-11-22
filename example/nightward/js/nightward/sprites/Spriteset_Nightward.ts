import type { BaseMaterial3D, Pass3D } from '@pixi/3d'
import type { DestroyOptions } from 'pixi.js'
import type { Assets, Look } from '../managers/NightwardAssetManager'
import type { Game_NightwardRun, RunEvent } from '../objects/Game_NightwardRun'
import type { Point } from '../primitives/geometry'
import { Camera3D, DirectionalLight, Mesh3D, Sprite3D, View3D } from '@pixi/3d'
import { BloomEffect, TiltShiftEffect } from '@pixi/3d/extras'
import { Container } from 'pixi.js'
import { Graphics, Sprite } from 'rmmz-next'
import { NightwardManager } from '../managers/NightwardManager'
import { NightwardConfig } from '../patches/ConfigManager'
import { FRAME_DT, mixColor } from '../primitives/ui'
import { EffekseerPass } from './Effekseer'
import { Spriteset_NightwardActors } from './Spriteset_NightwardActors'
import { Spriteset_NightwardEffects } from './Spriteset_NightwardEffects'
import { Spriteset_NightwardGround } from './Spriteset_NightwardGround'
import { Spriteset_NightwardProps } from './Spriteset_NightwardProps'

const lookColorKeys = new Set<keyof Look>(['shadowTint', 'highlightTint', 'tint', 'fogColor', 'moonColor', 'skyColor', 'groundColor', 'skyTop', 'skyHorizon'])

interface Particle { sprite: Sprite3D, life: number, age: number, vx: number, vy: number, vz: number, size: number }

/**
 * The 3D + 2D spriteset for Nightward scenes, following RMMZ's Spriteset template
 * (createLowerLayer / createUpperLayer / zero-arg update).
 */
export class Spriteset_Nightward extends Sprite {
  readonly view!: View3D
  readonly overlay = new Container()
  readonly framing = { pitch: 42, distance: 24 }

  private passes: Pass3D[] = []
  private moonDisc!: Sprite3D
  private moon!: DirectionalLight
  private look!: Look
  private environment = { skyColor: 0, groundColor: 0, intensity: 0 }
  private sky = { skyColor: 0, groundColor: 0, intensity: 1 }
  private fog = { type: 'exp2' as const, color: 0, density: 0 }
  private ambient: { sprite: Sprite3D, height: number, phase: number, leaf: boolean }[] = []
  private worldProps!: Spriteset_NightwardProps
  private ground!: Spriteset_NightwardGround
  private actorsLayer!: Spriteset_NightwardActors
  private weapons!: Spriteset_NightwardEffects
  private propMaterial!: (name: string) => BaseMaterial3D
  private particles: Particle[] = []
  private focus: Point
  private shake = 0
  private clock = 0
  private introAge = -1
  private dawnAge = -1
  private dawnFrom?: Look

  constructor(readonly run: Game_NightwardRun, private assets: Assets) {
    super()
    this.setFrame(0, 0, Graphics.width, Graphics.height)
    this.focus = { x: run.hero.x, z: run.hero.z }
    this.createLowerLayer()
    this.createUpperLayer()
    this.stepFrame([], 0)
    run.isSpawnVisible = (point) => {
      const screen = this.worldToScreen({ x: point.x, y: 0.5, z: point.z })
      return !!screen && screen.x > -40 && screen.x < Graphics.width + 40 && screen.y > -40 && screen.y < Graphics.height + 40
    }
  }

  protected createLowerLayer(): void {
    this.createView3D()
    this.createLighting()
    this.createGround()
    this.createEnvironment()
    this.createProps()
    this.createAmbient()
    this.createCharacters()
    this.createEffects()
  }

  protected createUpperLayer(): void {
    this.addChild(this.view, this.overlay)
  }

  private createView3D(): void {
    const look = this.assets.manifest.look[this.run.demo ? 'title' : 'play']
    this.look = { ...look }
    if (this.run.demo)
      Object.assign(this.framing, { pitch: 36, distance: 27 })
    this.environment = { skyColor: look.skyColor, groundColor: look.groundColor, intensity: look.hemisphere }
    this.fog = { type: 'exp2', color: look.fogColor, density: look.fogDensity }
    this.sky = { skyColor: look.skyTop, groundColor: look.skyHorizon, intensity: 1 }
    const view = new View3D({
      width: Graphics.width,
      height: Graphics.height,
      autoResize: false,
      camera: new Camera3D({ fov: 32, near: 0.5, far: 500 }),
      background: this.sky,
      environment: this.environment,
      fog: this.fog,
      shadowQuality: 'high',
      shadowFilter: 'pcf',
      toneMapping: 'aces',
      exposure: look.exposure,
    })
    view.eventMode = 'none'
    ;(this as { view: View3D }).view = view
  }

  private createLighting(): void {
    const look = this.look
    const moon = this.moon = new DirectionalLight({
      color: look.moonColor,
      intensity: look.moonIntensity,
      castShadow: true,
      shadow: { cascades: 1, maxDistance: 45, bias: 0.0015 },
    })
    const azimuth = -24 * Math.PI / 180
    const elevation = 31 * Math.PI / 180
    moon.position.set(Math.sin(azimuth) * Math.cos(elevation) * 60, Math.sin(elevation) * 60, -Math.cos(azimuth) * Math.cos(elevation) * 60)
    moon.lookAt({ x: 0, y: 0, z: 0 })
    this.view.root.addChild(moon)

    this.moonDisc = new Sprite3D({ texture: this.assets.moon, width: 23.5, height: 23.5, billboardMode: 'spherical' })
    this.view.root.addChild(this.moonDisc)

    for (const point of this.assets.manifest.details.candles) {
      const glow = this.sprite(this.assets.effects[0]!, 0.24)
      glow.tint = 0xFFC477
      glow.position.set(point[0]!, point[1]!, point[2]!)
    }
  }

  private createGround(): void {
    this.ground = new Spriteset_NightwardGround(this.view, this.run.content.map.center)
  }

  private createEnvironment(): void {
    const scene = this.run.propScene
    this.propMaterial = name => scene.materials.get(name)!
    for (const mesh of scene.environment) {
      const node = new Mesh3D({
        geometry: mesh.geometry,
        material: this.propMaterial(mesh.material),
        castShadow: !['grass', 'dirt', 'cobble', 'flagstone', 'glass', 'bark', 'thicket', 'sky'].includes(mesh.material),
        receiveShadow: mesh.material !== 'sky',
      })
      mesh.matrix.decompose(node.position, node.quaternion, node.scale)
      this.view.root.addChild(node)
    }
  }

  private createProps(): void {
    this.worldProps = new Spriteset_NightwardProps(this.run, this.assets, this.view, this.propMaterial)
  }

  private createAmbient(): void {
    for (let index = 0; index < 48; index++) {
      const leaf = index >= 12
      const node = new Sprite3D({
        texture: leaf ? this.assets.leaves[index % 4]! : this.assets.mist,
        height: leaf ? 0.12 + index % 3 * 0.04 : 3,
        width: leaf ? 0.2 : 10,
        billboardMode: 'spherical',
        alphaMode: leaf ? 'mask' : 'blend',
        tint: leaf ? 0xFFFFFF : 0x8A9BAA,
        alpha: leaf ? 0.8 : 0.065,
      })
      const phase = index * 2.39996
      const height = leaf ? 0.5 + index % 7 * 0.5 : 1.1
      node.position.set(Math.cos(phase) * (5 + index % 22), height, 6 + Math.sin(phase) * (5 + index % 22))
      this.view.root.addChild(node)
      this.ambient.push({ sprite: node, height, phase, leaf })
    }
  }

  private createCharacters(): void {
    this.actorsLayer = new Spriteset_NightwardActors(this.run, this.assets, this.view)
  }

  private createEffects(): void {
    const look = this.look
    const gl = Graphics.app.renderer.gl
    if (gl.getExtension('EXT_color_buffer_float')) {
      this.passes = [
        new TiltShiftEffect({ focalDepth: 22.25, focalNear: 24 * look.focus + 1.75, focalFar: 24 * (look.focus + 0.22) + 1.75, maxBlur: look.tilt }),
        new BloomEffect({ threshold: look.bloomThreshold, intensity: look.bloomIntensity, radius: look.bloomRadius, levels: 5 }),
      ]
    }
    this.weapons = new Spriteset_NightwardEffects(this.run, this.assets, this.view)
    this.passes.push(new EffekseerPass(this.assets, true), new EffekseerPass(this.assets), this.weapons.pass)
    this.view.passes = this.passes
  }

  worldToScreen(point: { x: number, y: number, z: number }): { x: number, y: number } | null {
    return this.view.worldToScreen(point)
  }

  beginIntro(fromTitle: boolean): void {
    if (!fromTitle)
      return
    this.look = { ...this.assets.manifest.look.title }
    this.introAge = 0
    Object.assign(this.framing, { pitch: 36, distance: 27 })
    this.stepFrame([], 0)
  }

  beginDawn(): void {
    this.dawnFrom = { ...this.look }
    this.dawnAge = 0
  }

  override update(): void {
    super.update()
    const dt = NightwardManager.isSimulationFrozen() ? 0 : FRAME_DT
    const events = this.run.drainEffectEvents()
    this.stepFrame(events, dt)
  }

  private sprite(texture: Assets['effects'][number], height: number): Sprite3D {
    const node = new Sprite3D({ texture, height, billboardMode: 'cylindrical', anchor: 0.5, alphaMode: 'blend' })
    this.view.root.addChild(node)
    return node
  }

  private flat(frame: number, width: number, height: number, y: number): Sprite3D {
    const node = new Sprite3D({ texture: this.assets.effects[frame]!, width, height, billboardMode: 'none', alphaMode: 'blend' })
    node.rotation.x = -Math.PI / 2
    node.y = y
    this.view.root.addChild(node)
    return node
  }

  private particle(point: Point, color: number, count: number, strength = 1): void {
    for (let i = 0; i < count; i++) {
      const node = this.sprite(this.assets.effects[0]!, 0.13 * strength)
      node.tint = color
      node.position.set(point.x, 0.7, point.z)
      this.particles.push({ sprite: node, age: 0, life: 0.3 + Math.random() * 0.35, vx: (Math.random() - 0.5) * 4 * strength, vy: Math.random() * 3, vz: (Math.random() - 0.5) * 4 * strength, size: 0.13 * strength })
    }
  }

  private burst(event: RunEvent): void {
    if (event.kind === 'hit' || event.kind === 'death' || event.kind === 'break' || event.kind === 'lash' || event.kind === 'wand' || event.kind === 'tomes' || event.kind === 'lightning' || event.kind === 'ward' || event.kind === 'flask' || event.kind === 'pickup')
      return
    if (event.kind === 'hurt') {
      this.shake = 0.26
      this.particle(event, 0xDC6577, 9)
      return
    }
    if (event.kind === 'upgrade' || event.kind === 'chest') {
      this.particle(event, 0xF7DA83, 16)
      return
    }
    if (event.kind === 'boss' || event.kind === 'bossDeath' || event.kind === 'ring') {
      if (event.kind !== 'ring')
        this.shake = 0.6
      return
    }
    let node: Sprite3D
    let life = 0.35
    if (event.kind === 'scythe' || event.kind === 'windup') {
      node = this.flat(3, 4, event.kind === 'windup' ? 1 : 2, 0.12)
      node.rotation.z = event.side!
      node.tint = 0xF07C99
      life = event.kind === 'windup' ? 0.45 : 0.25
    }
    else {
      const size = event.value! * 2
      node = this.flat(3, size, size, 0.05)
      node.tint = 0xFFF0B8
      if (event.kind === 'relic') {
        life = 0.65
        this.shake = 0.4
      }
    }
    node.x = event.x
    node.z = event.z
    this.particles.push({ sprite: node, age: 0, life, vx: 0, vy: 0, vz: 0, size: 0 })
  }

  private updateLook(dt: number): void {
    const target = this.assets.manifest.look[this.run.demo ? 'title' : this.run.bossDefeated ? 'dawn' : this.run.boss ? 'boss' : 'play']
    const amount = Math.min(1, dt * 2)
    if (this.introAge >= 0) {
      this.introAge = Math.min(1, this.introAge + dt)
      const p = this.introAge < 0.5 ? 4 * this.introAge ** 3 : 1 - (-2 * this.introAge + 2) ** 3 / 2
      this.framing.pitch = 36 + 6 * p
      this.framing.distance = 27 - 3 * p
    }
    if (this.dawnAge >= 0)
      this.dawnAge = Math.min(3, this.dawnAge + dt)
    for (const key of Object.keys(target) as (keyof Look)[]) {
      const a = this.dawnAge >= 0 ? this.dawnFrom![key] : this.introAge >= 0 ? this.assets.manifest.look.title[key] : this.look[key]
      const b = target[key]
      const dawn = Math.max(0, Math.min(1, (this.dawnAge - 0.6) / 2.4))
      const blend = this.dawnAge >= 0 ? 0.5 - 0.5 * Math.cos(Math.PI * dawn) : this.introAge >= 0 ? this.introAge < 0.5 ? 4 * this.introAge ** 3 : 1 - (-2 * this.introAge + 2) ** 3 / 2 : amount
      this.look[key] = lookColorKeys.has(key) ? mixColor(a, b, blend) : a + (b - a) * blend
    }
    if (this.introAge >= 1)
      this.introAge = -1
    if (this.dawnAge >= 3) {
      this.dawnAge = -1
      this.dawnFrom = undefined
    }
    const look = this.look
    this.view.exposure = look.exposure
    this.fog.color = look.fogColor
    this.fog.density = look.fogDensity
    this.sky.skyColor = look.skyTop
    this.sky.groundColor = look.skyHorizon
    this.environment.skyColor = look.skyColor
    this.environment.groundColor = look.groundColor
    this.environment.intensity = look.hemisphere
    this.moon.color = look.moonColor
    this.moon.intensity = look.moonIntensity
    for (const pass of this.passes) {
      if (pass instanceof BloomEffect) {
        pass.intensity = look.bloomIntensity
        pass.threshold = look.bloomThreshold
        pass.radius = look.bloomRadius
      }
      if (pass instanceof TiltShiftEffect) {
        pass.maxBlur = look.tilt
        pass.focalDepth = this.framing.distance - 1.75
        pass.focalNear = this.framing.distance * look.focus + 1.75
        pass.focalFar = this.framing.distance * (look.focus + 0.22) + 1.75
      }
    }
  }

  private stepFrame(events: RunEvent[], dt: number): void {
    this.clock += dt
    const run = this.run
    this.updateLook(dt)
    for (const event of events)
      this.burst(event)
    this.focus.x += (run.hero.x - this.focus.x) * Math.min(1, dt * 8)
    this.focus.z += (run.hero.z - this.focus.z) * Math.min(1, dt * 8)
    this.shake = Math.max(0, this.shake - dt)
    for (const item of this.ambient) {
      item.sprite.x += dt * (item.leaf ? 0.22 : 0.08)
      item.sprite.z += dt * (item.leaf ? -0.12 : 0.05)
      item.sprite.y = item.height + Math.sin(this.clock * 0.4 + item.phase) * (item.leaf ? 0.4 : 0.1)
      if (item.leaf)
        item.sprite.rotation.z = this.clock * 0.4 + item.phase
      if (item.sprite.x - this.focus.x > 27)
        item.sprite.x -= 54
      if (item.sprite.x - this.focus.x < -27)
        item.sprite.x += 54
      if (item.sprite.z - this.focus.z > 27)
        item.sprite.z -= 54
      if (item.sprite.z - this.focus.z < -27)
        item.sprite.z += 54
    }
    const shake = NightwardConfig.nightwardShake * this.shake * 0.25 * (run.demo ? 0.3 : 1)
    const { pitch, distance: cameraDistance } = this.framing
    this.view.camera.position.set(this.focus.x + (Math.random() - 0.5) * shake, 0.7 + Math.sin(pitch * Math.PI / 180) * cameraDistance, this.focus.z + Math.cos(pitch * Math.PI / 180) * cameraDistance)
    this.view.camera.lookAt({ x: this.focus.x, y: 0.7, z: this.focus.z })
    this.ground.update(dt > 0)
    this.moonDisc.position.set(this.focus.x - 90, 110, this.focus.z - 250)
    this.actorsLayer.update(this.focus, dt)
    this.worldProps.update(run.time)
    this.particles = this.particles.filter((particle) => {
      particle.age += dt
      if (particle.age >= particle.life) {
        particle.sprite.destroy()
        return false
      }
      const node = particle.sprite
      node.x += particle.vx * dt
      node.y += particle.vy * dt
      node.z += particle.vz * dt
      node.alpha = 1 - particle.age / particle.life
      if (particle.size) {
        particle.vy -= dt * 7
        node.height = particle.size * (1 - particle.age / particle.life * 0.6)
      }
      return true
    })
    const strike = this.weapons.update(events, dt, this.look, { x: this.focus.x, y: 0.7, z: this.focus.z })
    this.view.exposure = this.look.exposure * (1 + 0.2 * strike)
    this.environment.intensity = this.look.hemisphere + strike * 0.25
    this.sky.intensity = 1 + strike * 2.5
    this.sky.skyColor = mixColor(this.look.skyTop, 6970572, strike * 0.75)
    this.sky.groundColor = mixColor(this.look.skyHorizon, 14209279, strike * 0.6)
  }

  override destroy(options: DestroyOptions = { children: false }): void {
    this.run.isSpawnVisible = undefined
    this.view.removeFromParent()
    this.overlay.removeFromParent()
    this.overlay.destroy({ children: true })
    this.weapons.destroy()
    this.worldProps.destroy()
    this.ground.destroy()
    this.actorsLayer.destroy()
    this.view.destroy({ children: true })
    for (const pass of this.passes)
      pass.destroy()
    super.destroy(options)
  }
}
