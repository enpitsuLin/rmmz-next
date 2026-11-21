import type { Game_Enemy } from 'rmmz-next'
import type { Content, EnemyData, Layer, Point, PropData } from './content'
import { direction, distance } from './content'

export interface Enemy extends Point {
  id: number
  battler: Game_Enemy
  data: EnemyData
  radius: number
  speed: number
  contact: number
  elite: boolean
  vx: number
  vz: number
  age: number
  flash: number
  dying: number
  dead: boolean
  state: 'rise' | 'walk' | 'windup' | 'recover'
  phase: number
  swing: number
  aim: Point
}
export interface Prop extends PropData { hp: number, broken: boolean, radius: number }
export interface Obstacle extends Point { width: number, depth: number, prop: Prop }
export class SpatialGrid<T extends Point> {
  private cells = new Map<string, T[]>()
  constructor(private size = 3) {}
  rebuild(items: readonly T[]): void {
    this.cells.clear()
    for (const item of items) {
      const key = `${Math.floor(item.x / this.size)},${Math.floor(item.z / this.size)}`
      const cell = this.cells.get(key)
      if (cell) cell.push(item)
      else this.cells.set(key, [item])
    }
  }
  query(x: number, z: number, radius: number): T[] {
    const result: T[] = []
    for (let cx = Math.floor((x - radius) / this.size); cx <= Math.floor((x + radius) / this.size); cx++) for (let cz = Math.floor((z - radius) / this.size); cz <= Math.floor((z + radius) / this.size); cz++) {
      const cell = this.cells.get(`${cx},${cz}`)
      if (cell) result.push(...cell)
    }
    return result
  }
}
export class World {
  props: Prop[]
  obstacles: Obstacle[]
  enemies: Enemy[] = []
  grid = new SpatialGrid<Enemy>()
  private staticGrid = new SpatialGrid<Obstacle>(8)
  constructor(content: Content) {
    this.props = content.props.map(prop => ({ ...prop, hp: prop.kind === 'brazier' ? 10 : Infinity, broken: false, radius: .45 }))
    this.obstacles = this.props.map(prop => ({ x: prop.x, z: prop.z, width: prop.width ?? (prop.kind === 'tree' ? .65 : prop.kind === 'brazier' ? .6 : .8), depth: prop.depth ?? (prop.kind === 'tree' ? .65 : .5), prop }))
    this.staticGrid.rebuild(this.obstacles)
  }
  nearby(point: Point, radius: number): Enemy[] {
    return this.grid.query(point.x, point.z, radius + 2.1).filter(enemy => !enemy.dead && distance(point, enemy) < radius + enemy.radius)
  }
  nearest(point: Point, radius: number, exclude = -1): Enemy | undefined {
    let best: Enemy | undefined, bestDistance = radius
    for (const enemy of this.nearby(point, radius)) {
      if (enemy.id === exclude) continue
      const d = distance(point, enemy)
      if (d < bestDistance) { bestDistance = d; best = enemy }
    }
    return best
  }
  move(body: Point, dx: number, dz: number, radius: number, layer: Layer = 'ground'): void {
    const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / .3))
    for (let i = 0; i < steps; i++) {
      body.x = Math.max(-89 + radius, Math.min(89 - radius, body.x + dx / steps))
      body.z = Math.max(-89 + radius, Math.min(89 - radius, body.z + dz / steps))
      if (layer !== 'ground') continue
      for (const box of this.staticGrid.query(body.x, body.z, radius + 5)) {
        if (box.prop.broken) continue
        const nx = Math.max(box.x - box.width / 2, Math.min(box.x + box.width / 2, body.x))
        const nz = Math.max(box.z - box.depth / 2, Math.min(box.z + box.depth / 2, body.z))
        const px = body.x - nx, pz = body.z - nz, d = Math.hypot(px, pz)
        if (d >= radius) continue
        if (d > .0001) { body.x += px / d * (radius - d); body.z += pz / d * (radius - d) }
        else {
          const exits = [{ axis: 'x' as const, value: box.x - box.width / 2 - radius }, { axis: 'x' as const, value: box.x + box.width / 2 + radius }, { axis: 'z' as const, value: box.z - box.depth / 2 - radius }, { axis: 'z' as const, value: box.z + box.depth / 2 + radius }]
          exits.sort((a, b) => Math.abs(body[a.axis] - a.value) - Math.abs(body[b.axis] - b.value))
          body[exits[0]!.axis] = exits[0]!.value
        }
      }
    }
  }
  separate(enemy: Enemy, dt: number): void {
    if (enemy.data.key === 'reaper') return
    for (const other of this.grid.query(enemy.x, enemy.z, 2.1)) {
      if (other === enemy || other.dead || other.data.layer !== enemy.data.layer) continue
      const min = enemy.radius + other.radius, d = distance(enemy, other)
      if (d >= min) continue
      const n = d < .001 ? { x: Math.sin(enemy.id), z: Math.cos(enemy.id) } : direction(enemy.x - other.x, enemy.z - other.z)
      const share = other.data.mass / (enemy.data.mass + other.data.mass)
      const push = Math.min(.12, (min - d) * dt * 9 * share)
      this.move(enemy, n.x * push, n.z * push, enemy.radius, enemy.data.layer)
    }
  }
}
