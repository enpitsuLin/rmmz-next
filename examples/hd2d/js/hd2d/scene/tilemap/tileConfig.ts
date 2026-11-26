import { Tilemap } from 'rmmz-next'
import { parseTagAttrs, parseTagNumber } from '../eventLights'

export type TileStandMode = 'flat' | 'stand' | 'cylindrical' | 'spherical'

export interface TilesetTagRule {
  mode: TileStandMode
  /** Random Y-axis jitter amplitude in radians when mode === 'stand' and rotationY is null. Null uses span-based default. */
  jitter: number | null
  /** Explicit Y-axis rotation in radians (overrides jitter). */
  rotationY: number | null
}

export type TilesetTileRules = ReadonlyMap<number, TilesetTagRule>

export interface MapTileOverride {
  x: number
  y: number
  /** Internal map.data layer index (1..3 for editor layers 2..4), or null for any B-E layer. */
  layerZ: number | null
  mode: TileStandMode | null
  rotationY: number | null
  offsetX: number | null
  offsetY: number | null
  offsetZ: number | null
}

const DEG_TO_RAD = Math.PI / 180

const DEFAULT_TAG_RULES: readonly [number, TilesetTagRule][] = [
  [1, { mode: 'stand', jitter: null, rotationY: null }],
  [2, { mode: 'stand', jitter: 0, rotationY: 0 }],
]

function parseStandMode(modeRaw: string | undefined, billboardRaw: string | undefined): TileStandMode | null {
  const raw = (modeRaw ?? billboardRaw)?.trim().toLowerCase()
  if (!raw)
    return null
  switch (raw) {
    case 'flat':
    case 'none':
    case 'false':
      return 'flat'
    case 'stand':
    case 'card':
      return 'stand'
    case 'cylindrical':
    case 'billboard':
    case 'true':
      return 'cylindrical'
    case 'spherical':
      return 'spherical'
    default:
      return null
  }
}

function parseRotationRad(attrs: Record<string, string>): number | null {
  const rot = parseTagNumber(attrs.rot ?? attrs.yaw)
  if (rot !== undefined)
    return rot
  const deg = parseTagNumber(attrs.deg)
  if (deg !== undefined)
    return deg * DEG_TO_RAD
  return null
}

function parseOffset(attrs: Record<string, string>): { x: number | null, y: number | null, z: number | null } {
  let x = parseTagNumber(attrs.offsetx) ?? null
  let y = parseTagNumber(attrs.offsety) ?? null
  let z = parseTagNumber(attrs.offsetz) ?? null
  if (attrs.offset) {
    const parts = attrs.offset.split(',').map(s => Number(s.trim()))
    if (Number.isFinite(parts[0]))
      x = parts[0]!
    if (Number.isFinite(parts[1]))
      y = parts[1]!
    if (Number.isFinite(parts[2]))
      z = parts[2]!
  }
  return { x, y, z }
}

function matchTileTags(note: string): string[] {
  const results: string[] = []
  const regex = /<hd2d-tile([^>]*)>/gi
  for (const match of note.matchAll(regex)) {
    const raw = match[1] ?? ''
    results.push(raw.endsWith('/') ? raw.slice(0, -1) : raw)
  }
  return results
}

/**
 * Parses <hd2d-tile tag="..." mode="..." jitter="..." rot="..." deg="..."> tags from a Tileset's Note.
 * Unspecified tags keep defaults (tag 1 = standing card with subtle jitter, tag 2 = straight standing card).
 */
export function parseTilesetTileRules(note: string): TilesetTileRules {
  const rules = new Map<number, TilesetTagRule>(
    DEFAULT_TAG_RULES.map(([tag, rule]) => [tag, { ...rule }]),
  )

  if (!note)
    return rules

  for (const attrText of matchTileTags(note)) {
    const attrs = parseTagAttrs(attrText)
    if (!attrs.tag)
      continue

    const tags = attrs.tag
      .split(',')
      .map(s => Number.parseInt(s.trim(), 10))
      .filter(n => Number.isInteger(n) && n >= 1 && n <= 7)
    if (tags.length === 0)
      continue

    const mode = parseStandMode(attrs.mode, attrs.billboard) ?? 'stand'
    const rotationY = parseRotationRad(attrs)
    const jitterRaw = attrs.jitter?.trim().toLowerCase()
    let jitter: number | null = 0
    if (jitterRaw === 'auto')
      jitter = null
    else if (jitterRaw !== undefined)
      jitter = Math.max(0, parseTagNumber(jitterRaw) ?? 0)

    for (const tag of tags) {
      rules.set(tag, { mode, jitter, rotationY })
    }
  }

  return rules
}

/**
 * Parses <hd2d-tile x="..." y="..." layer="..." deg="..." rot="..." mode="..." offset="..."> tags from a Map's Note.
 * Editor layer accepts 2..4 (mapped to internal z = 1..3); z directly accepts 1..3.
 */
export function parseMapTileOverrides(note: string): MapTileOverride[] {
  const overrides: MapTileOverride[] = []
  if (!note)
    return overrides

  for (const attrText of matchTileTags(note)) {
    const attrs = parseTagAttrs(attrText)
    const x = parseTagNumber(attrs.x)
    const y = parseTagNumber(attrs.y)
    if (x === undefined || y === undefined || !Number.isInteger(x) || !Number.isInteger(y))
      continue

    let layerZ: number | null = null
    const editorLayer = parseTagNumber(attrs.layer)
    if (editorLayer !== undefined && Number.isInteger(editorLayer) && editorLayer >= 2 && editorLayer <= 4) {
      layerZ = editorLayer - 1
    }
    else {
      const rawZ = parseTagNumber(attrs.z)
      if (rawZ !== undefined && Number.isInteger(rawZ) && rawZ >= 1 && rawZ <= 3)
        layerZ = rawZ
    }

    const mode = parseStandMode(attrs.mode, attrs.billboard)
    const rotationY = parseRotationRad(attrs)
    const offset = parseOffset(attrs)

    overrides.push({
      x,
      y,
      layerZ,
      mode,
      rotationY,
      offsetX: offset.x,
      offsetY: offset.y,
      offsetZ: offset.z,
    })
  }

  return overrides
}

/** Extracts the Terrain Tag (1..7) for B-E tiles only; A1-A5 always return 0 and stay flat on the ground. */
export function getStandingTerrainTag(tileId: number, flags: readonly number[]): number {
  if (!Tilemap.isVisibleTile(tileId) || Tilemap.isAutotile(tileId) || Tilemap.isTileA5(tileId))
    return 0
  return (flags[tileId] ?? 0) >> 12
}

/** Finds the effective map-level override for a single tile cell and internal B-E layer z (1..3). */
export function findMapTileOverride(
  x: number,
  y: number,
  layerZ: number,
  overrides: readonly MapTileOverride[],
): MapTileOverride | null {
  let wildcard: MapTileOverride | null = null
  let exact: MapTileOverride | null = null
  for (const item of overrides) {
    if (item.x !== x || item.y !== y)
      continue
    if (item.layerZ === layerZ)
      exact = item
    else if (item.layerZ === null)
      wildcard = item
  }
  return exact ?? wildcard
}

/** Resolves the standing rule for a B-E tile at (x, y, z), or null if it should remain flat on the ground. */
export function resolveStandingTileRule(
  x: number,
  y: number,
  layerZ: number,
  tileId: number,
  flags: readonly number[],
  rules: TilesetTileRules,
  overrides: readonly MapTileOverride[],
): TilesetTagRule | null {
  const tag = getStandingTerrainTag(tileId, flags)
  const baseRule = tag > 0 ? rules.get(tag) ?? null : null
  const override = overrides.length > 0 ? findMapTileOverride(x, y, layerZ, overrides) : null

  const effectiveMode = override?.mode ?? baseRule?.mode ?? 'flat'
  if (effectiveMode === 'flat')
    return null

  return {
    mode: effectiveMode,
    jitter: baseRule?.jitter ?? 0,
    rotationY: override?.rotationY ?? baseRule?.rotationY ?? null,
  }
}
