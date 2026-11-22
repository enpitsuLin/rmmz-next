import type { EnemyKey } from '../managers/NightwardDataManager'
import type { Point } from '../primitives/geometry'
import type { Game_NightwardRun } from './Game_NightwardRun'
import type { Enemy } from './Game_NightwardWorld'
import { Game_Enemy } from 'rmmz-next'
import { direction, distance } from '../primitives/geometry'
import { pick, randomRange } from '../primitives/math'
import { spawnWave } from './weapons'

export interface DirectorState { budget: number, opening: number, swarm: number, elite: number, ring: number, boss: boolean }
const kinds: EnemyKey[] = ['bat', 'skeleton', 'ghoul', 'wraith', 'skull']
function chooseType(run: Game_NightwardRun): EnemyKey {
  const time = run.time, { timeline, weights } = run.content.formations.swarm
  let phase = timeline.findIndex(checkpoint => checkpoint > time) - 1
  if (phase < 0) phase = timeline.length - 1
  const blend = phase < timeline.length - 1 ? (time - timeline[phase]!) / (timeline[phase + 1]! - timeline[phase]!) : 0
  const row = weights[phase]!.map((value, i) => value + ((weights[Math.min(phase + 1, weights.length - 1)]![i]!) - value) * blend)
  let roll = Math.random() * row.reduce((a, b) => a + b, 0)
  for (let i = 0; i < row.length; i++) { roll -= row[i]!; if (roll <= 0) return kinds[i]! }
  return 'bat'
}
function ringPoint(run: Game_NightwardRun, radius = randomRange(17, 21), angle = Math.random() * Math.PI * 2, outside = true): Point {
  let point: Point = { ...run.hero }
  for (let attempt = 0; attempt < 24; attempt++) {
    point = { x: Math.max(-87, Math.min(87, run.hero.x + Math.cos(angle) * radius)), z: Math.max(-87, Math.min(87, run.hero.z + Math.sin(angle) * radius)) }
    if (!outside || !run.isSpawnVisible?.(point)) return point
    if (distance(point, run.hero) < radius - 2) angle += 2.4
    else radius += 2
  }
  return point
}
export function spawnEnemy(run: Game_NightwardRun, key: EnemyKey, point: Point, elite = false, speed = 1): Enemy {
  const entry = run.content.enemies.get(key)!, boss = key === 'reaper', data = entry.data
  const battler = new Game_Enemy(entry.id, 0, 0)
  const healthScale = boss ? 1 : (1 + Math.max(0, run.time - 30) / 120) * (elite ? 4 : 1)
  battler.addParam(0, Math.round(entry.params[0]! * (healthScale - 1)))
  battler.recoverAll()
  run.troop.members().push(battler)
  battler.onBattleStart(false)
  const enemy: Enemy = { id: run.nextId++, x: point.x, z: point.z, battler, data, radius: data.radius * (elite ? 1.6 : 1), speed: data.speed * speed * (boss ? 1 : 1 + Math.min(.25, run.time / 720)), contact: data.damage * (elite ? 2 : 1), elite, vx: 0, vz: 0, age: 0, flash: 0, dying: 0, dead: false, state: boss ? 'rise' : 'walk', phase: boss ? run.content.formations.reaper.rise : 0, swing: run.content.formations.reaper.firstSwing, aim: { x: 0, z: 1 } }
  run.world.move(enemy, 0, 0, enemy.radius, data.layer)
  run.world.enemies.push(enemy)
  if (boss) { run.boss = enemy; run.emit({ kind: 'boss', x: enemy.x, z: enemy.z }) }
  return enemy
}
export function stepDirector(run: Game_NightwardRun, dt: number): void {
  const state = run.director, time = run.time, config = run.content.formations
  if (state.opening === 0 && time >= .12) {
    const gap = Math.random() * Math.PI * 2
    for (let i = 0; i < 12; i++) spawnEnemy(run, 'bat', ringPoint(run, randomRange(7, 9), gap + .7 + i / 12 * (Math.PI * 2 - 1.4), false))
    state.opening = 1
  }
  if (state.opening === 1 && time >= .4) {
    const side = Math.random() < .5 ? 0 : Math.PI
    for (let i = 0; i < 5; i++) spawnEnemy(run, 'bat', ringPoint(run, 8 + i * .6, side + (i - 2) * .13, false))
    state.opening = 2
  }
  state.budget += dt * (1 + .06 * time + .22 * (time / 60) ** 2)
  const alive = run.world.enemies.filter(enemy => !enemy.dead).length, cap = Math.min(900, Math.floor(60 + 2.2 * time))
  let room = cap - alive
  while (state.budget >= 1 && room > 0) { spawnEnemy(run, chooseType(run), ringPoint(run)); state.budget--; room-- }
  if (room <= 0) state.budget = Math.min(1, state.budget)
  if (time >= state.swarm) {
    state.swarm += config.swarm.every
    const count = Math.min(config.swarm.maxCount, config.swarm.baseCount + config.swarm.growth * Math.floor(time / 30)), angle = Math.random() * Math.PI * 2
    for (let i = 0; i < count && room > 0; i++, room--) spawnEnemy(run, time > 130 && Math.random() < .35 ? 'skull' : 'bat', ringPoint(run, 18 + Math.floor(i / 6) * .7, angle + (i % 6 - 2.5) * .045), false, 1.2)
  }
  if (time >= state.elite) {
    state.elite += config.elite.every
    const key = time < config.elite.transitions[0]! ? 'skeleton' : time < config.elite.transitions[1]! ? 'ghoul' : time < config.elite.transitions[2]! ? 'wraith' : pick<EnemyKey>(['skeleton', 'ghoul', 'wraith'])
    if (room > 0) { spawnEnemy(run, key, ringPoint(run), true); room-- }
  }
  if (time >= state.ring) {
    const index = Math.floor(state.ring / config.ring.every) - 1
    state.ring += config.ring.every
    const count = Math.round(Math.min(config.ring.maxCount, config.ring.baseCount + config.ring.growth * index) * (time >= config.reaper.first ? config.ring.afterReaper : 1))
    for (let i = 0; i < count && room > 0; i++, room--) spawnEnemy(run, 'skeleton', ringPoint(run, 18, i / count * Math.PI * 2))
    run.emit({ kind: 'ring', x: run.hero.x, z: run.hero.z })
  }
  if (!run.demo && !state.boss && time >= config.reaper.first) {
    state.boss = true
    const point = { x: 0, z: -12.5 }
    if (distance(point, run.hero) > 32) { point.x = run.hero.x; point.z = run.hero.z - 13 }
    spawnEnemy(run, 'reaper', point)
  }
}
function stepBoss(run: Game_NightwardRun, boss: Enemy, dt: number): void {
  const config = run.content.formations.reaper
  boss.phase -= dt
  if (boss.state === 'rise') { if (boss.phase <= 0) boss.state = 'walk'; return }
  if (boss.state === 'windup') {
    if (boss.phase <= 0) { spawnWave(run, boss); boss.state = 'recover'; boss.phase = config.recover }
    return
  }
  if (boss.state === 'recover') { if (boss.phase <= 0) boss.state = 'walk'; return }
  boss.swing -= dt
  if (boss.swing <= 0 && distance(boss, run.hero) < config.range) {
    boss.state = 'windup'; boss.phase = config.windup; boss.swing = config.swingEvery
    boss.aim = direction(run.hero.x - boss.x, run.hero.z - boss.z)
    run.emit({ kind: 'windup', x: boss.x, z: boss.z, side: Math.atan2(boss.aim.z, boss.aim.x) })
  }
}
export function stepEnemies(run: Game_NightwardRun, dt: number): void {
  for (const enemy of run.world.enemies) {
    enemy.age += dt; enemy.flash = Math.max(0, enemy.flash - dt)
    if (enemy.dead) { enemy.dying -= dt; continue }
    if (enemy.data.key === 'reaper') stepBoss(run, enemy, dt)
    const moving = enemy.state === 'walk', n = direction(run.hero.x - enemy.x, run.hero.z - enemy.z)
    run.world.move(enemy, ((moving ? n.x * enemy.speed : 0) + enemy.vx) * dt, ((moving ? n.z * enemy.speed : 0) + enemy.vz) * dt, enemy.radius, enemy.data.layer)
    enemy.vx *= Math.exp(-dt * 8); enemy.vz *= Math.exp(-dt * 8)
    run.world.separate(enemy, dt)
  }
  const removed = run.world.enemies.filter(enemy => enemy.dead && enemy.dying <= 0)
  if (removed.length) {
    const dead = new Set(removed.map(enemy => enemy.battler))
    run.troop._enemies = run.troop.members().filter(battler => !dead.has(battler))
    for (const enemy of removed) run.tomes.hits.delete(enemy.id)
    run.world.enemies = run.world.enemies.filter(enemy => !enemy.dead || enemy.dying > 0)
  }
  run.world.grid.rebuild(run.world.enemies)
}
