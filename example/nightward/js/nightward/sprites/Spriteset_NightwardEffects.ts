import type { View3D } from '@pixi/3d'
import type { Assets, Look } from '../managers/NightwardAssetManager'
import type { EnemyKey } from '../managers/NightwardDataManager'
import type { Game_NightwardRun, RunEvent } from '../objects/Game_NightwardRun'
import { DirectionalLight } from '@pixi/3d'
import { shakeGain } from '../managers/NightwardConfigManager'
import { weaponKeys } from '../managers/NightwardDataManager'
import { lensNoise, ReferenceCombat, ReferenceLensPass, ReferenceLensState } from '../reference/combat.js'

const enemyKinds: EnemyKey[] = ['bat', 'skeleton', 'ghoul', 'wraith', 'skull', 'reaper']
const eventKinds: Partial<Record<RunEvent['kind'], string>> = {
  lash: 'lashSwing',
  wand: 'wandFire',
  tomes: 'tomesStart',
  lightning: 'lightning',
  ward: 'wardPulse',
  flask: 'flaskBurst',
  hit: 'hit',
  death: 'kill',
  break: 'brazierBreak',
  relic: 'relicBlast',
}
const titleParticleBudget = {
  flames: 448,
  sparks: 256,
  glows: 224,
  debris: 160,
  beams: 128,
  sprites: 128,
  ground: 96,
  firePoolsAtFullDensity: 3,
}
interface ReferenceEvent {
  kind: string
  time: number
  x: number
  y: number
  z: number
  subject: number
  value: number
  extra: number
  dirX: number
  dirZ: number
}
export class Spriteset_NightwardEffects {
  readonly pass = new ReferenceLensPass()
  private lens = new ReferenceLensState()
  private strike = new DirectionalLight({ color: 0xC8C2FF, intensity: 0 })
  private events: ReferenceEvent[] = []
  private enemySlots = new Map<number, number>()
  private projectileSlots = new Map<number, number>()
  private simulation = {
    tick: 0,
    hero: { x: 0, z: 0, prevX: 0, prevZ: 0 },
    enemies: { count: 0, x: [] as number[], y: [] as number[], z: [] as number[], kind: [] as number[], scale: [] as number[] },
    projectiles: { count: 0, active: [] as number[], kind: [] as number[], x: [] as number[], y: [] as number[], z: [] as number[], prevX: [] as number[], prevY: [] as number[], prevZ: [] as number[], vx: [] as number[], vy: [] as number[], vz: [] as number[], age: [] as number[] },
    pickups: { count: 0 },
    weapons: {
      tomes: { active: 0, count: 0, radius: 0, angle: 0 },
      ward: { radius: 0, pulse: 0 },
      firePools: { count: 0, x: [] as number[], z: [] as number[], radius: [] as number[], start: [] as number[], end: [] as number[] },
    },
  }

  private frame = {
    worldTime: 0,
    realTime: 0,
    alpha: 1,
    warp: 1,
    restarted: false,
    events: { count: 0, at: (index: number): ReferenceEvent => this.events[index]! },
  }

  private combat: InstanceType<typeof ReferenceCombat>
  constructor(private run: Game_NightwardRun, assets: Assets, private view: View3D) {
    const art = { frames: (name: string) => {
      const animation = assets.animations[name]!
      return { ...animation, count: animation.textures.length }
    } }
    this.combat = new ReferenceCombat(view, this.simulation, this.lens, art, assets.combat, run.demo ? titleParticleBudget : undefined)
    this.strike.position.set(-8, 60, -20)
    this.strike.lookAt({ x: 0, y: 0, z: 0 })
    this.strike.visible = false
    view.root.addChild(this.strike)
  }

  private sync(events: RunEvent[]): void {
    const run = this.run
    const sim = this.simulation
    sim.tick = Math.round(run.time * 60)
    Object.assign(sim.hero, { x: run.hero.x, z: run.hero.z, prevX: run.hero.x, prevZ: run.hero.z })
    this.enemySlots.clear()
    sim.enemies.count = run.world.enemies.length
    for (const [index, enemy] of run.world.enemies.entries()) {
      this.enemySlots.set(enemy.id, index)
      sim.enemies.x[index] = enemy.x
      sim.enemies.z[index] = enemy.z
      sim.enemies.y[index] = enemy.data.hover + Math.sin(enemy.age * 4 + enemy.id) * enemy.data.bob
      sim.enemies.kind[index] = enemyKinds.indexOf(enemy.data.key)
      sim.enemies.scale[index] = enemy.elite ? run.content.config.eliteScale : 1
    }
    this.projectileSlots.clear()
    const projectiles = sim.projectiles
    let index = 0
    const write = (projectile: Game_NightwardRun['projectiles'][number], active: number): void => {
      this.projectileSlots.set(projectile.id, index)
      projectiles.active[index] = active
      projectiles.kind[index] = projectile.kind === 'bolt' ? 0 : projectile.kind === 'flask' ? 1 : 2
      projectiles.x[index] = projectiles.prevX[index] = projectile.x
      projectiles.y[index] = projectiles.prevY[index] = projectile.y
      projectiles.z[index] = projectiles.prevZ[index] = projectile.z
      projectiles.vx[index] = projectile.vx
      projectiles.vy[index] = projectile.vy
      projectiles.vz[index] = projectile.vz
      projectiles.age[index] = projectile.age
      index++
    }
    for (const projectile of run.projectiles) write(projectile, 1)
    // A bolt may hit on its first tick; its muzzle still needs the emitted snapshot.
    for (const event of events) {
      if (event.projectile && !this.projectileSlots.has(event.projectile.id))
        write(event.projectile, 0)
    }
    projectiles.count = index
    Object.assign(sim.weapons.tomes, { active: run.tomes.fade, count: run.tomes.count, radius: run.tomes.radius, angle: run.tomes.angle })
    Object.assign(sim.weapons.ward, { radius: run.weapon('ward')?.data.radius ?? 0, pulse: run.wardPulse })
    const pools = sim.weapons.firePools
    pools.count = run.pools.length
    for (const [slot, pool] of run.pools.entries()) {
      pools.x[slot] = pool.x
      pools.z[slot] = pool.z
      pools.radius[slot] = pool.weapon.data.radius!
      // The reference remembers pools by their Float32 start time.
      pools.start[slot] = Math.fround(pool.startedAt)
      pools.end[slot] = Math.fround(pool.startedAt + pool.life)
    }
    this.events.length = 0
    for (const event of events) {
      const kind = eventKinds[event.kind]
      if (!kind)
        continue
      const target = event.target
      let subject = target ? this.enemySlots.get(target.id)! : 0
      if (event.projectile)
        subject = this.projectileSlots.get(event.projectile.id)!
      this.events.push({
        kind,
        time: event.time!,
        x: event.x,
        y: event.y ?? 0,
        z: event.z,
        subject,
        value: event.kind === 'death' ? enemyKinds.indexOf(target!.data.key) : event.value ?? 0,
        extra: event.kind === 'hit' ? weaponKeys.indexOf(event.weapon!) : event.kind === 'death' ? Number(target!.elite) : event.extra ?? 0,
        dirX: event.side ?? 0,
        dirZ: 0,
      })
    }
    this.frame.worldTime = this.frame.realTime = run.time
    this.frame.events.count = this.events.length
  }

  update(events: RunEvent[], dt: number, look: Look, aim: { x: number, y: number, z: number }): number {
    this.sync(events)
    this.frame.warp = dt > 0 ? 1 : 0
    this.lens.shakeGain = shakeGain()
    this.combat.update(this.frame)
    this.combat.lights.flush(true)
    const lens = this.lens
    const time = this.run.time
    lens.advance(time, dt)
    const camera = this.view.camera
    const eye = camera.position
    const dx = aim.x - eye.x
    const dy = aim.y - eye.y
    const dz = aim.z - eye.z
    const distance = Math.hypot(dx, dy, dz)
    const horizontal = Math.hypot(dx, dz)
    const forward = { x: dx / distance, y: dy / distance, z: dz / distance }
    const right = { x: -dz / horizontal, z: dx / horizontal }
    const up = { x: -right.z * forward.y, y: right.z * forward.x - right.x * forward.z, z: right.x * forward.y }
    const trauma = lens.trauma * lens.trauma
    if (trauma > 0) {
      const amplitude = trauma * (0.15 + distance * 0.012)
      const x = amplitude * lensNoise(time, 1.3)
      const y = amplitude * lensNoise(time, 2.9)
      const roll = trauma * 0.035 * lensNoise(time, 4.7)
      const offset = { x: right.x * x + up.x * y, y: up.y * y, z: right.z * x + up.z * y }
      eye.set(eye.x + offset.x, eye.y + offset.y, eye.z + offset.z)
      camera.lookAt({ x: aim.x + offset.x, y: aim.y + offset.y, z: aim.z + offset.z }, { x: up.x * Math.cos(roll) - right.x * Math.sin(roll), y: up.y * Math.cos(roll), z: up.z * Math.cos(roll) - right.z * Math.sin(roll) })
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
      else pass.setShock(index, 0, 0, 0, 0)
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

  destroy(): void { this.combat.destroy() }
}
