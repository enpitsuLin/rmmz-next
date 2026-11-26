import type { Game_Event } from 'rmmz-next'
import {
  extractEventPageComments,
  parseTagAttrs,
  parseTagBoolean,
  parseTagColor,
  parseTagNumber,
} from './eventLights'

export type SpriteBillboardMode = 'none' | 'cylindrical' | 'spherical'

export type EventColliderSpec
  = | { mode: 'auto' }
    | { mode: 'none' }
    | { mode: 'box', halfW: number, halfD: number }

export interface EventSpriteConfig {
  offsetX: number
  offsetY: number
  offsetZ: number
  hasCustomOffsetY: boolean
  scale: number
  pixelSize: number | null
  anchorX: number
  anchorY: number
  emissive: number
  emissiveColor: number
  castShadow: boolean | null
  groundShadow: boolean | null
  sway: number
  swaySpeed: number
  swayPitch: number
  swayPitchSpeed: number
  breathe: boolean | null
  rotationY: number
  billboardMode: SpriteBillboardMode
  blend: boolean
  collider: EventColliderSpec
}

export const DEFAULT_EVENT_SPRITE_CONFIG: EventSpriteConfig = {
  offsetX: 0,
  offsetY: 0,
  offsetZ: 0,
  hasCustomOffsetY: false,
  scale: 1,
  pixelSize: null,
  anchorX: 0.5,
  anchorY: 1,
  emissive: 0,
  emissiveColor: 0xFFFFFF,
  castShadow: null,
  groundShadow: null,
  sway: 0,
  swaySpeed: 2,
  swayPitch: 0,
  swayPitchSpeed: 3,
  breathe: null,
  rotationY: 0,
  billboardMode: 'none',
  blend: false,
  collider: { mode: 'auto' },
}

function applySpriteTag(target: EventSpriteConfig, attrText: string): void {
  const a = parseTagAttrs(attrText)

  let offsetX = parseTagNumber(a.x)
  let offsetY = parseTagNumber(a.y)
  let offsetZ = parseTagNumber(a.z)
  if (a.offset) {
    const parts = a.offset.split(',').map(s => Number(s.trim()))
    if (Number.isFinite(parts[0]))
      offsetX = parts[0]
    if (Number.isFinite(parts[1]))
      offsetY = parts[1]
    if (Number.isFinite(parts[2]))
      offsetZ = parts[2]
  }
  if (offsetX !== undefined)
    target.offsetX = offsetX
  if (offsetY !== undefined) {
    target.offsetY = offsetY
    target.hasCustomOffsetY = true
  }
  if (offsetZ !== undefined)
    target.offsetZ = offsetZ

  let anchorX = parseTagNumber(a.anchorx)
  let anchorY = parseTagNumber(a.anchory)
  if (a.anchor) {
    const parts = a.anchor.split(',').map(s => Number(s.trim()))
    if (Number.isFinite(parts[0]))
      anchorX = parts[0]
    if (Number.isFinite(parts[1]))
      anchorY = parts[1]
  }
  if (anchorX !== undefined)
    target.anchorX = anchorX
  if (anchorY !== undefined)
    target.anchorY = anchorY

  const scale = parseTagNumber(a.scale)
  if (scale !== undefined && scale > 0)
    target.scale = scale

  const pixelSize = parseTagNumber(a.pixelsize)
  if (pixelSize !== undefined && pixelSize > 0)
    target.pixelSize = pixelSize

  if (a.emissive !== undefined) {
    if (a.emissive === 'true')
      target.emissive = 1
    else if (a.emissive === 'false')
      target.emissive = 0
    else
      target.emissive = Math.max(0, parseTagNumber(a.emissive) ?? 0)
  }

  const emissiveColor = parseTagColor(a.emissivecolor)
  if (emissiveColor !== undefined)
    target.emissiveColor = emissiveColor

  const shadow = parseTagBoolean(a.shadow ?? a.castshadow)
  if (shadow !== undefined)
    target.castShadow = shadow
  if (parseTagBoolean(a.noshadow) === true)
    target.castShadow = false

  const groundShadow = parseTagBoolean(a.groundshadow)
  if (groundShadow !== undefined)
    target.groundShadow = groundShadow

  const sway = a.sway === 'true' ? 0.05 : a.sway === 'false' ? 0 : parseTagNumber(a.sway)
  if (sway !== undefined)
    target.sway = sway

  const swaySpeed = parseTagNumber(a.swayspeed)
  if (swaySpeed !== undefined)
    target.swaySpeed = swaySpeed

  const swayPitch = a.swaypitch === 'true' ? 0.075 : a.swaypitch === 'false' ? 0 : parseTagNumber(a.swaypitch)
  if (swayPitch !== undefined)
    target.swayPitch = swayPitch

  const swayPitchSpeed = parseTagNumber(a.swaypitchspeed)
  if (swayPitchSpeed !== undefined)
    target.swayPitchSpeed = swayPitchSpeed

  const breathe = parseTagBoolean(a.breathe)
  if (breathe !== undefined)
    target.breathe = breathe

  const rot = parseTagNumber(a.rot ?? a.yaw)
  if (rot !== undefined)
    target.rotationY = rot

  const billboardRaw = a.billboard?.toLowerCase()
  if (billboardRaw === 'none' || billboardRaw === 'cylindrical' || billboardRaw === 'spherical')
    target.billboardMode = billboardRaw

  const blend = parseTagBoolean(a.blend)
  if (blend !== undefined)
    target.blend = blend

  if (a.collider !== undefined) {
    const raw = a.collider.trim().toLowerCase()
    if (raw === 'none' || raw === 'false' || raw === '0') {
      target.collider = { mode: 'none' }
    }
    else if (raw === 'auto' || raw === 'true') {
      target.collider = { mode: 'auto' }
    }
    else {
      const parts = raw.split(',').map(s => Number(s.trim()))
      if (parts.length >= 2 && Number.isFinite(parts[0]) && Number.isFinite(parts[1]) && parts[0]! > 0 && parts[1]! > 0) {
        target.collider = { mode: 'box', halfW: parts[0]! * 0.5, halfD: parts[1]! * 0.5 }
      }
      else if (parts.length === 1 && Number.isFinite(parts[0]) && parts[0]! > 0) {
        target.collider = { mode: 'box', halfW: parts[0]!, halfD: parts[0]! }
      }
    }
  }
}

function applyTagsFromText(target: EventSpriteConfig, text: string): void {
  const regex = /<hd2d-sprite([^>]*)>/gi
  for (const match of text.matchAll(regex)) {
    const raw = match[1] ?? ''
    const attrText = raw.endsWith('/') ? raw.slice(0, -1) : raw
    applySpriteTag(target, attrText)
  }
}

export function resolveEventSpriteConfig(event: Game_Event): EventSpriteConfig {
  const config: EventSpriteConfig = { ...DEFAULT_EVENT_SPRITE_CONFIG }
  const note = event.event()?.note ?? ''
  if (note)
    applyTagsFromText(config, note)

  const pageComments = extractEventPageComments(event)
  if (pageComments)
    applyTagsFromText(config, pageComments)

  return config
}
