import type { MZ } from 'rmmz-next/database-types'
import type { Point, WeaponData } from './content'
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
  hits: Set<number>
  pierce: number
  aim: Point
}
export interface FirePool extends Point { id: number, age: number, life: number, nextTick: number, skill: WeaponSkill }
export interface DelayedCast { at: number, mode: 'lash' | 'bolt' | 'storm' | 'flask', skill: WeaponSkill, side: number }
export interface TomeState { active: boolean, timer: number, fade: number, angle: number, hits: Map<number, number>, skill?: WeaponSkill }
function splash(run: RunSession, skill: WeaponSkill, point: Point, radius: number): void {
  for (const enemy of run.world.nearby(point, radius)) hitEnemy(run, enemy, skill.id, skill.data.key, point, skill.data.knockback)
  hitProps(run, point, radius, skill.data.damage)
}
function lash(run: RunSession, skill: WeaponSkill, side: number): void {
  const data = skill.data, reach = data.reach!, height = data.halfHeight!, origin = { ...run.hero }
  const contains = (point: Point, radius: number): boolean => {
    const x = (point.x - origin.x) * side, z = point.z - origin.z
    return x > -.25 - radius && (x / (reach + radius)) ** 2 + (z / (height + radius)) ** 2 <= 1
  }
  for (const enemy of run.world.nearby(origin, reach)) if (contains(enemy, enemy.radius)) hitEnemy(run, enemy, skill.id, 'lash', { x: enemy.x - side, z: enemy.z }, data.knockback)
  hitProps(run, origin, reach, data.damage, prop => contains(prop, .45))
  run.emit({ kind: 'lash', x: origin.x, z: origin.z, value: reach, extra: height, side })
}
function castDelayed(run: RunSession, cast: DelayedCast): void {
  const { skill, mode } = cast, data = skill.data
  if (mode === 'lash') { lash(run, skill, cast.side); return }
  if (mode === 'bolt') {
    const target = run.world.nearest(run.hero, data.range!)
    if (!target) return
    const n = direction(target.x - run.hero.x, target.z - run.hero.z), spread = randomRange(-.45, .45), angle = Math.atan2(n.z, n.x) + spread
    run.projectiles.push({ id: run.nextId++, kind: 'bolt', x: run.hero.x, z: run.hero.z, y: .9, vx: Math.cos(angle) * 15, vz: Math.sin(angle) * 15, vy: 0, age: 0, life: data.life!, target, skill, hits: new Set(), pierce: data.pierce!, aim: target })
    run.emit({ kind: 'wand', x: run.hero.x, z: run.hero.z })
    return
  }
  const targets = run.world.nearby(run.hero, data.range!).filter(enemy => distance(enemy, run.hero) < data.range!)
  const point = targets.length ? pick(targets) : { x: run.hero.x + randomRange(-4, 4), z: run.hero.z + randomRange(-4, 4) }
  if (mode === 'storm') {
    if (!targets.length) return
    splash(run, skill, point, data.radius!)
    run.emit({ kind: 'lightning', x: point.x, z: point.z, value: data.radius! })
  }
  else {
    const flight = data.flight!
    run.projectiles.push({ id: run.nextId++, kind: 'flask', x: run.hero.x, z: run.hero.z, y: 1.3, vx: (point.x - run.hero.x) / flight, vz: (point.z - run.hero.z) / flight, vy: (-1.3 + 10 * flight * flight) / flight, age: 0, life: flight, skill, hits: new Set(), pierce: 1, aim: { x: point.x, z: point.z } })
  }
}
function stepTomes(run: RunSession, dt: number): void {
  const skill = run.weapon('tomes'), tomes = run.tomes
  if (!skill) return
  tomes.timer -= dt
  if (tomes.timer <= 0) {
    tomes.active = !tomes.active
    if (tomes.active) { tomes.skill = skill; beginCast(run, skill.id); run.emit({ kind: 'tomes', x: run.hero.x, z: run.hero.z }) }
    tomes.timer = tomes.active ? skill.data.duration! : skill.data.rest! / (1 + run.passiveValue('haste'))
  }
  tomes.fade = Math.max(0, Math.min(1, tomes.fade + dt / (tomes.active ? .25 : -.3)))
  tomes.angle = (tomes.angle + dt * 3.4) % (Math.PI * 2)
  if (tomes.fade < .5) return
  const data = skill.data
  for (let i = 0; i < data.count!; i++) {
    const angle = tomes.angle + i * Math.PI * 2 / data.count!, point = { x: run.hero.x + Math.cos(angle) * data.radius!, z: run.hero.z + Math.sin(angle) * data.radius! }
    for (const enemy of run.world.nearby(point, .5)) {
      if (run.time - (tomes.hits.get(enemy.id) ?? -100) < .45) continue
      tomes.hits.set(enemy.id, run.time)
      hitEnemy(run, enemy, skill.id, 'tomes', run.hero, data.knockback)
    }
    hitProps(run, point, .5, data.damage)
  }
}
export function stepWeapons(run: RunSession, dt: number): void {
  for (const key of weaponKeys) {
    const skill = run.weapon(key)
    if (!skill || key === 'tomes') continue
    const timer = (run.cooldowns.get(key) ?? 0) - dt
    if (timer > 0) { run.cooldowns.set(key, timer); continue }
    const data = skill.data
    run.cooldowns.set(key, timer + data.cooldown! / (1 + run.passiveValue('haste')))
    beginCast(run, skill.id)
    if (key === 'lash') {
      lash(run, skill, run.hero.facing)
      if (data.rank >= 2) run.delayed.push({ at: run.time + .16, mode: 'lash', skill, side: -run.hero.facing })
    }
    else if (key === 'ward') {
      splash(run, skill, run.hero, data.radius!)
      run.emit({ kind: 'ward', x: run.hero.x, z: run.hero.z, value: data.radius! })
    }
    else for (let i = 0; i < data.count!; i++) run.delayed.push({ at: run.time + i * (key === 'wand' ? .08 : key === 'storm' ? .07 : .09), mode: key === 'wand' ? 'bolt' : key === 'storm' ? 'storm' : 'flask', skill, side: 0 })
  }
  const ready = run.delayed.filter(cast => cast.at <= run.time)
  run.delayed = run.delayed.filter(cast => cast.at > run.time)
  for (const cast of ready) castDelayed(run, cast)
  stepTomes(run, dt)
  for (const pool of run.pools) {
    pool.age += dt; pool.nextTick -= dt
    if (pool.nextTick <= 0 && pool.age < pool.life) { pool.nextTick += .35; splash(run, pool.skill, pool, pool.skill.data.radius!) }
  }
  run.pools = run.pools.filter(pool => pool.age < pool.life)
}
export function spawnWave(run: RunSession, boss: Enemy): void {
  const config = run.content.formations.reaper
  run.projectiles.push({ id: run.nextId++, kind: 'wave', x: boss.x, z: boss.z, y: 1.1, vx: boss.aim.x * config.waveSpeed, vz: boss.aim.z * config.waveSpeed, vy: 0, age: 0, life: config.waveLife, caster: boss, hits: new Set(), pierce: 1, aim: { ...boss.aim } })
  run.emit({ kind: 'scythe', x: boss.x, z: boss.z, side: Math.atan2(boss.aim.z, boss.aim.x) })
}
export function stepProjectiles(run: RunSession, dt: number): void {
  run.projectiles = run.projectiles.filter(projectile => {
    projectile.age += dt
    if (projectile.kind === 'bolt') {
      if (!projectile.target || projectile.target.dead) projectile.target = run.world.nearest(projectile, 9)
      if (projectile.target) {
        const current = Math.atan2(projectile.vz, projectile.vx), wanted = Math.atan2(projectile.target.z - projectile.z, projectile.target.x - projectile.x)
        const diff = Math.atan2(Math.sin(wanted - current), Math.cos(wanted - current)), angle = current + Math.max(-dt * 9, Math.min(dt * 9, diff))
        projectile.vx = Math.cos(angle) * 15; projectile.vz = Math.sin(angle) * 15
      }
    }
    if (projectile.kind === 'flask') { projectile.vy -= 20 * dt; projectile.y += projectile.vy * dt }
    projectile.x += projectile.vx * dt; projectile.z += projectile.vz * dt
    if (projectile.kind === 'flask') {
      if (projectile.age >= projectile.life) {
        const skill = projectile.skill!
        run.pools.push({ id: run.nextId++, ...projectile.aim, age: 0, life: skill.data.duration!, nextTick: 0, skill })
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
      const skill = projectile.skill!
      for (const enemy of run.world.nearby(projectile, .25)) {
        if (projectile.hits.has(enemy.id)) continue
        hitEnemy(run, enemy, skill.id, 'wand', { x: projectile.x - projectile.vx, z: projectile.z - projectile.vz }, skill.data.knockback)
        projectile.hits.add(enemy.id)
        if (--projectile.pierce === 0) return false
      }
      const brazier = run.world.props.find(prop => prop.kind === 'brazier' && !prop.broken && distance(prop, projectile) < .7)
      if (brazier) { hitProps(run, projectile, .25, skill.data.damage); return false }
    }
    return projectile.age < projectile.life
  })
}
