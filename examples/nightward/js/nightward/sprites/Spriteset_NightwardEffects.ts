import type { View3D } from '@pixi/3d'
import type { Assets, Look } from '../managers/NightwardAssetManager'
import type { Game_NightwardRun, RunEvent } from '../objects/Game_NightwardRun'
import type { CombatFxKit, CombatFxPresenter } from './effects/NightwardFxPools'
import { Container3D, DirectionalLight } from '@pixi/3d'
import { NightwardConfig } from '../patches/ConfigManager'
import { FxArtPool, FxBeamPool, FxFlashPool, FxLightPool, FxPulsePool, FxPyroPool, FxRng, FxSpritePool } from './effects/NightwardFxPools'
import { ImpactFx } from './effects/NightwardImpactFx'
import { lensNoise, NightwardLensPass, NightwardLensState } from './effects/NightwardLens'
import { FlaskFx, LashFx, StormFx, TomesFx, WandFx, WardFx } from './effects/NightwardWeaponFx'

const FX_LIGHT_COUNT = 14
const SHUTTER_BASE = 1 / 40
const DECAL_SORT_Y = -3000
const DEBRIS_SORT_Y = -2000
const FLAME_SORT_Y = -1000

const TITLE_PARTICLE_BUDGET = {
  flames: 448,
  sparks: 256,
  glows: 224,
  debris: 160,
  beams: 128,
  sprites: 128,
  ground: 96,
  firePoolsAtFullDensity: 3,
}

/**
 * Orchestrates all 3D combat particle pools, weapon/impact visual presenters,
 * dynamic combat point lights, and full-screen lens post-processing.
 */
export class Spriteset_NightwardEffects {
  readonly pass = new NightwardLensPass()
  private lens = new NightwardLensState()
  private root = new Container3D({ label: 'combat-fx' })
  private strike = new DirectionalLight({ color: 0xC8C2FF, intensity: 0 })
  private kit: CombatFxKit
  private pyroPools: FxPyroPool[]
  private spritePools: FxSpritePool[]
  private presenters: CombatFxPresenter[]
  private impacts: ImpactFx
  private prevWorldTime = 0
  private destroyed = false

  constructor(private run: Game_NightwardRun, assets: Assets, private view: View3D) {
    const budget = run.demo ? TITLE_PARTICLE_BUDGET : undefined
    const root = this.root
    const atlasFrames = assets.combat.frames
    const tomeAnim = assets.animations.tome!
    const flaskAnim = assets.animations.flask!

    const lights = new FxLightPool(root, FX_LIGHT_COUNT)
    const sparks = new FxPyroPool(root, {
      label: 'combat-sparks',
      texture: assets.combat.hotGlow,
      capacity: budget?.sparks ?? 3072,
      blendMode: 'add',
      streak: true,
      gravity: [0, -14, 0],
      fadeOut: 3,
      streakFade: 0.35,
      nearFade: 1.5,
    })
    const glows = new FxPyroPool(root, {
      label: 'combat-glows',
      texture: atlasFrames,
      capacity: budget?.glows ?? 4096,
      blendMode: 'add',
      gravity: [0, 2.5, 0],
      fadeIn: 0.02,
      fadeOut: 1.6,
      nearFade: 1,
    })
    const flames = new FxPyroPool(root, {
      label: 'combat-flames',
      texture: atlasFrames,
      capacity: budget?.flames ?? 2048,
      blendMode: 'add',
      gravity: [0.2, 4, 0],
      growth: 3,
      fadeIn: 0.03,
      fadeOut: 1.4,
      nearFade: 0.9,
      cooling: 1.6,
    })
    const debris = new FxPyroPool(root, {
      label: 'combat-debris',
      texture: atlasFrames,
      capacity: budget?.debris ?? 3072,
      blendMode: 'normal',
      gravity: [0, -16, 0],
      fadeOut: 6,
      nearFade: 1,
    })
    debris.container.position.y = DEBRIS_SORT_Y
    flames.container.position.y = FLAME_SORT_Y

    const decals = new FxSpritePool(root, 'combat-decals', atlasFrames, 96, 'horizontal', 'multiply')
    decals.container.position.y = DECAL_SORT_Y

    const beams = new FxBeamPool(root, 'combat-beams', assets.combat.beam, budget?.beams ?? 2048)
    const sprites = new FxSpritePool(root, 'combat-sprites', atlasFrames, budget?.sprites ?? 1536, 'spherical')
    const ground = new FxSpritePool(root, 'combat-ground', atlasFrames, budget?.ground ?? 384, 'horizontal')
    const art = new FxArtPool(root, [tomeAnim, flaskAnim], 64)
    const pulses = new FxPulsePool()
    const flashes = new FxFlashPool()

    this.kit = {
      view,
      run,
      lens: this.lens,
      lights,
      rng: new FxRng(),
      firePoolsAtFullDensity: budget?.firePoolsAtFullDensity,
      sparks,
      glows,
      flames,
      debris,
      beams,
      sprites,
      ground,
      decals,
      art,
      pulses,
      flashes,
    }

    this.pyroPools = [sparks, glows, flames, debris]
    this.spritePools = [sprites, ground, decals]
    this.impacts = new ImpactFx(this.kit)
    this.presenters = [
      new StormFx(this.kit),
      new FlaskFx(this.kit, flaskAnim, 1),
      new LashFx(this.kit),
      new WandFx(this.kit),
      new TomesFx(this.kit, tomeAnim, 0),
      new WardFx(this.kit),
      this.impacts,
    ]

    view.root.addChild(root)
    this.strike.position.set(-8, 60, -20)
    this.strike.lookAt({ x: 0, y: 0, z: 0 })
    this.strike.visible = false
    view.root.addChild(this.strike)
  }

  update(events: RunEvent[], dt: number, look: Look, aim: { x: number, y: number, z: number }): number {
    const worldTime = this.run.time
    const prevTime = this.prevWorldTime
    const warp = dt > 0 ? 1 : 0
    this.prevWorldTime = worldTime

    this.lens.shakeGain = NightwardConfig.nightwardShake
    this.impacts.beginFrame()

    // Notify relic blast before death events in the same tick so enemies dissolve radially.
    for (const event of events) {
      if (event.kind === 'relic')
        this.impacts.onEvent(event)
    }
    for (const event of events) {
      if (event.kind === 'relic')
        continue
      for (const presenter of this.presenters)
        presenter.onEvent(event)
    }
    for (const presenter of this.presenters)
      presenter.update(worldTime, prevTime, warp)

    const kit = this.kit
    kit.pulses.update(kit.ground, this.lens, worldTime)
    kit.flashes.update(kit.lights, worldTime)
    const shutter = SHUTTER_BASE * warp
    for (const pool of this.pyroPools)
      pool.update(worldTime, shutter, true)
    for (const pool of this.spritePools)
      pool.flush(true, true)
    kit.beams.flush(true, true)
    kit.art.flush(true)
    kit.lights.flush(true)

    return this.updateLens(worldTime, dt, look, aim)
  }

  private updateLens(time: number, dt: number, look: Look, aim: { x: number, y: number, z: number }): number {
    const lens = this.lens
    lens.advance(time, dt)
    const camera = this.view.camera
    const eye = camera.position
    const dx = aim.x - eye.x
    const dy = aim.y - eye.y
    const dz = aim.z - eye.z
    const dist = Math.hypot(dx, dy, dz)
    const horizontal = Math.hypot(dx, dz)
    const forward = { x: dx / dist, y: dy / dist, z: dz / dist }
    const right = { x: -dz / horizontal, z: dx / horizontal }
    const up = { x: -right.z * forward.y, y: right.z * forward.x - right.x * forward.z, z: right.x * forward.y }
    const trauma = lens.trauma * lens.trauma
    if (trauma > 0) {
      const amplitude = trauma * (0.15 + dist * 0.012)
      const ox = amplitude * lensNoise(time, 1.3)
      const oy = amplitude * lensNoise(time, 2.9)
      const roll = trauma * 0.035 * lensNoise(time, 4.7)
      const offset = { x: right.x * ox + up.x * oy, y: up.y * oy, z: right.z * ox + up.z * oy }
      eye.set(eye.x + offset.x, eye.y + offset.y, eye.z + offset.z)
      camera.lookAt(
        { x: aim.x + offset.x, y: aim.y + offset.y, z: aim.z + offset.z },
        { x: up.x * Math.cos(roll) - right.x * Math.sin(roll), y: up.y * Math.cos(roll), z: up.z * Math.cos(roll) - right.z * Math.sin(roll) },
      )
    }

    const width = this.view.width
    const height = this.view.height
    const project = (x: number, y: number, z: number): { u: number, v: number, depth: number } | undefined => {
      const depth = (x - eye.x) * forward.x + (y - eye.y) * forward.y + (z - eye.z) * forward.z
      if (depth < 0.3)
        return
      const point = this.view.worldToScreen({ x, y, z })
      if (point)
        return { u: point.x / width, v: point.y / height, depth }
    }

    const pass = this.pass
    const aberration = lens.extraAberration
    pass.setLens(look.aberration + aberration * (0.009 + 0.036 * aberration * aberration), look.vignette, width / height, look.grain)
    pass.setGrade(look.contrast, look.saturation, look.split, look.lift, look.tint, look.shadowTint, look.highlightTint)
    pass.setGrain(time, Math.min(1, Math.max(0.3, Math.abs(forward.y))))
    pass.setFlash(lens.flashColor, lens.flashAt(time))
    const zoom = lens.zoom > 0 ? project(lens.zoomAt.x, lens.zoomAt.y, lens.zoomAt.z) : undefined
    pass.setZoom(zoom?.u ?? 0.5, zoom?.v ?? 0.5, zoom ? lens.zoom * 0.14 : 0, 0.1)

    const focal = camera.zoom / Math.tan(camera.fov * Math.PI / 360)
    for (let index = 0; index < 4; index++) {
      const at = index * 5
      const values = lens.shocks
      const point = index < lens.shockCount ? project(values[at]!, values[at + 1]!, values[at + 2]!) : undefined
      if (point)
        pass.setShock(index, point.u, point.v, Math.min(1.6, values[at + 3]! * focal * 0.5 / point.depth), Math.min(1.5, values[at + 4]!))
      else
        pass.setShock(index, 0, 0, 0, 0)
    }
    for (let index = 0; index < 8; index++) {
      const at = index * 5
      const values = lens.flares
      const point = index < lens.flareCount ? project(values[at]!, values[at + 1]!, values[at + 2]!) : undefined
      if (point) {
        const border = Math.min(point.u, 1 - point.u, point.v, 1 - point.v)
        const fade = border >= 0.05 ? 1 : border <= -0.15 ? 0 : (border + 0.15) / 0.2
        pass.setFlare(index, point.u, point.v, values[at + 4]! * fade, values[at + 3]!, Math.min(1.5, Math.max(0.45, 5 / Math.sqrt(point.depth))))
      }
      else {
        pass.setFlare(index, 0, 0, 0, 0xFFFFFF, 1)
      }
    }

    const strike = lens.strike
    this.strike.visible = strike > 0.01
    this.strike.intensity = strike * 6
    lens.endFrame()
    return strike
  }

  destroy(): void {
    if (this.destroyed)
      return
    this.destroyed = true
    for (const pool of this.pyroPools)
      pool.destroy()
    for (const pool of this.spritePools)
      pool.destroy()
    this.kit.beams.destroy()
    this.kit.art.destroy()
    this.kit.lights.destroy()
    this.root.destroy()
  }
}
