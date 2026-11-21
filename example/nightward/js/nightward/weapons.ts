import type { MZ } from 'rmmz-next/database-types'
import type { Point, WeaponData, WeaponKey } from './content'
import type { RunSession } from './session'
import type { Enemy } from './world'
import { direction, distance, pick, randomRange, weaponKeys } from './content'
import { beginCast, hitEnemy, hitProps, hurtHero } from './combat'

export type WeaponSkill = MZ.Skill & { data: WeaponData }
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
  skill?: WeaponSkill
  lastHit: number
  pierce: number
  aim: Point
}
export interface FirePool extends Point { id: number, age: number, life: number, startedAt: number, nextTick: number, skill: WeaponSkill }
export interface DelayedCast { at: number, mode: 'lash' | 'bolt' | 'storm' | 'flask', skill: WeaponSkill, side: number }
export interface TomeState { active: boolean, timer: number, fade: number, angle: number, count: number, radius: number, hits: Map<number, number> }
function splash(run: RunSession, skill: WeaponSkill, point: Point, radius: number): void {
  for (const enemy of run.world.nearby(point, radius)) hitEnemy(run, enemy, skill.id, skill.data.key, point, skill.data.knockback)
  hitProps(run, point, radius, skill.data.damage)
}
function lash(run: RunSession, skill: WeaponSkill, side: number): void {
  const data = skill.data, reach = data.reach!, height = data.halfHeight!, origin = { ...run.hero }
  const contains = (point: Point, radius: number): boolean => {
    const x = (point.x - origin.x) * side, z = point.z - origin.z
    return x >= -.25 - radius && (x / (reach + radius)) ** 2 + (z / (height + radius)) ** 2 <= 1
  }
  run.emit({ kind: 'lash', x: origin.x, z: origin.z, value: reach, extra: height, side })
  for (const enemy of run.world.nearby(origin, reach)) if (contains(enemy, enemy.radius)) hitEnemy(run, enemy, skill.id, 'lash', { x: enemy.x - side, z: enemy.z }, data.knockback)
  hitProps(run, origin, reach, data.damage, prop => (prop.x - origin.x) * side > -.25 && contains(prop, .45))
}
function castDelayed(run: RunSession, cast: DelayedCast): void {
  const skill = run.weapon(cast.skill.data.key)!, { mode } = cast, data = skill.data
  if (mode === 'lash') { lash(run, skill, cast.side); return }
  if (mode === 'bolt') {
    const target = run.world.nearest(run.hero, data.range!)
    if (!target) return
    const n = direction(target.x - run.hero.x, target.z - run.hero.z)
    const angle = Math.atan2(n.z, n.x || (n.z ? 0 : run.hero.facing)) + randomRange(-.45, .45)
    const projectile: Projectile = { id: run.nextId++, kind: 'bolt', x: run.hero.x, z: run.hero.z, y: data.height!, vx: Math.cos(angle) * data.speed!, vz: Math.sin(angle) * data.speed!, vy: 0, age: 0, life: data.life!, target, skill, lastHit: -1, pierce: data.pierce!, aim: target }
    run.projectiles.push(projectile)
    run.emit({ kind: 'wand', x: run.hero.x, z: run.hero.z, projectile })
    return
  }
  const targets = run.world.nearby(run.hero, data.range!).filter(enemy => distance(enemy, run.hero) <= data.range!)
  if (mode === 'storm') {
    if (!targets.length) return
    const target = pick(targets), point = { x: target.x, z: target.z }
    run.emit({ kind: 'lightning', ...point, value: data.radius! })
    splash(run, skill, point, data.radius!)
  }
  else {
    let target: Point
    if (targets.length) target = pick(targets)
    else {
      const angle = Math.random() * Math.PI * 2, radius = 2 + 3 * Math.random()
      target = { x: run.hero.x + Math.cos(angle) * radius, z: run.hero.z + Math.sin(angle) * radius }
    }
    const flight = data.flight!, point = { x: target.x, z: target.z }
    run.projectiles.push({ id: run.nextId++, kind: 'flask', x: run.hero.x, z: run.hero.z, y: data.throwHeight!, vx: (point.x - run.hero.x) / flight, vz: (point.z - run.hero.z) / flight, vy: (-data.throwHeight! + .5 * data.gravity! * flight * flight) / flight, age: 0, life: flight, skill, lastHit: -1, pierce: 1, aim: point })
  }
}
function stepTomes(run: RunSession, dt: number): void {
  const skill = run.weapon('tomes'), tomes = run.tomes
  if (!skill) return
  const data = skill.data
  tomes.timer -= dt
  if (tomes.timer <= 0) {
    tomes.active = !tomes.active
    if (tomes.active) {
      tomes.count = data.count!; tomes.radius = data.radius!
      beginCast(run, skill.id)
      run.emit({ kind: 'tomes', x: run.hero.x, z: run.hero.z, value: tomes.count })
    }
    tomes.timer = tomes.active ? data.duration! : data.rest! * run.cooldownScale()
  }
  tomes.fade = Math.max(0, Math.min(1, tomes.fade + dt / (tomes.active ? data.fadeIn! : -data.fadeOut!)))
  if (tomes.fade <= 0) return
  tomes.angle = (tomes.angle + dt * data.spin!) % (Math.PI * 2)
  if (tomes.fade < .5) return
  for (let i = 0; i < tomes.count; i++) {
    const angle = tomes.angle + i * Math.PI * 2 / tomes.count, point = { x: run.hero.x + Math.cos(angle) * tomes.radius, z: run.hero.z + Math.sin(angle) * tomes.radius }
    for (const enemy of run.world.nearby(point, data.radiusHit!)) {
      if (run.time - (tomes.hits.get(enemy.id) ?? -100) < data.rehit!) continue
      tomes.hits.set(enemy.id, run.time)
      hitEnemy(run, enemy, skill.id, 'tomes', run.hero, data.knockback)
    }
    hitProps(run, point, data.radiusHit!, data.damage)
  }
}
function ready(run: RunSession, skill: WeaponSkill, dt: number): boolean {
  const key = skill.data.key, remaining = run.cooldowns.get(key)! - dt
  if (remaining > 0) { run.cooldowns.set(key, remaining); return false }
  const interval = skill.data.cooldown! * run.cooldownScale()
  run.cooldowns.set(key, remaining + interval > 0 ? remaining + interval : interval)
  return true
}
function pending(run: RunSession, key: WeaponKey): void {
  const casts = run.delayed.filter(cast => cast.skill.data.key === key && cast.at <= run.time + 1e-6)
  run.delayed = run.delayed.filter(cast => !casts.includes(cast))
  for (const cast of casts) castDelayed(run, cast)
}
export function stepWeapons(run: RunSession, dt: number): void {
  for (const key of weaponKeys) {
    const skill = run.weapon(key)
    if (!skill) continue
    const data = skill.data
    if (key === 'tomes') { stepTomes(run, dt); continue }
    if (key === 'ward') run.wardPulse = Math.max(0, run.wardPulse - dt / data.pulseFade!)
    if (ready(run, skill, dt)) {
      beginCast(run, skill.id)
      if (key === 'lash') {
        lash(run, skill, run.hero.facing)
        if (data.rank >= 2) run.delayed.push({ at: run.time + data.backDelay!, mode: 'lash', skill, side: -run.hero.facing })
      }
      else if (key === 'ward') {
        run.wardPulse = 1
        run.emit({ kind: 'ward', x: run.hero.x, z: run.hero.z, value: data.radius! })
        splash(run, skill, run.hero, data.radius!)
      }
      else {
        const queued = run.delayed.filter(cast => cast.skill.data.key === key)
        const first = queued.length ? queued[queued.length - 1]!.at + data.stagger! : run.time
        for (let i = 0; i < data.count!; i++) run.delayed.push({ at: first + i * data.stagger!, mode: key === 'wand' ? 'bolt' : key, skill, side: 0 })
      }
    }
    pending(run, key)
  }
}
export function stepFirePools(run: RunSession): void {
  run.pools = run.pools.filter(pool => {
    pool.age = run.time - pool.startedAt
    if (pool.age >= pool.life) return false
    if (run.time >= pool.nextTick - 1e-6) {
      pool.nextTick += pool.skill.data.tick!
      splash(run, pool.skill, pool, pool.skill.data.radius!)
    }
    return true
  })
}
export function spawnWave(run: RunSession, boss: Enemy): void {
  const config = run.content.formations.reaper
  run.projectiles.push({ id: run.nextId++, kind: 'wave', x: boss.x, z: boss.z, y: 1.1, vx: boss.aim.x * config.waveSpeed, vz: boss.aim.z * config.waveSpeed, vy: 0, age: 0, life: config.waveLife, caster: boss, lastHit: -1, pierce: 1, aim: { ...boss.aim } })
  run.emit({ kind: 'scythe', x: boss.x, z: boss.z, side: Math.atan2(boss.aim.z, boss.aim.x) })
}
export function stepProjectiles(run: RunSession, dt: number): void {
  run.projectiles = run.projectiles.filter(projectile => {
    projectile.age += dt
    if (projectile.kind === 'bolt') {
      const data = projectile.skill!.data
      if (projectile.target?.dead) projectile.target = run.world.nearest(projectile, 9, projectile.lastHit)
      if (projectile.target) {
        const current = Math.atan2(projectile.vz, projectile.vx), wanted = Math.atan2(projectile.target.z - projectile.z, projectile.target.x - projectile.x)
        const diff = Math.atan2(Math.sin(wanted - current), Math.cos(wanted - current)), angle = current + Math.max(-dt * data.turnRate!, Math.min(dt * data.turnRate!, diff))
        projectile.vx = Math.cos(angle) * data.speed!; projectile.vz = Math.sin(angle) * data.speed!
      }
    }
    if (projectile.kind === 'flask') { projectile.vy -= projectile.skill!.data.gravity! * dt; projectile.y += projectile.vy * dt }
    projectile.x += projectile.vx * dt; projectile.z += projectile.vz * dt
    if (projectile.kind === 'flask') {
      if (projectile.age >= projectile.life - 1e-6) {
        const skill = projectile.skill!
        projectile.x = projectile.aim.x; projectile.y = 0; projectile.z = projectile.aim.z
        if (run.pools.length === 32) run.pools.shift()
        run.pools.push({ id: run.nextId++, ...projectile.aim, age: 0, life: skill.data.duration!, startedAt: run.time, nextTick: run.time, skill })
        run.emit({ kind: 'flask', ...projectile.aim, value: skill.data.radius! })
        return false
      }
    }
    else if (projectile.kind === 'wave') {
      if (projectile.pierce && distance(projectile, run.hero) < run.content.formations.reaper.waveRadius + run.content.hero.radius) {
        hurtHero(run, projectile.caster!, run.content.formations.reaper.damage, projectile, true)
        projectile.pierce = 0
      }
    }
    else {
      const skill = projectile.skill!, radius = skill.data.radiusHit!
      for (const enemy of run.world.nearby(projectile, radius)) {
        if (projectile.lastHit === enemy.id) continue
        projectile.lastHit = enemy.id
        hitEnemy(run, enemy, skill.id, 'wand', { x: enemy.x - projectile.vx, z: enemy.z - projectile.vz }, skill.data.knockback)
        if (--projectile.pierce === 0) return false
      }
      const brazier = run.world.props.find(prop => prop.kind === 'brazier' && !prop.broken && distance(prop, projectile) <= radius + prop.radius)
      if (brazier) { hitProps(run, projectile, radius, skill.data.damage); return false }
      if (Math.abs(projectile.x) > 100 || Math.abs(projectile.z) > 100) return false
    }
    return projectile.age < projectile.life
  })
}
