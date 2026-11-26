import type { Game_CharacterBase, Game_Event } from 'rmmz-next'
import type { DynamicSpriteLight } from '../utils/spriteLighting'
import { Container3D, PointLight, SpotLight } from '@pixi/3d'
import { GlobalMananger } from 'rmmz-next'
import { CHAR_PIXEL_SIZE_TALL, tileToWorld } from '../constants'

export type EventLightType = 'point' | 'spot'
export type EventLightPreset = 'torch' | 'campfire' | 'lantern' | 'crystal' | 'flashlight'

export interface EventLightSpec {
  type: EventLightType
  color: number
  intensity: number
  range: number
  decay: number
  radius: number
  offsetX: number
  offsetY: number
  offsetZ: number
  castShadow: boolean
  shadowBias: number
  spriteLight: boolean
  flicker: number
  flickerSpeed: number
  flickerJitter: number
  pulse: number
  pulseSpeed: number
  sway: number
  swaySpeed: number
  coneAngle: number
  penumbra: number
  pitch: number
  yaw: number | null
  followDir: boolean
}

export type PartialEventLightSpec = Partial<EventLightSpec> & {
  preset?: EventLightPreset
}

const DEFAULT_LIGHT_SPEC: EventLightSpec = {
  type: 'point',
  color: 0xFFCC88,
  intensity: 10,
  range: 3.0,
  decay: 0.25,
  radius: 0.1,
  offsetX: 0,
  offsetY: 0.85,
  offsetZ: 0.15,
  castShadow: false,
  shadowBias: 0.00015,
  spriteLight: true,
  flicker: 0,
  flickerSpeed: 1,
  flickerJitter: 0.002,
  pulse: 0,
  pulseSpeed: 2.4,
  sway: 0,
  swaySpeed: 2,
  coneAngle: 32,
  penumbra: 0.4,
  pitch: -26,
  yaw: null,
  followDir: true,
}

export const LIGHT_PRESETS: Record<EventLightPreset, Partial<EventLightSpec>> = {
  torch: {
    type: 'point',
    color: 0xFFBB4C,
    intensity: 12,
    range: 2.6,
    decay: 0.15,
    offsetX: 0.14,
    offsetY: 1.05,
    offsetZ: 0.28,
    castShadow: true,
    shadowBias: 0.00015,
    flicker: 0.14,
    flickerSpeed: 1,
    flickerJitter: 0.002,
  },
  campfire: {
    type: 'point',
    color: 0xFF9C40,
    intensity: 14,
    range: 4.0,
    decay: 0.22,
    offsetX: 0,
    offsetY: 0.55,
    offsetZ: 0.1,
    castShadow: true,
    shadowBias: 0.0002,
    flicker: 0.22,
    flickerSpeed: 1.15,
    flickerJitter: 0.004,
  },
  lantern: {
    type: 'point',
    color: 0xFFD39B,
    intensity: 8.5,
    range: 3.6,
    decay: 0.35,
    offsetX: 0,
    offsetY: 0.9,
    offsetZ: 0.15,
    castShadow: false,
    sway: 0.03,
    swaySpeed: 2,
  },
  crystal: {
    type: 'point',
    color: 0x66CCFF,
    intensity: 9.5,
    range: 3.4,
    decay: 0.3,
    offsetX: 0,
    offsetY: 0.75,
    offsetZ: 0.12,
    castShadow: false,
    pulse: 0.28,
    pulseSpeed: 2.6,
  },
  flashlight: {
    type: 'spot',
    color: 0xFFF3D6,
    intensity: 16,
    range: 6.5,
    coneAngle: 28,
    penumbra: 0.45,
    offsetX: 0,
    offsetY: 0.65,
    offsetZ: 0,
    pitch: -18,
    followDir: true,
    castShadow: true,
    shadowBias: 0.0002,
  },
}

export function resolveEventLightSpec(partial: PartialEventLightSpec): EventLightSpec {
  const presetValues = partial.preset ? LIGHT_PRESETS[partial.preset] : undefined
  const { preset: _ignored, ...rest } = partial
  return {
    ...DEFAULT_LIGHT_SPEC,
    ...presetValues,
    ...definedOnly(rest),
  }
}

function definedOnly<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {}
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined)
      (out as Record<string, unknown>)[key] = value
  }
  return out
}

function parseColor(raw: string | undefined): number | undefined {
  if (!raw)
    return undefined
  const clean = raw.trim().replace(/^#|^0x/i, '')
  if (!/^[0-9a-f]{6}$/i.test(clean))
    return undefined
  return Number.parseInt(clean, 16)
}

function parseNumber(raw: string | undefined): number | undefined {
  if (raw === undefined || raw.trim() === '')
    return undefined
  const num = Number(raw)
  return Number.isFinite(num) ? num : undefined
}

function parseBoolean(raw: string | undefined): boolean | undefined {
  if (raw === undefined)
    return undefined
  const lower = raw.trim().toLowerCase()
  if (lower === 'true' || lower === '1' || lower === 'yes' || lower === 'on')
    return true
  if (lower === 'false' || lower === '0' || lower === 'no' || lower === 'off')
    return false
  return undefined
}

function parseAttrs(raw: string): Record<string, string> {
  const attrs: Record<string, string> = {}
  const regex = /([a-z][\w-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/gi
  for (const match of raw.matchAll(regex)) {
    const key = match[1]!.toLowerCase()
    const value = match[2] ?? match[3] ?? match[4] ?? 'true'
    attrs[key] = value
  }
  return attrs
}

function parseSingleLightTag(attrText: string): EventLightSpec {
  const a = parseAttrs(attrText)
  const presetRaw = a.preset?.toLowerCase() as EventLightPreset | undefined
  const preset = presetRaw && presetRaw in LIGHT_PRESETS ? presetRaw : undefined
  const typeRaw = a.type?.toLowerCase()
  const type: EventLightType | undefined = typeRaw === 'spot' ? 'spot' : typeRaw === 'point' ? 'point' : undefined

  let offsetX = parseNumber(a.x)
  let offsetY = parseNumber(a.y)
  let offsetZ = parseNumber(a.z)
  if (a.offset) {
    const parts = a.offset.split(',').map(s => Number(s.trim()))
    if (Number.isFinite(parts[0]))
      offsetX = parts[0]
    if (Number.isFinite(parts[1]))
      offsetY = parts[1]
    if (Number.isFinite(parts[2]))
      offsetZ = parts[2]
  }

  // Allow boolean shorthand like flicker="true" or pulse="true".
  const flickerVal = a.flicker === 'true' ? 0.16 : a.flicker === 'false' ? 0 : parseNumber(a.flicker)
  const pulseVal = a.pulse === 'true' ? 0.25 : a.pulse === 'false' ? 0 : parseNumber(a.pulse)
  const swayVal = a.sway === 'true' ? 0.04 : a.sway === 'false' ? 0 : parseNumber(a.sway)

  return resolveEventLightSpec({
    preset,
    type,
    color: parseColor(a.color),
    intensity: parseNumber(a.intensity),
    range: parseNumber(a.range),
    decay: parseNumber(a.decay),
    radius: parseNumber(a.radius),
    offsetX,
    offsetY,
    offsetZ,
    castShadow: parseBoolean(a.shadow ?? a.castshadow),
    shadowBias: parseNumber(a.shadowbias ?? a.bias),
    spriteLight: parseBoolean(a.spritelight),
    flicker: flickerVal,
    flickerSpeed: parseNumber(a.flickerspeed),
    flickerJitter: parseNumber(a.flickerjitter),
    pulse: pulseVal,
    pulseSpeed: parseNumber(a.pulsespeed),
    sway: swayVal,
    swaySpeed: parseNumber(a.swayspeed),
    coneAngle: parseNumber(a.angle ?? a.coneangle),
    penumbra: parseNumber(a.penumbra),
    pitch: parseNumber(a.pitch),
    yaw: parseNumber(a.yaw),
    followDir: parseBoolean(a.followdir),
  })
}

export interface ParsedLightTags {
  specs: EventLightSpec[]
  disabled: boolean
}

export function parseLightTagsFromText(text: string): ParsedLightTags {
  const disabled = /<hd2d-no-light\s*\/?>/i.test(text)
  const specs: EventLightSpec[] = []
  const regex = /<hd2d-light([^>]*)>/gi
  for (const match of text.matchAll(regex)) {
    const attrText = (match[1] ?? '').replace(/\/$/, '')
    specs.push(parseSingleLightTag(attrText))
  }
  return { specs, disabled }
}

export function extractEventPageComments(event: Game_Event): string {
  const page = event.page()
  if (!page || !page.list)
    return ''
  const lines: string[] = []
  for (const command of page.list) {
    if (command.code === 108 || command.code === 408) {
      lines.push(String(command.parameters[0] ?? ''))
    }
  }
  return lines.join('\n')
}

export interface EventLightRuntimeOverrides {
  mapId: number
  events: Map<number, EventLightSpec[] | null>
  player: EventLightSpec[] | null
  version: number
}

const runtimeOverrides: EventLightRuntimeOverrides = {
  mapId: 0,
  events: new Map(),
  player: null,
  version: 0,
}

function ensureMapOverrides(mapId: number): void {
  if (runtimeOverrides.mapId !== mapId) {
    runtimeOverrides.mapId = mapId
    runtimeOverrides.events.clear()
  }
}

export function setEventLightOverride(mapId: number, eventId: number, specs: EventLightSpec[] | null): void {
  ensureMapOverrides(mapId)
  runtimeOverrides.events.set(eventId, specs)
  runtimeOverrides.version++
}

export function clearEventLightOverride(mapId: number, eventId: number): void {
  ensureMapOverrides(mapId)
  if (runtimeOverrides.events.delete(eventId))
    runtimeOverrides.version++
}

export function setPlayerLightOverride(specs: EventLightSpec[] | null): void {
  runtimeOverrides.player = specs
  runtimeOverrides.version++
}

export function resolveEventLightsForEvent(
  event: Game_Event,
  defaultSpecs: readonly EventLightSpec[] = [],
): { specs: EventLightSpec[], disabled: boolean } {
  const mapId = GlobalMananger.$gameMap.mapId()
  ensureMapOverrides(mapId)

  if (event._erased || !event.page())
    return { specs: [], disabled: true }

  if (runtimeOverrides.events.has(event.eventId())) {
    const override = runtimeOverrides.events.get(event.eventId())
    if (!override || override.length === 0)
      return { specs: [], disabled: true }
    return { specs: override, disabled: false }
  }

  // Page comments take priority over event note so switching pages can toggle/change lights.
  const pageTags = parseLightTagsFromText(extractEventPageComments(event))
  if (pageTags.disabled)
    return { specs: [], disabled: true }
  if (pageTags.specs.length > 0)
    return { specs: pageTags.specs, disabled: false }

  const noteTags = parseLightTagsFromText(event.event()?.note ?? '')
  if (noteTags.disabled)
    return { specs: [], disabled: true }
  if (noteTags.specs.length > 0)
    return { specs: noteTags.specs, disabled: false }

  return { specs: [...defaultSpecs], disabled: false }
}

interface MountedLightInstance {
  spec: EventLightSpec
  light: DynamicSpriteLight
  phase: number
}

interface TrackedCharacterLights {
  character: Game_CharacterBase
  event?: Game_Event
  defaultSpecs: readonly EventLightSpec[]
  onToggle?: (lit: boolean) => void
  lastPageIndex: number
  lastErased: boolean
  instances: MountedLightInstance[]
}

function directionToYawRad(direction: number): number {
  switch (direction) {
    case 2: return 0 // South (+Z)
    case 4: return -Math.PI * 0.5 // West (-X)
    case 6: return Math.PI * 0.5 // East (+X)
    case 8: return Math.PI // North (-Z)
    default: return 0
  }
}

function createLightInstance(spec: EventLightSpec, phase: number): MountedLightInstance {
  const light: DynamicSpriteLight = spec.type === 'spot'
    ? new SpotLight({
        color: spec.color,
        intensity: spec.intensity,
        range: spec.range,
        radius: spec.radius,
        coneAngle: spec.coneAngle,
        penumbra: spec.penumbra,
        castShadow: spec.castShadow,
        shadow: spec.castShadow ? { bias: spec.shadowBias } : undefined,
      })
    : new PointLight({
        color: spec.color,
        intensity: spec.intensity,
        range: spec.range,
        decay: spec.decay,
        radius: spec.radius,
        castShadow: spec.castShadow,
        shadow: spec.castShadow ? { bias: spec.shadowBias } : undefined,
      })

  return { spec, light, phase }
}

export class EventLightManager {
  readonly object = new Container3D({ label: '事件光源' })
  private readonly tracked: TrackedCharacterLights[] = []
  private lastOverrideVersion = -1
  private readonly activeSpriteLights: DynamicSpriteLight[] = []

  constructor() {
    this.tracked.push({
      character: GlobalMananger.$gamePlayer,
      defaultSpecs: [],
      lastPageIndex: -999,
      lastErased: false,
      instances: [],
    })
  }

  registerEvent(
    event: Game_Event,
    defaultSpecs: readonly EventLightSpec[] = [],
    onToggle?: (lit: boolean) => void,
  ): void {
    const existing = this.tracked.find(t => t.event === event)
    if (existing) {
      existing.defaultSpecs = defaultSpecs
      existing.onToggle = onToggle
      this.rebuildEntry(existing)
      return
    }
    const entry: TrackedCharacterLights = {
      character: event,
      event,
      defaultSpecs,
      onToggle,
      lastPageIndex: -999,
      lastErased: false,
      instances: [],
    }
    this.tracked.push(entry)
    this.rebuildEntry(entry)
  }

  syncAllEvents(): void {
    for (const event of GlobalMananger.$gameMap.events()) {
      if (!this.tracked.some(t => t.event === event))
        this.registerEvent(event)
    }
    this.rebuildPlayerEntry()
    this.lastOverrideVersion = runtimeOverrides.version
  }

  getSpriteLights(): readonly DynamicSpriteLight[] {
    return this.activeSpriteLights
  }

  update(elapsed: number): void {
    const overridesChanged = this.lastOverrideVersion !== runtimeOverrides.version
    if (overridesChanged) {
      this.lastOverrideVersion = runtimeOverrides.version
      this.rebuildPlayerEntry()
    }

    const map = GlobalMananger.$gameMap
    const mapWidth = map.width()
    const mapHeight = map.height()
    const tMs = elapsed * 1000
    this.activeSpriteLights.length = 0

    for (const entry of this.tracked) {
      if (entry.event) {
        const pageIndex = entry.event._pageIndex
        const erased = entry.event._erased
        if (overridesChanged || pageIndex !== entry.lastPageIndex || erased !== entry.lastErased) {
          this.rebuildEntry(entry)
        }
      }

      if (entry.instances.length === 0)
        continue

      const { x: worldX, z: worldZ } = tileToWorld(entry.character._realX, entry.character._realY, mapWidth, mapHeight)
      const jumpY = entry.character.jumpHeight() * CHAR_PIXEL_SIZE_TALL

      for (const inst of entry.instances) {
        const { spec, light, phase } = inst
        let intensity = spec.intensity
        let jitterX = 0
        let jitterY = 0
        let swayX = 0

        if (spec.flicker > 0) {
          const t = tMs * spec.flickerSpeed + phase * 317
          const wave = (Math.sin(t * 4) + Math.sin(t * 2.1) * 0.5 + Math.sin(t * 6.3) * 0.2) / 1.7
          intensity *= Math.max(0.05, 1 + wave * spec.flicker)
          jitterX = Math.sin(t) * spec.flickerJitter
          jitterY = Math.cos(t * 1.3) * spec.flickerJitter * 0.75
        }

        if (spec.pulse > 0) {
          intensity *= Math.max(0.05, 1 + Math.sin(elapsed * spec.pulseSpeed + phase) * spec.pulse)
        }

        if (spec.sway > 0) {
          swayX = Math.sin(elapsed * spec.swaySpeed + phase) * spec.sway
        }

        light.intensity = intensity
        const lx = worldX + spec.offsetX + jitterX + swayX
        const ly = jumpY + spec.offsetY + jitterY
        const lz = worldZ + spec.offsetZ
        light.position.set(lx, ly, lz)

        if (light.type === 'spot') {
          const yaw = spec.yaw !== null
            ? (spec.yaw * Math.PI) / 180
            : spec.followDir
              ? directionToYawRad(entry.character.direction())
              : 0
          const pitch = (spec.pitch * Math.PI) / 180
          const cosPitch = Math.cos(pitch)
          const dirX = Math.sin(yaw) * cosPitch
          const dirY = Math.sin(pitch)
          const dirZ = Math.cos(yaw) * cosPitch
          light.lookAt({ x: lx + dirX, y: ly + dirY, z: lz + dirZ })
        }

        if (spec.spriteLight)
          this.activeSpriteLights.push(light)
      }
    }
  }

  destroy(): void {
    for (const entry of this.tracked)
      this.clearEntryLights(entry)
    this.tracked.length = 0
    this.activeSpriteLights.length = 0
  }

  private clearEntryLights(entry: TrackedCharacterLights): void {
    for (const inst of entry.instances) {
      this.object.removeChild(inst.light)
      inst.light.destroy()
    }
    entry.instances.length = 0
  }

  private rebuildPlayerEntry(): void {
    const playerEntry = this.tracked[0]
    if (!playerEntry)
      return
    this.clearEntryLights(playerEntry)
    const specs = runtimeOverrides.player ?? []
    specs.forEach((spec, idx) => {
      const inst = createLightInstance(spec, idx * 1.7)
      playerEntry.instances.push(inst)
      this.object.addChild(inst.light)
    })
  }

  private rebuildEntry(entry: TrackedCharacterLights): void {
    if (!entry.event)
      return
    this.clearEntryLights(entry)
    entry.lastPageIndex = entry.event._pageIndex
    entry.lastErased = entry.event._erased

    const { specs, disabled } = resolveEventLightsForEvent(entry.event, entry.defaultSpecs)
    specs.forEach((spec, idx) => {
      const inst = createLightInstance(spec, entry.event!.eventId() * 2.3 + idx * 1.1)
      entry.instances.push(inst)
      this.object.addChild(inst.light)
    })
    entry.onToggle?.(!disabled && specs.length > 0)
  }
}

export {
  parseAttrs as parseTagAttrs,
  parseBoolean as parseTagBoolean,
  parseColor as parseTagColor,
  parseNumber as parseTagNumber,
}
