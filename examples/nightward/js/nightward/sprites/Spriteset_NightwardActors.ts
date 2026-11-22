import type { BaseMaterial3D, View3D } from '@pixi/3d'
import type { Assets } from '../managers/NightwardAssetManager'
import type { EnemyKey, PickupKey } from '../managers/NightwardDataManager'
import type { Game_NightwardRun } from '../objects/Game_NightwardRun'
import type { Point } from '../primitives/geometry'
import { Material3D, PointLight, Sprite3D } from '@pixi/3d'
import { groupD8, Texture } from 'pixi.js'
import { distance } from '../primitives/geometry'

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

/**
 * Manages 3D billboard sprites for the hero, enemies, pickups, and boss waves.
 */
export class Spriteset_NightwardActors {
  private materials = new Set<BaseMaterial3D>()
  private actors = new Map<number, ActorVisual>()
  private pickups = new Map<number, Sprite3D>()
  private waves = new Map<number, Sprite3D>()
  private hero: ActorVisual
  private lantern: PointLight

  constructor(private run: Game_NightwardRun, private assets: Assets, private view: View3D) {
    const heroAnimation = assets.animations['hero.idle']!
    this.hero = this.makeActor(heroAnimation.textures[0]!, heroAnimation.height)
    const lights = assets.manifest.lights
    this.lantern = new PointLight({ color: lights.heroColor, intensity: 2.8, range: lights.heroRange, radius: 0.5 })
    this.view.root.addChild(this.lantern)
  }

  private sprite(texture: Texture, height: number): Sprite3D {
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

  private makeActor(texture: Texture, height: number): ActorVisual {
    const material = new Material3D({
      baseColorTexture: texture,
      alphaMode: 'mask',
      alphaCutoff: 0.3,
      doubleSided: true,
      roughness: 1,
      normalTexture: this.assets.normal,
      emissive: { texture: this.assets.glow, color: 0xFFFFFF, strength: 1 },
    })
    const node = new Sprite3D({ material, texture, height, billboardMode: 'cylindrical', anchor: { x: 0.5, y: 1 } })
    this.materials.add(material)
    this.view.root.addChild(node)
    const shadow = this.flat(5, height * 0.7, height * 0.4, 0.025)
    shadow.tint = 0x000000
    shadow.alpha = 0.45
    return { sprite: node, shadow, material, deathAge: 0 }
  }

  update(focus: Point, dt: number): void {
    const run = this.run
    const hero = this.hero.sprite
    const heroAnimation = this.assets.animations[run.invulnerable > 0.5 ? 'hero.hurt' : run.hero.moving ? 'hero.walk' : 'hero.idle']!
    hero.texture = facingTexture(heroAnimation.textures[Math.floor(run.time * heroAnimation.fps) % heroAnimation.textures.length]!, run.hero.facing)
    hero.position.set(run.hero.x, 0, run.hero.z)
    hero.visible = !run.actor.isDead() && (run.invulnerable <= 0 || Math.floor(run.invulnerable * 18) % 2 === 0)
    this.hero.shadow.position.set(run.hero.x, 0.025, run.hero.z)
    this.hero.shadow.visible = !run.actor.isDead()
    this.lantern.position.set(run.hero.x + 0.3 * run.hero.facing, 1, run.hero.z + 0.2)

    const aliveIds = new Set<number>()
    for (const enemy of run.world.enemies) {
      aliveIds.add(enemy.id)
      let visual = this.actors.get(enemy.id)
      const animationName = enemy.isReaper()
        ? enemy.state === 'rise'
          ? 'reaper.rise'
          : enemy.state === 'windup' || enemy.state === 'recover'
            ? 'reaper.swing'
            : 'reaper.walk'
        : enemyAnimations[enemy.data.key as Exclude<EnemyKey, 'reaper'>]
      const animation = this.assets.animations[animationName]!
      if (!visual) {
        visual = this.makeActor(animation.textures[0]!, animation.height * enemy.visualScale(run.content.config.eliteScale))
        this.actors.set(enemy.id, visual)
      }
      const node = visual.sprite
      node.texture = facingTexture(
        animation.textures[
          enemy.state === 'rise'
            ? Math.min(animation.textures.length - 1, Math.floor((1 - enemy.phase / run.content.formations.reaper.rise) * animation.textures.length))
            : Math.floor(enemy.age * animation.fps) % animation.textures.length
        ]!,
        enemy.x < run.hero.x ? 1 : -1,
      )
      node.position.set(enemy.x, enemy.hoverY(), enemy.z)
      node.tint = enemy.flash > 0 ? 0xFFB6A0 : enemy.elite ? 0xFF997C : 0xFFFFFF
      node.visible = distance(enemy, focus) < 29
      if (enemy.dead)
        visual.deathAge += dt
      node.alpha = enemy.dead ? Math.max(0, 1 - visual.deathAge / 0.18) : 1
      visual.shadow.position.set(enemy.x, 0.028, enemy.z)
      visual.shadow.visible = node.visible && !enemy.dead
      if (enemy.state === 'windup')
        node.tint = 0xFF698C
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

    this.syncObjects(
      run.pickups,
      this.pickups,
      (pickup) => {
        const animation = this.assets.animations[pickupNames[pickup.key]]!
        const node = this.sprite(animation.textures[0]!, animation.height * pickupScale[pickup.key])
        node.anchor.set(0.5, 1)
        return node
      },
      (pickup, node) => {
        const animation = this.assets.animations[pickupNames[pickup.key]]!
        node.texture = animation.textures[Math.floor(pickup.age * animation.fps) % animation.textures.length]!
        node.position.set(pickup.x, pickup.y + Math.sin(pickup.age * 3) * 0.08, pickup.z)
        node.visible = distance(pickup, focus) < 29
      },
    )

    this.syncObjects(
      run.projectiles.filter(projectile => projectile.kind === 'wave'),
      this.waves,
      () => this.sprite(this.assets.effects[0]!, 2.6),
      (projectile, node) => {
        node.position.set(projectile.x, projectile.y, projectile.z)
        node.width = 3
        node.height = 1.3
        node.tint = 0xC8B3FF
      },
    )
  }

  private syncObjects<T extends { id: number }>(
    items: T[],
    visuals: Map<number, Sprite3D>,
    create: (item: T) => Sprite3D,
    update: (item: T, visual: Sprite3D) => void,
  ): void {
    const ids = new Set(items.map(item => item.id))
    for (const [id, visual] of visuals) {
      if (!ids.has(id)) {
        visual.destroy()
        visuals.delete(id)
      }
    }
    for (const item of items) {
      let node = visuals.get(item.id)
      if (!node) {
        node = create(item)
        visuals.set(item.id, node)
      }
      update(item, node)
    }
  }

  destroy(): void {
    for (const material of this.materials)
      material.destroy()
    this.materials.clear()
    this.actors.clear()
    this.pickups.clear()
    this.waves.clear()
  }
}
