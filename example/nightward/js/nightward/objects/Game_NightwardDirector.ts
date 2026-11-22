import type { Content, EnemyKey } from '../managers/NightwardDataManager'
import type { Point } from '../primitives/geometry'
import type { Game_NightwardRun } from './Game_NightwardRun'
import { NightwardDataManager } from '../managers/NightwardDataManager'
import { nightwardTroop } from '../patches/Game_Troop'
import { distance } from '../primitives/geometry'
import { pick, randomRange } from '../primitives/math'
import { Game_NightwardEnemy } from './Game_NightwardEnemy'

const enemyKinds: EnemyKey[] = ['bat', 'skeleton', 'ghoul', 'wraith', 'skull']

export class Game_NightwardDirector {
  budget = 0
  opening = 0
  swarm: number
  elite: number
  ring: number
  boss = false

  constructor(content: Content) {
    this.swarm = content.formations.swarm.first
    this.elite = content.formations.elite.first
    this.ring = content.formations.ring.first
  }

  spawn(run: Game_NightwardRun, key: EnemyKey, point: Point, elite = false, speed = 1): Game_NightwardEnemy {
    const entry = run.content.enemies.get(key)!
    const data = NightwardDataManager.enemyData(entry)
    const enemy = new Game_NightwardEnemy(run.nextId++, entry, data, point, run.content, run.time, elite, speed)
    nightwardTroop(run.troop).addNightwardEnemy(enemy.battler)
    run.world.move(enemy, 0, 0, enemy.radius, data.layer)
    run.world.enemies.push(enemy)
    if (enemy.isReaper()) {
      run.boss = enemy
      run.emit({ kind: 'boss', x: enemy.x, z: enemy.z })
    }
    return enemy
  }

  update(run: Game_NightwardRun, dt: number): void {
    const time = run.time
    const config = run.content.formations
    if (this.opening === 0 && time >= 0.12) {
      const gap = Math.random() * Math.PI * 2
      for (let i = 0; i < 12; i++)
        this.spawn(run, 'bat', this.ringPoint(run, randomRange(7, 9), gap + 0.7 + i / 12 * (Math.PI * 2 - 1.4), false))
      this.opening = 1
    }
    if (this.opening === 1 && time >= 0.4) {
      const side = Math.random() < 0.5 ? 0 : Math.PI
      for (let i = 0; i < 5; i++)
        this.spawn(run, 'bat', this.ringPoint(run, 8 + i * 0.6, side + (i - 2) * 0.13, false))
      this.opening = 2
    }
    this.budget += dt * (1 + 0.06 * time + 0.22 * (time / 60) ** 2)
    const alive = run.world.enemies.filter(enemy => !enemy.dead).length
    const cap = Math.min(run.content.config.enemyCap, Math.floor(60 + 2.2 * time))
    let room = cap - alive
    while (this.budget >= 1 && room > 0) {
      this.spawn(run, this.chooseType(run), this.ringPoint(run))
      this.budget--
      room--
    }
    if (room <= 0)
      this.budget = Math.min(1, this.budget)
    if (time >= this.swarm) {
      this.swarm += config.swarm.every
      const count = Math.min(config.swarm.maxCount, config.swarm.baseCount + config.swarm.growth * Math.floor(time / 30))
      const angle = Math.random() * Math.PI * 2
      for (let i = 0; i < count && room > 0; i++, room--)
        this.spawn(run, time > 130 && Math.random() < 0.35 ? 'skull' : 'bat', this.ringPoint(run, 18 + Math.floor(i / 6) * 0.7, angle + (i % 6 - 2.5) * 0.045), false, 1.2)
    }
    if (time >= this.elite) {
      this.elite += config.elite.every
      const key = time < config.elite.transitions[0]!
        ? 'skeleton'
        : time < config.elite.transitions[1]!
          ? 'ghoul'
          : time < config.elite.transitions[2]!
            ? 'wraith'
            : pick<EnemyKey>(['skeleton', 'ghoul', 'wraith'])
      if (room > 0) {
        this.spawn(run, key, this.ringPoint(run), true)
        room--
      }
    }
    if (time >= this.ring) {
      const index = Math.floor(this.ring / config.ring.every) - 1
      this.ring += config.ring.every
      const count = Math.round(Math.min(config.ring.maxCount, config.ring.baseCount + config.ring.growth * index) * (time >= config.reaper.first ? config.ring.afterReaper : 1))
      for (let i = 0; i < count && room > 0; i++, room--)
        this.spawn(run, 'skeleton', this.ringPoint(run, 18, i / count * Math.PI * 2))
      run.emit({ kind: 'ring', x: run.hero.x, z: run.hero.z })
    }
    if (!run.demo && !this.boss && time >= config.reaper.first) {
      this.boss = true
      const point = { ...run.content.spawns.reaper }
      if (distance(point, run.hero) > 32) {
        point.x = run.hero.x
        point.z = run.hero.z - 13
      }
      this.spawn(run, 'reaper', point)
    }
  }

  updateEnemies(run: Game_NightwardRun, dt: number): void {
    for (const enemy of run.world.enemies)
      enemy.update(run, dt)
    const removed = run.world.enemies.filter(enemy => enemy.isRemovable())
    if (removed.length) {
      const dead = new Set(removed.map(enemy => enemy.battler))
      nightwardTroop(run.troop).removeNightwardEnemies(dead)
      for (const enemy of removed)
        run.weapons.clearEnemyHits(enemy.id)
      run.world.enemies = run.world.enemies.filter(enemy => !enemy.isRemovable())
    }
    run.world.grid.rebuild(run.world.enemies)
  }

  private chooseType(run: Game_NightwardRun): EnemyKey {
    const time = run.time
    const { timeline, weights } = run.content.formations.swarm
    let phase = timeline.findIndex(checkpoint => checkpoint > time) - 1
    if (phase < 0)
      phase = timeline.length - 1
    const blend = phase < timeline.length - 1 ? (time - timeline[phase]!) / (timeline[phase + 1]! - timeline[phase]!) : 0
    const row = weights[phase]!.map((value, i) => value + ((weights[Math.min(phase + 1, weights.length - 1)]![i]!) - value) * blend)
    let roll = Math.random() * row.reduce((a, b) => a + b, 0)
    for (let i = 0; i < row.length; i++) {
      roll -= row[i]!
      if (roll <= 0)
        return enemyKinds[i]!
    }
    return 'bat'
  }

  private ringPoint(run: Game_NightwardRun, radius = randomRange(17, 21), angle = Math.random() * Math.PI * 2, outside = true): Point {
    const limit = Math.max(1, run.content.map.bounds - 3)
    let point: Point = { ...run.hero }
    for (let attempt = 0; attempt < 24; attempt++) {
      point = {
        x: Math.max(-limit, Math.min(limit, run.hero.x + Math.cos(angle) * radius)),
        z: Math.max(-limit, Math.min(limit, run.hero.z + Math.sin(angle) * radius)),
      }
      if (!outside || !run.isSpawnVisible?.(point))
        return point
      if (distance(point, run.hero) < radius - 2)
        angle += 2.4
      else radius += 2
    }
    return point
  }
}
