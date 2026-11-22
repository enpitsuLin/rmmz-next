import type { Matrix4 } from '@pixi/3d'
import type { Game_Event } from 'rmmz-next'
import type { LocalCollider, PropModel } from './assets'
import type { PropPlacement, PropScene } from './prop-scene'
import { transformPoint } from './prop-scene'

export interface Prop {
  id: string
  seed: number
  modelKey: string
  model: PropModel
  kind: string
  tags: string[]
  matrix: Matrix4
  x: number
  y: number
  z: number
  active: boolean
  revision: number
  radius: number
  baseRadius: number
  hp: number
  broken: boolean
  brokenAt: number
  doorMotion?: { from: number, to: number, start: number, duration: number }
}
interface EventDriver {
  event: Game_Event
  page?: ReturnType<Game_Event['page']>
  bindings: {
    prop: Prop
    offset: number[]
  }[]
  x: number
  z: number
}
export interface PropObstacle extends LocalCollider {
  prop: Prop
}
export class PropManager {
  readonly props: Prop[]
  revision = 0
  structureRevision = 0
  private byId = new Map<string, Prop>()
  private drivers: EventDriver[] = []
  constructor(scene: PropScene, events: Game_Event[], private center: number) {
    this.props = scene.props.map((placement: PropPlacement) => {
      const matrix = placement.matrix.clone()
      const m = matrix.elements
      const prop: Prop = { id: placement.id, seed: placement.seed, modelKey: placement.modelKey, model: placement.model, kind: placement.model.kind, tags: [...(placement.model.tags ?? [])], matrix, x: m[12]!, y: m[13]!, z: m[14]!, active: placement.model.active ?? true, revision: 0, radius: placement.model.radius ?? 0.45, baseRadius: placement.model.radius ?? 0.45, hp: placement.model.hp ?? Infinity, broken: false, brokenAt: -1 }
      this.touch(prop)
      this.byId.set(prop.id, prop)
      return prop
    })
    // Only logic events with explicit bindings participate in frame updates.
    for (const event of events) {
      const text = event.event().pages.flatMap(page => page.list.filter(command => [108, 408].includes(command.code)).map(command => command.parameters[0])).join('\n')
      const matches = [...text.matchAll(/<prop:([^>]+)>/gi)]
      if (!matches.length)
        continue
      for (const match of matches) {
        const prop = this.get(match[1]!.trim())
        if (prop)
          this.show(prop, false)
      }
      this.drivers.push({ event, bindings: [], x: Number.NaN, z: Number.NaN })
    }
    this.updateEvents()
  }

  get(id: string): Prop | undefined {
    return this.byId.get(id)
  }

  select(target: string): Prop[] {
    return target.startsWith('#') ? this.props.filter(prop => prop.tags.includes(target.slice(1))) : [this.get(target)].filter((prop): prop is Prop => !!prop)
  }

  private touch(prop: Prop): void {
    const m = prop.matrix.elements
    prop.x = m[12]!
    prop.y = m[13]!
    prop.z = m[14]!
    prop.radius = prop.baseRadius * Math.max(Math.hypot(m[0]!, m[2]!), Math.hypot(m[8]!, m[10]!))
    prop.revision++
    this.revision++
  }

  move(prop: Prop, x: number, y: number, z: number): void {
    prop.matrix.setPosition({ x, y, z })
    this.touch(prop)
  }

  transform(prop: Prop, matrix: Matrix4): void {
    prop.matrix.copyFrom(matrix)
    this.touch(prop)
  }

  show(prop: Prop, active: boolean): void {
    if (prop.active === active)
      return
    prop.active = active
    this.touch(prop)
  }

  break(prop: Prop, time: number): boolean {
    if (!prop.active || prop.broken)
      return false
    prop.hp = 0
    prop.broken = true
    prop.brokenAt = time
    this.touch(prop)
    return true
  }

  open(prop: Prop, amount: number, time: number, duration: number): void {
    prop.doorMotion = { from: this.doorAmount(prop, time), to: Math.max(0, Math.min(1, amount)), start: time, duration }
  }

  remove(prop: Prop): void {
    this.show(prop, false)
    this.byId.delete(prop.id)
    const index = this.props.indexOf(prop)
    if (index >= 0)
      this.props.splice(index, 1)
    for (const driver of this.drivers) driver.bindings = driver.bindings.filter(entry => entry.prop !== prop)
    this.structureRevision++
  }

  doorAmount(prop: Prop, time: number): number {
    const motion = prop.doorMotion
    if (!motion)
      return 0
    const elapsed = time - motion.start
    if (elapsed >= motion.duration)
      return motion.to
    return motion.from + (motion.to - motion.from) * (elapsed / motion.duration)
  }

  updateEvents(): void {
    for (const driver of this.drivers) {
      const { event } = driver
      const page = event._erased || event._pageIndex < 0 ? undefined : event.page()
      if (page !== driver.page) {
        for (const entry of driver.bindings)
          this.show(entry.prop, false)
        driver.page = page
        driver.bindings = []
        driver.x = Number.NaN
        const text = page?.list.filter(command => [108, 408].includes(command.code)).map(command => command.parameters[0]).join('\n') ?? ''
        for (const match of text.matchAll(/<prop:([^>]+)>(?:\s*<propOffset:([^>]+)>)?/gi)) {
          const prop = this.get(match[1]!.trim())
          if (!prop)
            throw new Error(`Event ${event.eventId()}: unknown Prop ${match[1]}`)
          driver.bindings.push({ prop, offset: (match[2] ?? '0,0,0').split(',').map(Number) })
          this.show(prop, true)
        }
      }
      if (driver.x === event._realX && driver.z === event._realY)
        continue
      driver.x = event._realX
      driver.z = event._realY
      for (const { prop, offset } of driver.bindings)
        this.move(prop, event._realX - this.center + offset[0]!, offset[1]!, event._realY - this.center + offset[2]!)
    }
  }

  obstacles(): PropObstacle[] {
    return this.props.flatMap(prop => !prop.active || prop.broken
      ? []
      : prop.model.colliders.map((box) => {
          const corners = [-1, 1].flatMap(x => [-1, 1].map(z => transformPoint(prop.matrix, box.x + x * box.width / 2, 0, box.z + z * box.depth / 2)))
          const xs = corners.map(point => point.x)
          const zs = corners.map(point => point.z)
          const minX = Math.min(...xs)
          const maxX = Math.max(...xs)
          const minZ = Math.min(...zs)
          const maxZ = Math.max(...zs)
          return { x: (minX + maxX) / 2, z: (minZ + maxZ) / 2, width: maxX - minX, depth: maxZ - minZ, prop }
        }))
  }

  dispose(): void {
    this.drivers.length = 0
    this.byId.clear()
    this.props.length = 0
  }
}
