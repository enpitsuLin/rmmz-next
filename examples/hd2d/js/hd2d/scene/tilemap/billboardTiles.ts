import type { TextureSource } from 'pixi.js'
import type { Bitmap } from 'rmmz-next'
import type { MapTileOverride, TilesetTagRule, TilesetTileRules, TileStandMode } from './tileConfig'
import { Container3D, Material3D, Sprite3D } from '@pixi/3d'
import { Rectangle, Texture } from 'pixi.js'
import { GlobalMananger } from 'rmmz-next'
import { TILE_BILLBOARD_PIXEL_SIZE, tileToWorld } from '../../constants'
import { addSpriteShadow, getBottomInsetRatio } from '../spriteShadow'
import {
  findMapTileOverride,
  getStandingTerrainTag,
  resolveStandingTileRule,
} from './tileConfig'

interface TileCell {
  x: number
  y: number
  setNumber: number
  sheetCol: number
  sheetRow: number
  terrainTag: number
  rule: TilesetTagRule
}

const slicedTileCache = new WeakMap<TextureSource, Map<string, Texture>>()

function getSlicedTileRegion(
  source: TextureSource,
  sx: number,
  sy: number,
  sw: number,
  sh: number,
): Texture {
  let cache = slicedTileCache.get(source)
  if (!cache) {
    cache = new Map<string, Texture>()
    slicedTileCache.set(source, cache)
  }
  const key = `${sx},${sy},${sw},${sh}`
  let texture = cache.get(key)
  if (!texture) {
    texture = new Texture({ source, frame: new Rectangle(sx, sy, sw, sh) })
    cache.set(key, texture)
  }
  return texture
}

function decodeTileCell(x: number, y: number, tileId: number, terrainTag: number, rule: TilesetTagRule): TileCell {
  const setNumber = 5 + Math.floor(tileId / 256)
  const sheetCol = (Math.floor(tileId / 128) % 2) * 8 + (tileId % 8)
  const sheetRow = Math.floor((tileId % 256) / 8) % 16
  return { x, y, setNumber, sheetCol, sheetRow, terrainTag, rule }
}

/** Deterministic subtle yaw variation from map position so tiles look handcrafted. */
function subtleYaw(x: number, y: number, spanCols: number, spanRows: number, explicitJitter: number | null): number {
  const maxAngle = explicitJitter !== null
    ? explicitJitter
    : spanRows >= 3 ? 0.28 : spanCols >= 2 ? 0.16 : 0.12
  if (maxAngle <= 0)
    return 0
  const hash = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453
  const unit = (hash - Math.floor(hash)) * 2 - 1 // [-1, 1]
  return unit * maxAngle
}

function toPixiBillboardMode(mode: TileStandMode): 'none' | 'cylindrical' | 'spherical' {
  if (mode === 'cylindrical')
    return 'cylindrical'
  if (mode === 'spherical')
    return 'spherical'
  return 'none'
}

/**
 * Finds a map-level <hd2d-tile> override matching any cell in a grouped multi-tile cluster.
 * Exact layer matches take precedence over wildcard (layer-less) matches.
 */
function findClusterOverride(
  cluster: readonly TileCell[],
  layerZ: number,
  overrides: readonly MapTileOverride[],
): MapTileOverride | null {
  if (overrides.length === 0)
    return null
  let fallback: MapTileOverride | null = null
  for (const cell of cluster) {
    const match = findMapTileOverride(cell.x, cell.y, layerZ, overrides)
    if (!match)
      continue
    if (match.layerZ === layerZ)
      return match
    fallback = match
  }
  return fallback
}

/**
 * Scans native B-E tile layers (z=1..3) for standing tiles resolved via Tileset & Map
 * <hd2d-tile> rules and groups contiguous adjacent tiles into unified 3D cards/billboards.
 */
export function createTilemapBillboards(
  bitmaps: readonly Bitmap[],
  tileRules: TilesetTileRules,
  mapOverrides: readonly MapTileOverride[],
): Container3D {
  const map = GlobalMananger.$gameMap
  const mapWidth = map.width()
  const mapHeight = map.height()
  const tileWidth = map.tileWidth()
  const tileHeight = map.tileHeight()
  const flags = map.tilesetFlags()
  const data = map.data()
  const layerSize = mapWidth * mapHeight
  const pixelSize = TILE_BILLBOARD_PIXEL_SIZE

  const group = new Container3D({ label: '原生立牌景物' })
  const neighbors: readonly [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]]

  for (let z = 1; z <= 3; z++) {
    const offset = z * layerSize
    const cellMap = new Map<number, TileCell>()

    for (let y = 0; y < mapHeight; y++) {
      for (let x = 0; x < mapWidth; x++) {
        const idx = y * mapWidth + x
        const tileId = data[offset + idx] ?? 0
        if (tileId <= 0)
          continue
        const rule = resolveStandingTileRule(x, y, z, tileId, flags, tileRules, mapOverrides)
        if (rule) {
          const tag = getStandingTerrainTag(tileId, flags)
          cellMap.set(idx, decodeTileCell(x, y, tileId, tag, rule))
        }
      }
    }

    const visited = new Set<number>()
    for (const [startIdx, startCell] of cellMap) {
      if (visited.has(startIdx))
        continue

      const cluster: TileCell[] = []
      const queue: TileCell[] = [startCell]
      visited.add(startIdx)

      while (queue.length > 0) {
        const current = queue.shift()!
        cluster.push(current)

        for (const [dx, dy] of neighbors) {
          const nx = current.x + dx
          const ny = current.y + dy
          if (nx < 0 || nx >= mapWidth || ny < 0 || ny >= mapHeight)
            continue
          const nIdx = ny * mapWidth + nx
          if (visited.has(nIdx))
            continue
          const next = cellMap.get(nIdx)
          if (!next)
            continue
          // Merge only if adjacent tiles also form a contiguous region with the same mode in the tileset sheet.
          if (
            next.setNumber === current.setNumber
            && next.terrainTag === current.terrainTag
            && next.rule.mode === current.rule.mode
            && next.sheetCol - current.sheetCol === dx
            && next.sheetRow - current.sheetRow === dy
          ) {
            visited.add(nIdx)
            queue.push(next)
          }
        }
      }

      let minX = Infinity
      let maxX = -Infinity
      let maxY = -Infinity
      let minCol = Infinity
      let maxCol = -Infinity
      let minRow = Infinity
      let maxRow = -Infinity

      for (const cell of cluster) {
        if (cell.x < minX)
          minX = cell.x
        if (cell.x > maxX)
          maxX = cell.x
        if (cell.y > maxY)
          maxY = cell.y
        if (cell.sheetCol < minCol)
          minCol = cell.sheetCol
        if (cell.sheetCol > maxCol)
          maxCol = cell.sheetCol
        if (cell.sheetRow < minRow)
          minRow = cell.sheetRow
        if (cell.sheetRow > maxRow)
          maxRow = cell.sheetRow
      }

      const bitmap = bitmaps[startCell.setNumber]
      if (!bitmap || !bitmap.baseTexture)
        continue

      const spanCols = maxCol - minCol + 1
      const spanRows = maxRow - minRow + 1
      const sx = minCol * tileWidth
      const sy = minRow * tileHeight
      const sw = spanCols * tileWidth
      const sh = spanRows * tileHeight
      const texture = getSlicedTileRegion(bitmap.baseTexture, sx, sy, sw, sh)

      const worldHeight = sh * pixelSize
      const bottomInset = getBottomInsetRatio(texture) * worldHeight
      const { x: worldX, z: worldZ } = tileToWorld((minX + maxX) * 0.5, maxY, mapWidth, mapHeight)
      const layerZBias = (z - 2) * 0.02

      const mapOverride = findClusterOverride(cluster, z, mapOverrides)
      const effectiveMode = mapOverride?.mode ?? startCell.rule.mode
      const billboardMode = toPixiBillboardMode(effectiveMode)

      let rotationY = 0
      if (billboardMode === 'none') {
        rotationY = mapOverride?.rotationY
          ?? startCell.rule.rotationY
          ?? subtleYaw(minX, maxY, spanCols, spanRows, startCell.rule.jitter)
      }

      const posX = worldX + (mapOverride?.offsetX ?? 0)
      const posY = -bottomInset + (mapOverride?.offsetY ?? 0)
      const posZ = worldZ + layerZBias + (mapOverride?.offsetZ ?? 0)

      const sprite = new Sprite3D({
        texture,
        pixelSize,
        anchor: { x: 0.5, y: 1 },
        position: { x: posX, y: posY, z: posZ },
        rotation: { x: 0, y: rotationY, z: 0 },
        billboardMode,
        material: new Material3D({
          doubleSided: true,
          alphaMode: 'mask',
          metallic: spanRows >= 2 ? 0.35 : 0.15,
          roughness: 1,
        }),
        receiveShadow: true,
      })
      addSpriteShadow(sprite)
      group.addChild(sprite)
    }
  }

  return group
}
