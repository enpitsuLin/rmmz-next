import type { Matrix4 } from '@pixi/3d'
import type { Game_Event } from 'rmmz-next'
import type { PropPlacement, PropScene } from '../managers/NightwardPropSceneManager'
import type { NightwardEvent } from '../patches/Game_Event'
import type { PropObstacle } from './Game_NightwardProp'
import { eventComments } from '../primitives/metadata'
import { Game_NightwardProp } from './Game_NightwardProp'

export type { Game_NightwardProp as Prop, PropObstacle }

interface EventDriver {
  event: Game_Event
  page?: ReturnType<Game_Event['page']>
  bindings: {
    prop: Game_NightwardProp
    offset: number[]
  }[]
  x: number
  z: number
}

function activePageOf(event: Game_Event): ReturnType<Game_Event['page']> | undefined {
  const extended = event as Partial<NightwardEvent>
  if (typeof extended.nightwardActivePage === 'function')
    return extended.nightwardActivePage()
  return event._erased || event._pageIndex < 0 ? undefined : event.page()
}

function realPositionOf(event: Game_Event): { x: number, y: number } {
  const extended = event as Partial<NightwardEvent>
  return {
    x: typeof extended.nightwardRealX === 'function' ? extended.nightwardRealX() : event._realX,
    y: typeof extended.nightwardRealY === 'function' ? extended.nightwardRealY() : event._realY,
  }
}

export class Game_NightwardProps {
  readonly props: Game_NightwardProp[]
  revision = 0
  structureRevision = 0
  private byId = new Map<string, Game_NightwardProp>()
  private drivers: EventDriver[] = []

  constructor(scene: PropScene, events: Game_Event[], private center: number) {
    this.props = scene.props.map((placement: PropPlacement) => {
      const prop = new Game_NightwardProp(placement)
      this.revision++
      this.byId.set(prop.id, prop)
      return prop
    })
    // Only logic events with explicit bindings participate in frame updates.
    for (const event of events) {
      const text = event.event().pages.flatMap(page => eventComments(page.list)).join('\n')
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

  get(id: string): Game_NightwardProp | undefined {
    return this.byId.get(id)
  }

  select(target: string): Game_NightwardProp[] {
    return target.startsWith('#')
      ? this.props.filter(prop => prop.tags.includes(target.slice(1)))
      : [this.get(target)].filter((prop): prop is Game_NightwardProp => !!prop)
  }

  move(prop: Game_NightwardProp, x: number, y: number, z: number): void {
    prop.move(x, y, z)
    this.revision++
  }

  transform(prop: Game_NightwardProp, matrix: Matrix4): void {
    prop.transform(matrix)
    this.revision++
  }

  show(prop: Game_NightwardProp, active: boolean): void {
    if (prop.show(active))
      this.revision++
  }

  break(prop: Game_NightwardProp, time: number): boolean {
    if (!prop.break(time))
      return false
    this.revision++
    return true
  }

  open(prop: Game_NightwardProp, amount: number, time: number, duration: number): void {
    prop.open(amount, time, duration)
  }

  remove(prop: Game_NightwardProp): void {
    this.show(prop, false)
    this.byId.delete(prop.id)
    const index = this.props.indexOf(prop)
    if (index >= 0)
      this.props.splice(index, 1)
    for (const driver of this.drivers)
      driver.bindings = driver.bindings.filter(entry => entry.prop !== prop)
    this.structureRevision++
  }

  doorAmount(prop: Game_NightwardProp, time: number): number {
    return prop.doorAmount(time)
  }

  updateEvents(): void {
    for (const driver of this.drivers) {
      const { event } = driver
      const page = activePageOf(event)
      if (page !== driver.page) {
        for (const entry of driver.bindings)
          this.show(entry.prop, false)
        driver.page = page
        driver.bindings = []
        driver.x = Number.NaN
        const text = eventComments(page?.list).join('\n')
        for (const match of text.matchAll(/<prop:([^>]+)>(?:\s*<propOffset:([^>]+)>)?/gi)) {
          const prop = this.get(match[1]!.trim())
          if (!prop)
            throw new Error(`Event ${event.eventId()}: unknown Prop ${match[1]}`)
          driver.bindings.push({ prop, offset: (match[2] ?? '0,0,0').split(',').map(Number) })
          this.show(prop, true)
        }
      }
      const pos = realPositionOf(event)
      if (driver.x === pos.x && driver.z === pos.y)
        continue
      driver.x = pos.x
      driver.z = pos.y
      for (const { prop, offset } of driver.bindings)
        this.move(prop, pos.x - this.center + offset[0]!, offset[1]!, pos.y - this.center + offset[2]!)
    }
  }

  obstacles(): PropObstacle[] {
    return this.props.flatMap(prop => prop.obstacles())
  }

  dispose(): void {
    this.drivers.length = 0
    this.byId.clear()
    this.props.length = 0
  }
}
