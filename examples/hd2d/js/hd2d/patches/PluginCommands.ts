import type { EventLightPreset, EventLightType, PartialEventLightSpec } from '../scene/eventLights'
import { GlobalMananger, PluginManager } from 'rmmz-next'
import {
  clearEventLightOverride,
  LIGHT_PRESETS,
  resolveEventLightSpec,
  setEventLightOverride,
  setPlayerLightOverride,
} from '../scene/eventLights'

function parseOptNumber(raw: string | undefined): number | undefined {
  if (!raw || raw.trim() === '')
    return undefined
  const n = Number(raw)
  return Number.isFinite(n) ? n : undefined
}

function parseOptColor(raw: string | undefined): number | undefined {
  if (!raw || raw.trim() === '')
    return undefined
  const clean = raw.trim().replace(/^#|^0x/i, '')
  return /^[0-9a-f]{6}$/i.test(clean) ? Number.parseInt(clean, 16) : undefined
}

function parseOptBool(raw: string | undefined): boolean | undefined {
  if (!raw || raw.trim() === '' || raw === 'inherit')
    return undefined
  return raw === 'true'
}

function specFromCommandArgs(args: Record<string, string | undefined>): PartialEventLightSpec {
  const presetRaw = args.preset?.trim().toLowerCase() as EventLightPreset | undefined
  const preset = presetRaw && presetRaw in LIGHT_PRESETS ? presetRaw : undefined
  const typeRaw = args.type?.trim().toLowerCase()
  const type: EventLightType | undefined = typeRaw === 'spot' ? 'spot' : typeRaw === 'point' ? 'point' : undefined

  return {
    preset,
    type,
    color: parseOptColor(args.color),
    intensity: parseOptNumber(args.intensity),
    range: parseOptNumber(args.range),
    decay: parseOptNumber(args.decay),
    offsetX: parseOptNumber(args.offsetX),
    offsetY: parseOptNumber(args.offsetY),
    offsetZ: parseOptNumber(args.offsetZ),
    castShadow: parseOptBool(args.castShadow),
    spriteLight: parseOptBool(args.spriteLight),
    flicker: parseOptNumber(args.flicker),
    pulse: parseOptNumber(args.pulse),
    sway: parseOptNumber(args.sway),
    coneAngle: parseOptNumber(args.coneAngle),
    penumbra: parseOptNumber(args.penumbra),
    pitch: parseOptNumber(args.pitch),
    followDir: parseOptBool(args.followDir),
  }
}

export function installPluginCommands(): void {
  PluginManager.registerCommand('Hd2d', 'SetEventLight', function (this: { _eventId?: number }, args: Record<string, string | undefined>) {
    const rawId = Number(args.eventId ?? 0)
    const eventId = rawId > 0 ? rawId : (this._eventId ?? 0)
    if (eventId <= 0)
      return
    const spec = resolveEventLightSpec(specFromCommandArgs(args))
    setEventLightOverride(GlobalMananger.$gameMap.mapId(), eventId, [spec])
  })

  PluginManager.registerCommand('Hd2d', 'ClearEventLight', function (this: { _eventId?: number }, args: Record<string, string | undefined>) {
    const rawId = Number(args.eventId ?? 0)
    const eventId = rawId > 0 ? rawId : (this._eventId ?? 0)
    if (eventId <= 0)
      return
    if (args.turnOff === 'true') {
      setEventLightOverride(GlobalMananger.$gameMap.mapId(), eventId, null)
    }
    else {
      clearEventLightOverride(GlobalMananger.$gameMap.mapId(), eventId)
    }
  })

  PluginManager.registerCommand('Hd2d', 'SetPlayerLight', (args: Record<string, string | undefined>) => {
    const spec = resolveEventLightSpec(specFromCommandArgs(args))
    setPlayerLightOverride([spec])
  })

  PluginManager.registerCommand('Hd2d', 'ClearPlayerLight', () => {
    setPlayerLightOverride(null)
  })
}
