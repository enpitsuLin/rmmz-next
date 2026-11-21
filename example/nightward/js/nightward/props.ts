import type { Game_Event } from 'rmmz-next'
import type { LocalCollider, PropModel } from './assets'
import type { Point } from './content'

export type PropEvent = Game_Event & { _nightwardProp?: { model: string, hp: number, broken: boolean, brokenAt: number } }
export interface PropBinding { model: string, offset: { x: number, y: number, z: number }, colliders: 'model' | LocalCollider[] }
export interface Prop extends Point {
  id: number
  event: PropEvent
  binding: PropBinding
  modelKey: string
  model: PropModel
  kind: string
  y: number
  active: boolean
  revision: number
  radius: number
  hp: number
  broken: boolean
  brokenAt: number
}
export function readPropBinding(event: Game_Event): PropBinding | undefined {
  if (event._erased || event._pageIndex < 0) return
  const comments = event.page().list.filter(command => command.code === 108 || command.code === 408).map(command => String(command.parameters[0])).join('\n')
  const model = comments.match(/<propModel:([^>]+)>/i)?.[1]?.trim()
  if (!model) return
  const numbers = (text: string, count: number): number[] => {
    const values = text.split(',').map(value => Number(value.trim()))
    if (values.length !== count || values.some(value => !Number.isFinite(value))) throw new Error(`Event ${event.eventId()}: invalid Prop coordinates ${text}`)
    return values
  }
  const offset = numbers(comments.match(/<propOffset:([^>]+)>/i)?.[1] ?? '0,0,0', 3)
  const collider = comments.match(/<propCollider:([^>]+)>/i)?.[1]?.trim() ?? 'model'
  let colliders: PropBinding['colliders'] = 'model'
  if (collider === 'none') colliders = []
  else if (collider !== 'model') {
    const [x, z, width, depth] = numbers(collider, 4) as [number, number, number, number]
    if (width <= 0 || depth <= 0) throw new Error(`Event ${event.eventId()}: Prop collider dimensions must be positive`)
    colliders = [{ x, z, width, depth }]
  }
  return { model, offset: { x: offset[0]!, y: offset[1]!, z: offset[2]! }, colliders }
}
export function createProp(event: PropEvent, binding: PropBinding, modelKey: string, model: PropModel): Prop {
  return {
    id: event.eventId(), event, binding, modelKey, model, kind: model.kind, x: 0, y: 0, z: 0, active: false, revision: 0, radius: model.radius ?? .45,
    get hp() { return event._nightwardProp!.hp },
    set hp(value: number) { event._nightwardProp!.hp = value },
    get broken() { return event._nightwardProp!.broken },
    set broken(value: boolean) { event._nightwardProp!.broken = value },
    get brokenAt() { return event._nightwardProp!.brokenAt },
    set brokenAt(value: number) { event._nightwardProp!.brokenAt = value },
  }
}
