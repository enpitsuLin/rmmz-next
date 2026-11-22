import type { Matrix4 } from '@pixi/3d'
import type { LocalCollider, PropModel, PropPlacement } from '../managers/NightwardPropSceneManager'
import { transformPoint } from '../primitives/geometry'

export interface PropObstacle extends LocalCollider {
  prop: Game_NightwardProp
}

export class Game_NightwardProp {
  readonly id: string
  readonly seed: number
  readonly modelKey: string
  readonly model: PropModel
  readonly kind: string
  readonly tags: string[]
  readonly matrix: Matrix4
  readonly baseRadius: number
  x = 0
  y = 0
  z = 0
  active: boolean
  revision = 0
  radius: number
  hp: number
  broken = false
  brokenAt = -1
  doorMotion?: { from: number, to: number, start: number, duration: number }

  constructor(placement: PropPlacement) {
    this.id = placement.id
    this.seed = placement.seed
    this.modelKey = placement.modelKey
    this.model = placement.model
    this.kind = placement.model.kind
    this.tags = [...(placement.model.tags ?? [])]
    this.matrix = placement.matrix.clone()
    this.active = placement.model.active ?? true
    this.baseRadius = placement.model.radius ?? 0.45
    this.radius = this.baseRadius
    this.hp = placement.model.hp ?? Infinity
    this.touch()
  }

  touch(): void {
    const m = this.matrix.elements
    this.x = m[12]!
    this.y = m[13]!
    this.z = m[14]!
    this.radius = this.baseRadius * Math.max(Math.hypot(m[0]!, m[2]!), Math.hypot(m[8]!, m[10]!))
    this.revision++
  }

  move(x: number, y: number, z: number): void {
    this.matrix.setPosition({ x, y, z })
    this.touch()
  }

  transform(matrix: Matrix4): void {
    this.matrix.copyFrom(matrix)
    this.touch()
  }

  show(active: boolean): boolean {
    if (this.active === active)
      return false
    this.active = active
    this.touch()
    return true
  }

  break(time: number): boolean {
    if (!this.active || this.broken)
      return false
    this.hp = 0
    this.broken = true
    this.brokenAt = time
    this.touch()
    return true
  }

  open(amount: number, time: number, duration: number): void {
    this.doorMotion = {
      from: this.doorAmount(time),
      to: Math.max(0, Math.min(1, amount)),
      start: time,
      duration,
    }
  }

  doorAmount(time: number): number {
    const motion = this.doorMotion
    if (!motion)
      return 0
    const elapsed = time - motion.start
    if (elapsed >= motion.duration)
      return motion.to
    return motion.from + (motion.to - motion.from) * (elapsed / motion.duration)
  }

  obstacles(): PropObstacle[] {
    if (!this.active || this.broken)
      return []
    return this.model.colliders.map((box) => {
      const corners = [-1, 1].flatMap(x => [-1, 1].map(z => transformPoint(this.matrix, box.x + x * box.width / 2, 0, box.z + z * box.depth / 2)))
      const xs = corners.map(point => point.x)
      const zs = corners.map(point => point.z)
      const minX = Math.min(...xs)
      const maxX = Math.max(...xs)
      const minZ = Math.min(...zs)
      const maxZ = Math.max(...zs)
      return { x: (minX + maxX) / 2, z: (minZ + maxZ) / 2, width: maxX - minX, depth: maxZ - minZ, prop: this }
    })
  }
}
