import type { MZ } from 'rmmz-next/database-types'
import type { Content, WeaponKey } from '../managers/NightwardDataManager'
import type { Point } from '../primitives/geometry'
import type { Game_NightwardEnemy } from './Game_NightwardEnemy'
import type { Game_NightwardRun } from './Game_NightwardRun'
import { NightwardDataManager, weaponKeys } from '../managers/NightwardDataManager'
import { direction, distance } from '../primitives/geometry'
import { pick, randomRange } from '../primitives/math'

export interface Projectile extends Point {
  id: number
  kind: 'bolt' | 'flask' | 'wave'
  y: number
  vx: number
  vz: number
  vy: number
  age: number
  life: number
  target?: Game_NightwardEnemy
  caster?: Game_NightwardEnemy
  weapon?: MZ.Weapon
  lastHit: number
  pierce: number
  aim: Point
}

export interface FirePool extends Point {
  id: number
  age: number
  life: number
  startedAt: number
  nextTick: number
  weapon: MZ.Weapon
}

export interface DelayedCast {
  at: number
  mode: 'lash' | 'bolt' | 'storm' | 'flask'
  weapon: MZ.Weapon
  side: number
}

export interface TomeState {
  active: boolean
  timer: number
  fade: number
  angle: number
  count: number
  radius: number
  hits: Map<number, number>
}

export class Game_NightwardWeapons {
  cooldowns = new Map<WeaponKey, number>()
  tomes: TomeState = { active: false, timer: 0, fade: 0, angle: 0, count: 0, radius: 0, hits: new Map() }
  wardPulse = 0
  projectiles: Projectile[] = []
  pools: FirePool[] = []
  delayed: DelayedCast[] = []

  constructor(content: Content) {
    for (const key of weaponKeys)
      this.cooldowns.set(key, NightwardDataManager.weaponData(content.weapons.get(key)![0]!).initialDelay)
    this.tomes.timer = NightwardDataManager.weaponData(content.weapons.get('tomes')![0]!).initialDelay
  }

  onWeaponGranted(key: WeaponKey, rank: number, weapon: MZ.Weapon): void {
    const data = NightwardDataManager.weaponData(weapon)
    if (rank === 1) {
      this.cooldowns.set(key, data.initialDelay)
      if (key === 'tomes')
        this.tomes.timer = data.initialDelay
    }
    if (key === 'tomes' && this.tomes.active) {
      this.tomes.count = data.count!
      this.tomes.radius = data.radius!
    }
  }

  clearEnemyHits(enemyId: number): void {
    this.tomes.hits.delete(enemyId)
  }

  spawnWave(run: Game_NightwardRun, boss: Game_NightwardEnemy): void {
    const config = run.content.formations.reaper
    this.projectiles.push({
      id: run.nextId++,
      kind: 'wave',
      x: boss.x,
      z: boss.z,
      y: 1.1,
      vx: boss.aim.x * config.waveSpeed,
      vz: boss.aim.z * config.waveSpeed,
      vy: 0,
      age: 0,
      life: config.waveLife,
      caster: boss,
      lastHit: -1,
      pierce: 1,
      aim: { ...boss.aim },
    })
    run.emit({ kind: 'scythe', x: boss.x, z: boss.z, side: Math.atan2(boss.aim.z, boss.aim.x) })
  }

  update(run: Game_NightwardRun, dt: number): void {
    this.updateCasts(run, dt)
    this.updateFirePools(run)
    this.updateProjectiles(run, dt)
  }

  clear(): void {
    this.projectiles.length = 0
    this.pools.length = 0
    this.delayed.length = 0
    this.tomes.hits.clear()
  }

  private splash(run: Game_NightwardRun, weapon: MZ.Weapon, point: Point, radius: number): void {
    for (const enemy of run.world.nearby(point, radius))
      run.combat.hitEnemy(run, enemy, weapon, point)
    run.combat.hitProps(run, point, radius, weapon)
  }

  private lash(run: Game_NightwardRun, weapon: MZ.Weapon, side: number): void {
    const data = NightwardDataManager.weaponData(weapon)
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
        run.combat.hitEnemy(run, enemy, weapon, { x: enemy.x - side, z: enemy.z })
    }
    run.combat.hitProps(run, origin, reach, weapon, prop => (prop.x - origin.x) * side > -0.25 && contains(prop, 0.45))
  }

  private castDelayed(run: Game_NightwardRun, cast: DelayedCast): void {
    const castKey = NightwardDataManager.weaponData(cast.weapon).key
    const weapon = run.weapon(castKey)!
    const { mode } = cast
    const data = NightwardDataManager.weaponData(weapon)
    if (mode === 'lash') {
      this.lash(run, weapon, cast.side)
      return
    }
    if (mode === 'bolt') {
      const target = run.world.nearest(run.hero, data.range!)
      if (!target)
        return
      const n = direction(target.x - run.hero.x, target.z - run.hero.z)
      const angle = Math.atan2(n.z, n.x || (n.z ? 0 : run.hero.facing)) + randomRange(-0.45, 0.45)
      const projectile: Projectile = {
        id: run.nextId++,
        kind: 'bolt',
        x: run.hero.x,
        z: run.hero.z,
        y: data.height!,
        vx: Math.cos(angle) * data.speed!,
        vz: Math.sin(angle) * data.speed!,
        vy: 0,
        age: 0,
        life: data.life!,
        target,
        weapon,
        lastHit: -1,
        pierce: data.pierce!,
        aim: target,
      }
      this.projectiles.push(projectile)
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
      this.splash(run, weapon, point, data.radius!)
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
      this.projectiles.push({
        id: run.nextId++,
        kind: 'flask',
        x: run.hero.x,
        z: run.hero.z,
        y: data.throwHeight!,
        vx: (point.x - run.hero.x) / flight,
        vz: (point.z - run.hero.z) / flight,
        vy: (-data.throwHeight! + 0.5 * data.gravity! * flight * flight) / flight,
        age: 0,
        life: flight,
        weapon,
        lastHit: -1,
        pierce: 1,
        aim: point,
      })
    }
  }

  private updateTomes(run: Game_NightwardRun, dt: number): void {
    const weapon = run.weapon('tomes')
    if (!weapon)
      return
    const data = NightwardDataManager.weaponData(weapon)
    const tomes = this.tomes
    tomes.timer -= dt
    if (tomes.timer <= 0) {
      tomes.active = !tomes.active
      if (tomes.active) {
        tomes.count = data.count!
        tomes.radius = data.radius!
        run.combat.beginCast(run, weapon)
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
        run.combat.hitEnemy(run, enemy, weapon, run.hero)
      }
      run.combat.hitProps(run, point, data.radiusHit!, weapon)
    }
  }

  private isCooldownReady(run: Game_NightwardRun, weapon: MZ.Weapon, dt: number): boolean {
    const data = NightwardDataManager.weaponData(weapon)
    const key = data.key
    const remaining = this.cooldowns.get(key)! - dt
    if (remaining > 0) {
      this.cooldowns.set(key, remaining)
      return false
    }
    const interval = data.cooldown! * run.cooldownScale()
    this.cooldowns.set(key, remaining + interval > 0 ? remaining + interval : interval)
    return true
  }

  private flushDelayed(run: Game_NightwardRun, key: WeaponKey): void {
    const casts = this.delayed.filter(cast => NightwardDataManager.weaponData(cast.weapon).key === key && cast.at <= run.time + 1e-6)
    this.delayed = this.delayed.filter(cast => !casts.includes(cast))
    for (const cast of casts)
      this.castDelayed(run, cast)
  }

  private updateCasts(run: Game_NightwardRun, dt: number): void {
    for (const key of weaponKeys) {
      const weapon = run.weapon(key)
      if (!weapon)
        continue
      const data = NightwardDataManager.weaponData(weapon)
      if (key === 'tomes') {
        this.updateTomes(run, dt)
        continue
      }
      if (key === 'ward')
        this.wardPulse = Math.max(0, this.wardPulse - dt / data.pulseFade!)
      if (this.isCooldownReady(run, weapon, dt)) {
        run.combat.beginCast(run, weapon)
        if (key === 'lash') {
          this.lash(run, weapon, run.hero.facing)
          if (data.rank >= 2)
            this.delayed.push({ at: run.time + data.backDelay!, mode: 'lash', weapon, side: -run.hero.facing })
        }
        else if (key === 'ward') {
          this.wardPulse = 1
          run.emit({ kind: 'ward', x: run.hero.x, z: run.hero.z, value: data.radius! })
          this.splash(run, weapon, run.hero, data.radius!)
        }
        else {
          const queued = this.delayed.filter(cast => NightwardDataManager.weaponData(cast.weapon).key === key)
          const first = queued.length ? queued[queued.length - 1]!.at + data.stagger! : run.time
          for (let i = 0; i < data.count!; i++)
            this.delayed.push({ at: first + i * data.stagger!, mode: key === 'wand' ? 'bolt' : key, weapon, side: 0 })
        }
      }
      this.flushDelayed(run, key)
    }
  }

  private updateFirePools(run: Game_NightwardRun): void {
    this.pools = this.pools.filter((pool) => {
      pool.age = run.time - pool.startedAt
      if (pool.age >= pool.life)
        return false
      const data = NightwardDataManager.weaponData(pool.weapon)
      if (run.time >= pool.nextTick - 1e-6) {
        pool.nextTick += data.tick!
        this.splash(run, pool.weapon, pool, data.radius!)
      }
      return true
    })
  }

  private updateProjectiles(run: Game_NightwardRun, dt: number): void {
    this.projectiles = this.projectiles.filter((projectile) => {
      projectile.age += dt
      if (projectile.kind === 'bolt') {
        const data = NightwardDataManager.weaponData(projectile.weapon!)
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
        const data = NightwardDataManager.weaponData(projectile.weapon!)
        projectile.vy -= data.gravity! * dt
        projectile.y += projectile.vy * dt
      }
      projectile.x += projectile.vx * dt
      projectile.z += projectile.vz * dt
      if (projectile.kind === 'flask') {
        if (projectile.age >= projectile.life - 1e-6) {
          const weapon = projectile.weapon!
          const data = NightwardDataManager.weaponData(weapon)
          projectile.x = projectile.aim.x
          projectile.y = 0
          projectile.z = projectile.aim.z
          if (this.pools.length === 32)
            this.pools.shift()
          this.pools.push({ id: run.nextId++, ...projectile.aim, age: 0, life: data.duration!, startedAt: run.time, nextTick: run.time, weapon })
          run.emit({ kind: 'flask', ...projectile.aim, value: data.radius! })
          return false
        }
      }
      else if (projectile.kind === 'wave') {
        if (projectile.pierce && distance(projectile, run.hero) < run.content.formations.reaper.waveRadius + run.content.hero.radius) {
          run.combat.hurtHero(run, projectile.caster!, projectile)
          projectile.pierce = 0
        }
      }
      else {
        const weapon = projectile.weapon!
        const radius = NightwardDataManager.weaponData(weapon).radiusHit!
        for (const enemy of run.world.nearby(projectile, radius)) {
          if (projectile.lastHit === enemy.id)
            continue
          projectile.lastHit = enemy.id
          run.combat.hitEnemy(run, enemy, weapon, { x: enemy.x - projectile.vx, z: enemy.z - projectile.vz })
          if (--projectile.pierce === 0)
            return false
        }
        const brazier = run.world.props.find(prop => prop.active && prop.kind === 'brazier' && !prop.broken && distance(prop, projectile) <= radius + prop.radius)
        if (brazier) {
          run.combat.hitProps(run, projectile, radius, weapon)
          return false
        }
        const limit = run.content.map.bounds + 10
        if (Math.abs(projectile.x) > limit || Math.abs(projectile.z) > limit)
          return false
      }
      return projectile.age < projectile.life
    })
  }
}
