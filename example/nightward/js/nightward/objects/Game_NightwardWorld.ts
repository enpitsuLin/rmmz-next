import type { Content, Layer } from '../managers/NightwardDataManager'
import type { Point } from '../primitives/geometry'
import type { Game_NightwardEnemy } from './Game_NightwardEnemy'
import type { Game_NightwardProp } from './Game_NightwardProp'
import type { Game_NightwardProps } from './Game_NightwardProps'
import { GlobalMananger as globals } from 'rmmz-next'
import { direction, distance } from '../primitives/geometry'
import { SpatialGrid } from '../primitives/SpatialGrid'

export interface Obstacle extends Point { width: number, depth: number, prop?: Game_NightwardProp }

export class Game_NightwardWorld {
  get props(): Game_NightwardProp[] { return this.propManager.props }
  get propsRevision(): number { return this.propManager.structureRevision }
  obstacles: Obstacle[] = []
  enemies: Game_NightwardEnemy[] = []
  grid = new SpatialGrid<Game_NightwardEnemy>()
  private tileObstacles: Obstacle[] = []
  private staticGrid = new SpatialGrid<Obstacle>(8)
  private collisionRevision = -1
  private obstacleReach = 0

  constructor(private content: Content, readonly propManager: Game_NightwardProps) {
    const map = globals.$gameMap
    const center = content.map.center
    for (let y = 0; y < map.height(); y++) {
      for (let x = 0; x < map.width(); x++) {
        if (!map.checkPassage(x, y, 0x0F))
          this.tileObstacles.push({ x: x - center, z: y - center, width: 1, depth: 1 })
      }
    }
    this.syncProps()
  }

  syncProps(): void {
    if (this.collisionRevision === this.propManager.revision)
      return
    this.obstacles = [...this.tileObstacles, ...this.propManager.obstacles()]
    this.obstacleReach = 0
    for (const box of this.obstacles)
      this.obstacleReach = Math.max(this.obstacleReach, box.width / 2, box.depth / 2)
    this.staticGrid.rebuild(this.obstacles)
    this.collisionRevision = this.propManager.revision
  }

  nearby(point: Point, radius: number): Game_NightwardEnemy[] {
    return this.grid.query(point.x, point.z, radius + 2.1).filter(enemy => !enemy.dead && distance(point, enemy) < radius + enemy.radius)
  }

  nearest(point: Point, radius: number, exclude = -1): Game_NightwardEnemy | undefined {
    let best: Game_NightwardEnemy | undefined
    let bestDistance = radius
    for (const enemy of this.nearby(point, radius)) {
      if (enemy.id === exclude)
        continue
      const d = distance(point, enemy)
      if (d < bestDistance) {
        bestDistance = d
        best = enemy
      }
    }
    return best
  }

  move(body: Point, dx: number, dz: number, radius: number, layer: Layer = 'ground'): void {
    const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.3))
    for (let i = 0; i < steps; i++) {
      const edge = this.content.map.bounds - 1
      body.x = Math.max(-edge + radius, Math.min(edge - radius, body.x + dx / steps))
      body.z = Math.max(-edge + radius, Math.min(edge - radius, body.z + dz / steps))
      if (layer !== 'ground')
        continue
      for (const box of this.staticGrid.query(body.x, body.z, radius + this.obstacleReach)) {
        if (box.prop && (!box.prop.active || box.prop.broken))
          continue
        const nx = Math.max(box.x - box.width / 2, Math.min(box.x + box.width / 2, body.x))
        const nz = Math.max(box.z - box.depth / 2, Math.min(box.z + box.depth / 2, body.z))
        const px = body.x - nx
        const pz = body.z - nz
        const d = Math.hypot(px, pz)
        if (d >= radius)
          continue
        if (d > 0.0001) {
          body.x += px / d * (radius - d)
          body.z += pz / d * (radius - d)
        }
        else {
          const exits = [
            { axis: 'x' as const, value: box.x - box.width / 2 - radius },
            { axis: 'x' as const, value: box.x + box.width / 2 + radius },
            { axis: 'z' as const, value: box.z - box.depth / 2 - radius },
            { axis: 'z' as const, value: box.z + box.depth / 2 + radius },
          ]
          exits.sort((a, b) => Math.abs(body[a.axis] - a.value) - Math.abs(body[b.axis] - b.value))
          body[exits[0]!.axis] = exits[0]!.value
        }
      }
    }
  }

  separate(enemy: Game_NightwardEnemy, dt: number): void {
    if (enemy.isReaper())
      return
    for (const other of this.grid.query(enemy.x, enemy.z, 2.1)) {
      if (other === enemy || other.dead || other.data.layer !== enemy.data.layer)
        continue
      const min = enemy.radius + other.radius
      const d = distance(enemy, other)
      if (d >= min)
        continue
      const n = d < 0.001 ? { x: Math.sin(enemy.id), z: Math.cos(enemy.id) } : direction(enemy.x - other.x, enemy.z - other.z)
      const share = other.data.mass / (enemy.data.mass + other.data.mass)
      const push = Math.min(0.12, (min - d) * dt * 9 * share)
      this.move(enemy, n.x * push, n.z * push, enemy.radius, enemy.data.layer)
    }
  }
}
