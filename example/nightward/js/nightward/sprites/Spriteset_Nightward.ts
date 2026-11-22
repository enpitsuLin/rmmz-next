import type { BaseMaterial3D, Pass3D } from '@pixi/3d'
import type { Assets, Look } from '../managers/NightwardAssetManager'
import type { EnemyKey, PickupKey } from '../managers/NightwardDataManager'
import type { Game_NightwardRun, RunEvent } from '../objects/Game_NightwardRun'
import type { Point } from '../primitives/geometry'
import { Camera3D, DirectionalLight, Material3D, Mesh3D, PointLight, Sprite3D, View3D } from '@pixi/3d'
import { BloomEffect, TiltShiftEffect } from '@pixi/3d/extras'
import { Container, groupD8, Texture } from 'pixi.js'
import { Graphics } from 'rmmz-next'
import { shakeGain } from '../managers/NightwardConfigManager'
import { distance } from '../primitives/geometry'
import { mixColor } from '../primitives/ui'
import { EffekseerPass } from './Effekseer'
import { Spriteset_NightwardEffects } from './Spriteset_NightwardEffects'
import { Spriteset_NightwardGround } from './Spriteset_NightwardGround'
import { Spriteset_NightwardProps } from './Spriteset_NightwardProps'

const lookColorKeys = new Set<keyof Look>(['shadowTint', 'highlightTint', 'tint', 'fogColor', 'moonColor', 'skyColor', 'groundColor', 'skyTop', 'skyHorizon'])
const enemyAnimations: Record<Exclude<EnemyKey, 'reaper'>, string> = {
  bat: 'bat.fly',
  skeleton: 'skeleton.walk',
  ghoul: 'ghoul.walk',
  wraith: 'wraith.float',
  skull: 'skull.fly',
}
const pickupScale: Record<PickupKey, number> = { gemSmall: 1.35, gemMedium: 1.4, gemBig: 1.5, coin: 1.25, chicken: 1, vacuum: 1.45, relic: 1.7, chest: 1.05 }
const pickupNames: Record<PickupKey, string> = { gemSmall: 'gem.small', gemMedium: 'gem.mid', gemBig: 'gem.big', coin: 'coin', chicken: 'chicken', vacuum: 'vacuum', relic: 'relic', chest: 'chest' }

const mirroredTextures = new WeakMap<Texture, Texture>()
function facingTexture(texture: Texture, facing: number): Texture {
  if (facing >= 0)
    return texture
  let mirrored = mirroredTextures.get(texture)
  if (!mirrored) {
    // Billboard shaders discard negative scale; mirror atlas UVs instead.
    mirrored = new Texture({ source: texture.source, frame: texture.frame, rotate: groupD8.MIRROR_HORIZONTAL })
    mirroredTextures.set(texture, mirrored)
  }
  return mirrored
}

interface ActorVisual { sprite: Sprite3D, shadow: Sprite3D, material: Material3D, deathAge: number }
interface Particle { sprite: Sprite3D, life: number, age: number, vx: number, vy: number, vz: number, size: number }
export class Spriteset_Nightward {
  readonly view: View3D
  readonly overlay = new Container()
  private materials = new Set<BaseMaterial3D>()
  private passes: Pass3D[] = []
  private moonDisc!: Sprite3D
  private moon!: DirectionalLight
  private look!: Look
  private environment = { skyColor: 0, groundColor: 0, intensity: 0 }
  private sky = { skyColor: 0, groundColor: 0, intensity: 1 }
  private fog = { type: 'exp2' as const, color: 0, density: 0 }
  private ambient: { sprite: Sprite3D, height: number, phase: number, leaf: boolean }[] = []
  private actors = new Map<number, ActorVisual>()
  private pickups = new Map<number, Sprite3D>()
  private projectiles = new Map<number, Sprite3D>()
  private worldProps: Spriteset_NightwardProps
  private ground: Spriteset_NightwardGround
  private propMaterial!: (name: string) => BaseMaterial3D
  private hero: ActorVisual
  private weapons: Spriteset_NightwardEffects
  private lamps: PointLight[] = []
  private particles: Particle[] = []
  private focus: Point
  private shake = 0
  private clock = 0
  readonly framing = { pitch: 42, distance: 24 }
  private introAge = -1
  private dawnAge = -1
  private dawnFrom?: Look
  constructor(readonly run: Game_NightwardRun, private assets: Assets) {
    this.focus = { x: run.hero.x, z: run.hero.z }
    const reference = assets.manifest
    const look = reference.look[run.demo ? 'title' : 'play']
    this.look = { ...look }
    if (run.demo)
      Object.assign(this.framing, { pitch: 36, distance: 27 })
    this.environment = { skyColor: look.skyColor, groundColor: look.groundColor, intensity: look.hemisphere }
    this.fog = { type: 'exp2', color: look.fogColor, density: look.fogDensity }
    this.sky = { skyColor: look.skyTop, groundColor: look.skyHorizon, intensity: 1 }
    this.view = new View3D({ width: Graphics.width, height: Graphics.height, autoResize: false, camera: new Camera3D({ fov: 32, near: 0.5, far: 500 }), background: this.sky, environment: this.environment, fog: this.fog, shadowQuality: 'high', shadowFilter: 'pcf', toneMapping: 'aces', exposure: look.exposure })
    this.view.eventMode = 'none'
    const moon = this.moon = new DirectionalLight({ color: look.moonColor, intensity: look.moonIntensity, castShadow: true, shadow: { cascades: 1, maxDistance: 45, bias: 0.0015 } })
    const azimuth = -24 * Math.PI / 180
    const elevation = 31 * Math.PI / 180
    moon.position.set(Math.sin(azimuth) * Math.cos(elevation) * 60, Math.sin(elevation) * 60, -Math.cos(azimuth) * Math.cos(elevation) * 60)
    moon.lookAt({ x: 0, y: 0, z: 0 })
    this.view.root.addChild(moon)
    this.ground = new Spriteset_NightwardGround(this.view, run.content.map.center)
    this.makeWorld()
    this.worldProps = new Spriteset_NightwardProps(run, assets, this.view, this.propMaterial)
    for (let index = 0; index < 48; index++) {
      const leaf = index >= 12
      const sprite = new Sprite3D({ texture: leaf ? assets.leaves[index % 4]! : assets.mist, height: leaf ? 0.12 + index % 3 * 0.04 : 3, width: leaf ? 0.2 : 10, billboardMode: 'spherical', alphaMode: leaf ? 'mask' : 'blend', tint: leaf ? 0xFFFFFF : 0x8A9BAA, alpha: leaf ? 0.8 : 0.065 })
      const phase = index * 2.39996
      const height = leaf ? 0.5 + index % 7 * 0.5 : 1.1
      sprite.position.set(Math.cos(phase) * (5 + index % 22), height, 6 + Math.sin(phase) * (5 + index % 22))
      this.view.root.addChild(sprite)
      this.ambient.push({ sprite, height, phase, leaf })
    }
    this.moonDisc = new Sprite3D({ texture: assets.moon, width: 23.5, height: 23.5, billboardMode: 'spherical' })
    this.view.root.addChild(this.moonDisc)
    const heroAnimation = assets.animations['hero.idle']!
    this.hero = this.makeActor(heroAnimation.textures[0]!, heroAnimation.height)
    const lantern = new PointLight({ color: reference.lights.heroColor, intensity: 2.8, range: reference.lights.heroRange, radius: 0.5 })
    this.view.root.addChild(lantern)
    this.lamps.push(lantern)
    for (const point of reference.details.candles) {
      const glow = this.sprite(assets.effects[0]!, 0.24)
      glow.tint = 0xFFC477
      glow.position.set(point[0]!, point[1]!, point[2]!)
    }
    const gl = Graphics.app.renderer.gl
    if (gl.getExtension('EXT_color_buffer_float')) {
      this.passes = [new TiltShiftEffect({ focalDepth: 22.25, focalNear: 24 * look.focus + 1.75, focalFar: 24 * (look.focus + 0.22) + 1.75, maxBlur: look.tilt }), new BloomEffect({ threshold: look.bloomThreshold, intensity: look.bloomIntensity, radius: look.bloomRadius, levels: 5 })]
    }
    this.weapons = new Spriteset_NightwardEffects(run, assets, this.view)
    this.passes.push(new EffekseerPass(assets, true), new EffekseerPass(assets), this.weapons.pass)
    this.view.passes = this.passes
    this.update([], 0)
    run.isSpawnVisible = (point) => {
      const screen = this.view.worldToScreen({ x: point.x, y: 0.5, z: point.z })
      return !!screen && screen.x > -40 && screen.x < Graphics.width + 40 && screen.y > -40 && screen.y < Graphics.height + 40
    }
  }

  private makeWorld(): void {
    const scene = this.run.propScene
    this.propMaterial = name => scene.materials.get(name)!
    for (const mesh of scene.environment) {
      const node = new Mesh3D({ geometry: mesh.geometry, material: this.propMaterial(mesh.material), castShadow: !['grass', 'dirt', 'cobble', 'flagstone', 'glass', 'bark', 'thicket', 'sky'].includes(mesh.material), receiveShadow: mesh.material !== 'sky' })
      mesh.matrix.decompose(node.position, node.quaternion, node.scale)
      this.view.root.addChild(node)
    }
  }

  private sprite(texture: Assets['effects'][number], height: number): Sprite3D {
    const sprite = new Sprite3D({ texture, height, billboardMode: 'cylindrical', anchor: 0.5, alphaMode: 'blend' })
    this.view.root.addChild(sprite)
    return sprite
  }

  private flat(frame: number, width: number, height: number, y: number): Sprite3D {
    const sprite = new Sprite3D({ texture: this.assets.effects[frame]!, width, height, billboardMode: 'none', alphaMode: 'blend' })
    sprite.rotation.x = -Math.PI / 2
    sprite.y = y
    this.view.root.addChild(sprite)
    return sprite
  }

  private makeActor(texture: Assets['effects'][number], height: number): ActorVisual {
    const material = new Material3D({ baseColorTexture: texture, alphaMode: 'mask', alphaCutoff: 0.3, doubleSided: true, roughness: 1, normalTexture: this.assets.normal, emissive: { texture: this.assets.glow, color: 0xFFFFFF, strength: 1 } })
    const sprite = new Sprite3D({ material, texture, height, billboardMode: 'cylindrical', anchor: { x: 0.5, y: 1 } })
    this.materials.add(material)
    this.view.root.addChild(sprite)
    const shadow = this.flat(5, height * 0.7, height * 0.4, 0.025)
    shadow.tint = 0x000000
    shadow.alpha = 0.45
    return { sprite, shadow, material, deathAge: 0 }
  }

  private particle(point: Point, color: number, count: number, strength = 1): void {
    for (let i = 0; i < count; i++) {
      const sprite = this.sprite(this.assets.effects[0]!, 0.13 * strength)
      sprite.tint = color
      sprite.position.set(point.x, 0.7, point.z)
      this.particles.push({ sprite, age: 0, life: 0.3 + Math.random() * 0.35, vx: (Math.random() - 0.5) * 4 * strength, vy: Math.random() * 3, vz: (Math.random() - 0.5) * 4 * strength, size: 0.13 * strength })
    }
  }

  private burst(event: RunEvent): void {
    if (event.kind === 'hit' || event.kind === 'death' || event.kind === 'break' || event.kind === 'lash' || event.kind === 'wand' || event.kind === 'tomes' || event.kind === 'lightning' || event.kind === 'ward' || event.kind === 'flask')
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
    if (event.kind === 'pickup')
      return
    let sprite: Sprite3D
    let life = 0.35
    if (event.kind === 'scythe' || event.kind === 'windup') {
      sprite = this.flat(3, 4, event.kind === 'windup' ? 1 : 2, 0.12)
      sprite.rotation.z = event.side!
      sprite.tint = 0xF07C99
      life = event.kind === 'windup' ? 0.45 : 0.25
    }
    else {
      const size = event.value! * 2
      sprite = this.flat(3, size, size, 0.05)
      sprite.tint = 0xFFF0B8
      if (event.kind === 'relic') {
        life = 0.65
        this.shake = 0.4
      }
    }
    sprite.x = event.x
    sprite.z = event.z
    this.particles.push({ sprite, age: 0, life, vx: 0, vy: 0, vz: 0, size: 0 })
  }

  beginIntro(fromTitle: boolean): void {
    if (!fromTitle)
      return
    this.look = { ...this.assets.manifest.look.title }
    this.introAge = 0
    Object.assign(this.framing, { pitch: 36, distance: 27 })
    this.update([], 0)
  }

  beginDawn(): void {
    this.dawnFrom = { ...this.look }
    this.dawnAge = 0
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
      if (lookColorKeys.has(key)) {
        this.look[key] = mixColor(a, b, blend)
      }
      else {
        this.look[key] = a + (b - a) * blend
      }
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

  update(events: RunEvent[], dt = 1 / 60): void {
    this.clock += dt
    const run = this.run
    this.updateLook(dt)
    for (const event of events) this.burst(event)
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
    const shake = shakeGain() * this.shake * 0.25 * (run.demo ? 0.3 : 1)
    const { pitch, distance: cameraDistance } = this.framing
    this.view.camera.position.set(this.focus.x + (Math.random() - 0.5) * shake, 0.7 + Math.sin(pitch * Math.PI / 180) * cameraDistance, this.focus.z + Math.cos(pitch * Math.PI / 180) * cameraDistance)
    this.view.camera.lookAt({ x: this.focus.x, y: 0.7, z: this.focus.z })
    this.ground.update(dt > 0)
    this.moonDisc.position.set(this.focus.x - 90, 110, this.focus.z - 250)
    const hero = this.hero.sprite
    const heroAnimation = this.assets.animations[run.invulnerable > 0.5 ? 'hero.hurt' : run.hero.moving ? 'hero.walk' : 'hero.idle']!
    hero.texture = facingTexture(heroAnimation.textures[Math.floor(run.time * heroAnimation.fps) % heroAnimation.textures.length]!, run.hero.facing)
    hero.position.set(run.hero.x, 0, run.hero.z)
    hero.visible = !run.actor.isDead() && (run.invulnerable <= 0 || Math.floor(run.invulnerable * 18) % 2 === 0)
    this.hero.shadow.position.set(run.hero.x, 0.025, run.hero.z)
    this.hero.shadow.visible = !run.actor.isDead()
    this.lamps[0]!.position.set(run.hero.x + 0.3 * run.hero.facing, 1, run.hero.z + 0.2)
    this.worldProps.update(run.time)
    const aliveIds = new Set<number>()
    for (const enemy of run.world.enemies) {
      aliveIds.add(enemy.id)
      let visual = this.actors.get(enemy.id)
      const animationName = enemy.data.key === 'reaper' ? enemy.state === 'rise' ? 'reaper.rise' : enemy.state === 'windup' || enemy.state === 'recover' ? 'reaper.swing' : 'reaper.walk' : enemyAnimations[enemy.data.key]
      const animation = this.assets.animations[animationName]!
      if (!visual) {
        visual = this.makeActor(animation.textures[0]!, animation.height * (enemy.elite ? run.content.config.eliteScale : 1))
        this.actors.set(enemy.id, visual)
      }
      const sprite = visual.sprite
      sprite.texture = facingTexture(animation.textures[enemy.state === 'rise' ? Math.min(animation.textures.length - 1, Math.floor((1 - enemy.phase / run.content.formations.reaper.rise) * animation.textures.length)) : Math.floor(enemy.age * animation.fps) % animation.textures.length]!, enemy.x < run.hero.x ? 1 : -1)
      const hover = enemy.data.hover + Math.sin(enemy.age * 4 + enemy.id) * enemy.data.bob
      sprite.position.set(enemy.x, hover, enemy.z)
      sprite.tint = enemy.flash > 0 ? 0xFFB6A0 : enemy.elite ? 0xFF997C : 0xFFFFFF
      sprite.visible = distance(enemy, this.focus) < 29
      if (enemy.dead)
        visual.deathAge += dt
      sprite.alpha = enemy.dead ? Math.max(0, 1 - visual.deathAge / 0.18) : 1
      visual.shadow.position.set(enemy.x, 0.028, enemy.z)
      visual.shadow.visible = sprite.visible && !enemy.dead
      if (enemy.state === 'windup')
        sprite.tint = 0xFF698C
    }
    for (const [id, visual] of this.actors) {
      if (!aliveIds.has(id)) {
        visual.sprite.destroy()
        visual.shadow.destroy()
        visual.material.destroy()
        this.materials.delete(visual.material)
        this.actors.delete(id)
      }
    }
    this.syncObjects(run.pickups, this.pickups, (pickup) => {
      const animation = this.assets.animations[pickupNames[pickup.key]]!
      const sprite = this.sprite(animation.textures[0]!, animation.height * pickupScale[pickup.key])
      sprite.anchor.set(0.5, 1)
      return sprite
    }, (pickup, sprite) => {
      const animation = this.assets.animations[pickupNames[pickup.key]]!
      sprite.texture = animation.textures[Math.floor(pickup.age * animation.fps) % animation.textures.length]!
      sprite.position.set(pickup.x, pickup.y + Math.sin(pickup.age * 3) * 0.08, pickup.z)
      sprite.visible = distance(pickup, this.focus) < 29
    })
    this.syncObjects(run.projectiles.filter(projectile => projectile.kind === 'wave'), this.projectiles, () => this.sprite(this.assets.effects[0]!, 2.6), (projectile, sprite) => {
      sprite.position.set(projectile.x, projectile.y, projectile.z)
      sprite.width = 3
      sprite.height = 1.3
      sprite.tint = 0xC8B3FF
    })
    this.particles = this.particles.filter((particle) => {
      particle.age += dt
      if (particle.age >= particle.life) {
        particle.sprite.destroy()
        return false
      }
      const sprite = particle.sprite
      sprite.x += particle.vx * dt
      sprite.y += particle.vy * dt
      sprite.z += particle.vz * dt
      sprite.alpha = 1 - particle.age / particle.life
      if (particle.size) {
        particle.vy -= dt * 7
        sprite.height = particle.size * (1 - particle.age / particle.life * 0.6)
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

  private syncObjects<T extends { id: number }>(items: T[], visuals: Map<number, Sprite3D>, create: (item: T) => Sprite3D, update: (item: T, visual: Sprite3D) => void): void {
    const ids = new Set(items.map(item => item.id))
    for (const [id, visual] of visuals) {
      if (!ids.has(id)) {
        visual.destroy()
        visuals.delete(id)
      }
    }
    for (const item of items) {
      let sprite = visuals.get(item.id)
      if (!sprite) {
        sprite = create(item)
        visuals.set(item.id, sprite)
      }
      update(item, sprite)
    }
  }

  destroy(): void {
    this.run.isSpawnVisible = undefined
    this.view.removeFromParent()
    this.overlay.removeFromParent()
    this.overlay.destroy({ children: true })
    this.weapons.destroy()
    this.worldProps.destroy()
    this.ground.destroy()
    this.view.destroy({ children: true })
    for (const pass of this.passes) pass.destroy()
    for (const material of this.materials) material.destroy()
  }
}
