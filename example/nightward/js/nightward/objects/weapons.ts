import type { Weapon, WeaponKey } from '../managers/NightwardDataManager'
import type { Point } from '../primitives/geometry'
import type { Game_NightwardRun } from './Game_NightwardRun'
import type { Enemy } from './Game_NightwardWorld'
import { weaponKeys } from '../managers/NightwardDataManager'
import { direction, distance } from '../primitives/geometry'
import { pick, randomRange } from '../primitives/math'
import { beginCast, hitEnemy, hitProps, hurtHero } from './combat'

export interface Projectile extends Point {
  id: number
  kind: 'bolt' | 'flask' | 'wave'
  y: number
  vx: number
  vz: number
  vy: number
  age: number
  life: number
  target?: Enemy
  caster?: Enemy
  weapon?: Weapon
  lastHit: number
  pierce: number
  aim: Point
}
export interface FirePool extends Point { id: number, age: number, life: number, startedAt: number, nextTick: number, weapon: Weapon }
export interface DelayedCast { at: number, mode: 'lash' | 'bolt' | 'storm' | 'flask', weapon: Weapon, side: number }
export interface TomeState { active: boolean, timer: number, fade: number, angle: number, count: number, radius: number, hits: Map<number, number> }
function splash(run: Game_NightwardRun, weapon: Weapon, point: Point, radius: number): void {
  for (const enemy of run.world.nearby(point, radius)) hitEnemy(run, enemy, weapon, point)
  hitProps(run, point, radius, weapon)
}
function lash(run: Game_NightwardRun, weapon: Weapon, side: number): void {
  const data = weapon.data
  const reach = data.reach!
  const height = data.halfHeight!
  const origin = { ...run.hero }
  const contains = (point: Point, radius: number): boolean => {
    const x = (point.x - origin.x) * side
    const z = point.z - origin.z
    return x >= -0.25 - radius && (x / (reach + radius)) ** 2 + (z / (height + radius)) ** 2 <= 1
  }
  run.emit({ kind: 'lash', x: origin.x, z: origin.z, value: reach, extra: height, side })
  for (const enemy of run.world.nearby(origin, reach)) {
    if (contains(enemy, enemy.radius))
      hitEnemy(run, enemy, weapon, { x: enemy.x - side, z: enemy.z })
  }
  hitProps(run, origin, reach, weapon, prop => (prop.x - origin.x) * side > -0.25 && contains(prop, 0.45))
}
function castDelayed(run: Game_NightwardRun, cast: DelayedCast): void {
  const weapon = run.weapon(cast.weapon.data.key)!
  const { mode } = cast
  const data = weapon.data
  if (mode === 'lash') {
    lash(run, weapon, cast.side)
    return
  }
  if (mode === 'bolt') {
    const target = run.world.nearest(run.hero, data.range!)
    if (!target)
      return
    const n = direction(target.x - run.hero.x, target.z - run.hero.z)
    const angle = Math.atan2(n.z, n.x || (n.z ? 0 : run.hero.facing)) + randomRange(-0.45, 0.45)
    const projectile: Projectile = { id: run.nextId++, kind: 'bolt', x: run.hero.x, z: run.hero.z, y: data.height!, vx: Math.cos(angle) * data.speed!, vz: Math.sin(angle) * data.speed!, vy: 0, age: 0, life: data.life!, target, weapon, lastHit: -1, pierce: data.pierce!, aim: target }
    run.projectiles.push(projectile)
    run.emit({ kind: 'wand', x: run.hero.x, z: run.hero.z, projectile })
    return
  }
  const targets = run.world.nearby(run.hero, data.range!).filter(enemy => distance(enemy, run.hero) <= data.range!)
  if (mode === 'storm') {
    if (!targets.length)
      return
    const target = pick(targets)
    const point = { x: target.x, z: target.z }
    run.emit({ kind: 'lightning', ...point, value: data.radius! })
    splash(run, weapon, point, data.radius!)
  }
  else {
    let target: Point
    if (targets.length) {
      target = pick(targets)
    }
    else {
      const angle = Math.random() * Math.PI * 2
      const radius = 2 + 3 * Math.random()
      target = { x: run.hero.x + Math.cos(angle) * radius, z: run.hero.z + Math.sin(angle) * radius }
    }
    const flight = data.flight!
    const point = { x: target.x, z: target.z }
    run.projectiles.push({ id: run.nextId++, kind: 'flask', x: run.hero.x, z: run.hero.z, y: data.throwHeight!, vx: (point.x - run.hero.x) / flight, vz: (point.z - run.hero.z) / flight, vy: (-data.throwHeight! + 0.5 * data.gravity! * flight * flight) / flight, age: 0, life: flight, weapon, lastHit: -1, pierce: 1, aim: point })
  }
}
function stepTomes(run: Game_NightwardRun, dt: number): void {
  const weapon = run.weapon('tomes')
  const tomes = run.tomes
  if (!weapon)
    return
  const data = weapon.data
  tomes.timer -= dt
  if (tomes.timer <= 0) {
    tomes.active = !tomes.active
    if (tomes.active) {
      tomes.count = data.count!
      tomes.radius = data.radius!
      beginCast(run, weapon)
      run.emit({ kind: 'tomes', x: run.hero.x, z: run.hero.z, value: tomes.count })
    }
    tomes.timer = tomes.active ? data.duration! : data.rest! * run.cooldownScale()
  }
  tomes.fade = Math.max(0, Math.min(1, tomes.fade + dt / (tomes.active ? data.fadeIn! : -data.fadeOut!)))
  if (tomes.fade <= 0)
    return
  tomes.angle = (tomes.angle + dt * data.spin!) % (Math.PI * 2)
  if (tomes.fade < 0.5)
    return
  for (let i = 0; i < tomes.count; i++) {
    const angle = tomes.angle + i * Math.PI * 2 / tomes.count
    const point = { x: run.hero.x + Math.cos(angle) * tomes.radius, z: run.hero.z + Math.sin(angle) * tomes.radius }
    for (const enemy of run.world.nearby(point, data.radiusHit!)) {
      if (run.time - (tomes.hits.get(enemy.id) ?? -100) < data.rehit!)
        continue
      tomes.hits.set(enemy.id, run.time)
      hitEnemy(run, enemy, weapon, run.hero)
    }
    hitProps(run, point, data.radiusHit!, weapon)
  }
}
function ready(run: Game_NightwardRun, weapon: Weapon, dt: number): boolean {
  const key = weapon.data.key
  const remaining = run.cooldowns.get(key)! - dt
  if (remaining > 0) {
    run.cooldowns.set(key, remaining)
    return false
  }
  const interval = weapon.data.cooldown! * run.cooldownScale()
  run.cooldowns.set(key, remaining + interval > 0 ? remaining + interval : interval)
  return true
}
function pending(run: Game_NightwardRun, key: WeaponKey): void {
  const casts = run.delayed.filter(cast => cast.weapon.data.key === key && cast.at <= run.time + 1e-6)
  run.delayed = run.delayed.filter(cast => !casts.includes(cast))
  for (const cast of casts) castDelayed(run, cast)
}
export function stepWeapons(run: Game_NightwardRun, dt: number): void {
  for (const key of weaponKeys) {
    const weapon = run.weapon(key)
    if (!weapon)
      continue
    const data = weapon.data
    if (key === 'tomes') {
      stepTomes(run, dt)
      continue
    }
    if (key === 'ward')
      run.wardPulse = Math.max(0, run.wardPulse - dt / data.pulseFade!)
    if (ready(run, weapon, dt)) {
      beginCast(run, weapon)
      if (key === 'lash') {
        lash(run, weapon, run.hero.facing)
        if (data.rank >= 2)
          run.delayed.push({ at: run.time + data.backDelay!, mode: 'lash', weapon, side: -run.hero.facing })
      }
      else if (key === 'ward') {
        run.wardPulse = 1
        run.emit({ kind: 'ward', x: run.hero.x, z: run.hero.z, value: data.radius! })
        splash(run, weapon, run.hero, data.radius!)
      }
      else {
        const queued = run.delayed.filter(cast => cast.weapon.data.key === key)
        const first = queued.length ? queued[queued.length - 1]!.at + data.stagger! : run.time
        for (let i = 0; i < data.count!; i++) run.delayed.push({ at: first + i * data.stagger!, mode: key === 'wand' ? 'bolt' : key, weapon, side: 0 })
      }
    }
    pending(run, key)
  }
}
export function stepFirePools(run: Game_NightwardRun): void {
  run.pools = run.pools.filter((pool) => {
    pool.age = run.time - pool.startedAt
    if (pool.age >= pool.life)
      return false
    if (run.time >= pool.nextTick - 1e-6) {
      pool.nextTick += pool.weapon.data.tick!
      splash(run, pool.weapon, pool, pool.weapon.data.radius!)
    }
    return true
  })
}
export function spawnWave(run: Game_NightwardRun, boss: Enemy): void {
  const config = run.content.formations.reaper
  run.projectiles.push({ id: run.nextId++, kind: 'wave', x: boss.x, z: boss.z, y: 1.1, vx: boss.aim.x * config.waveSpeed, vz: boss.aim.z * config.waveSpeed, vy: 0, age: 0, life: config.waveLife, caster: boss, lastHit: -1, pierce: 1, aim: { ...boss.aim } })
  run.emit({ kind: 'scythe', x: boss.x, z: boss.z, side: Math.atan2(boss.aim.z, boss.aim.x) })
}
export function stepProjectiles(run: Game_NightwardRun, dt: number): void {
  run.projectiles = run.projectiles.filter((projectile) => {
    projectile.age += dt
    if (projectile.kind === 'bolt') {
      const data = projectile.weapon!.data
      if (projectile.target?.dead)
        projectile.target = run.world.nearest(projectile, 9, projectile.lastHit)
      if (projectile.target) {
        const current = Math.atan2(projectile.vz, projectile.vx)
        const wanted = Math.atan2(projectile.target.z - projectile.z, projectile.target.x - projectile.x)
        const diff = Math.atan2(Math.sin(wanted - current), Math.cos(wanted - current))
        const angle = current + Math.max(-dt * data.turnRate!, Math.min(dt * data.turnRate!, diff))
        projectile.vx = Math.cos(angle) * data.speed!
        projectile.vz = Math.sin(angle) * data.speed!
      }
    }
    if (projectile.kind === 'flask') {
      projectile.vy -= projectile.weapon!.data.gravity! * dt
      projectile.y += projectile.vy * dt
    }
    projectile.x += projectile.vx * dt
    projectile.z += projectile.vz * dt
    if (projectile.kind === 'flask') {
      if (projectile.age >= projectile.life - 1e-6) {
        const weapon = projectile.weapon!
        projectile.x = projectile.aim.x
        projectile.y = 0
        projectile.z = projectile.aim.z
        if (run.pools.length === 32)
          run.pools.shift()
        run.pools.push({ id: run.nextId++, ...projectile.aim, age: 0, life: weapon.data.duration!, startedAt: run.time, nextTick: run.time, weapon })
        run.emit({ kind: 'flask', ...projectile.aim, value: weapon.data.radius! })
        return false
      }
    }
    else if (projectile.kind === 'wave') {
      if (projectile.pierce && distance(projectile, run.hero) < run.content.formations.reaper.waveRadius + run.content.hero.radius) {
        hurtHero(run, projectile.caster!, projectile)
        projectile.pierce = 0
      }
    }
    else {
      const weapon = projectile.weapon!
      const radius = weapon.data.radiusHit!
      for (const enemy of run.world.nearby(projectile, radius)) {
        if (projectile.lastHit === enemy.id)
          continue
        projectile.lastHit = enemy.id
        hitEnemy(run, enemy, weapon, { x: enemy.x - projectile.vx, z: enemy.z - projectile.vz })
        if (--projectile.pierce === 0)
          return false
      }
      const brazier = run.world.props.find(prop => prop.active && prop.kind === 'brazier' && !prop.broken && distance(prop, projectile) <= radius + prop.radius)
      if (brazier) {
        hitProps(run, projectile, radius, weapon)
        return false
      }
      const limit = run.content.map.bounds + 10
      if (Math.abs(projectile.x) > limit || Math.abs(projectile.z) > limit)
        return false
    }
    return projectile.age < projectile.life
  })
}
