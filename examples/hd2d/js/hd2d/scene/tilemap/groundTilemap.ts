import type { Bitmap } from 'rmmz-next'
import type { MapTileOverride, TilesetTileRules } from './tileConfig'
import { Container3D, Material3D, Mesh3D, PlaneGeometry } from '@pixi/3d'
import { RenderTexture } from 'pixi.js'
import { GlobalMananger, Graphics, Tilemap } from 'rmmz-next'
import { TILE_UNIT } from '../../constants'
import { resolveStandingTileRule } from './tileConfig'
import { loadOptionalNormalBitmap } from './tilesetUtils'

export interface TilemapGround {
  object: Container3D
  update: () => void
  destroy: () => void
}

function stripBillboardTiles(
  data: readonly number[],
  width: number,
  height: number,
  flags: readonly number[],
  tileRules: TilesetTileRules,
  mapOverrides: readonly MapTileOverride[],
  stripShadows: boolean,
): number[] {
  const layerSize = width * height
  const out = data.slice()

  // Strip standing B-E tiles from ground layers z=1..3 (A1-A5 remain flat on the ground).
  for (let z = 1; z < 4; z++) {
    const offset = z * layerSize
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = offset + y * width + x
        const tileId = out[idx] ?? 0
        if (tileId > 0 && resolveStandingTileRule(x, y, z, tileId, flags, tileRules, mapOverrides))
          out[idx] = 0
      }
    }
  }

  if (stripShadows) {
    const shadowOffset = 4 * layerSize
    for (let i = 0; i < layerSize; i++)
      out[shadowOffset + i] = 0
  }

  return out
}

function hasAnimatedA1Tiles(data: readonly number[], width: number, height: number): boolean {
  const layerSize = width * height
  for (let z = 0; z < 2; z++) {
    const offset = z * layerSize
    for (let i = 0; i < layerSize; i++) {
      const tileId = data[offset + i] ?? 0
      if (Tilemap.isTileA1(tileId))
        return true
    }
  }
  return false
}

function buildOffscreenTilemap(
  mapWidth: number,
  mapHeight: number,
  tileWidth: number,
  tileHeight: number,
  data: number[],
  flags: number[],
  bitmaps: Bitmap[],
): Tilemap {
  const tilemap = new Tilemap()
  tilemap._margin = 0
  tilemap.tileWidth = tileWidth
  tilemap.tileHeight = tileHeight
  tilemap.width = mapWidth * tileWidth
  tilemap.height = mapHeight * tileHeight
  tilemap.horizontalWrap = false
  tilemap.verticalWrap = false
  tilemap.flags = flags
  tilemap.setData(mapWidth, mapHeight, data)
  tilemap.setBitmaps(bitmaps)
  tilemap.refresh()
  return tilemap
}

export async function createTilemapGround(
  colorBitmaps: Bitmap[],
  tileRules: TilesetTileRules,
  mapOverrides: readonly MapTileOverride[],
): Promise<TilemapGround> {
  const map = GlobalMananger.$gameMap
  const tileset = map.tileset()
  const mapWidth = map.width()
  const mapHeight = map.height()
  const tileWidth = map.tileWidth()
  const tileHeight = map.tileHeight()
  const flags = map.tilesetFlags()
  const rawData = map.data()

  const colorData = stripBillboardTiles(rawData, mapWidth, mapHeight, flags, tileRules, mapOverrides, false)
  const normalData = stripBillboardTiles(rawData, mapWidth, mapHeight, flags, tileRules, mapOverrides, true)
  const animated = hasAnimatedA1Tiles(colorData, mapWidth, mapHeight)

  const tilesetNames = tileset?.tilesetNames ?? []
  const normalBitmaps = await Promise.all(
    tilesetNames.map((name, index) => {
      const ref = colorBitmaps[index]
      return loadOptionalNormalBitmap(name, ref?.width || 48, ref?.height || 48)
    }),
  )

  const pixelWidth = mapWidth * tileWidth
  const pixelHeight = mapHeight * tileHeight

  const colorTilemap = buildOffscreenTilemap(mapWidth, mapHeight, tileWidth, tileHeight, colorData, flags, colorBitmaps)
  const normalTilemap = buildOffscreenTilemap(mapWidth, mapHeight, tileWidth, tileHeight, normalData, flags, normalBitmaps)

  const colorTarget = RenderTexture.create({
    width: pixelWidth,
    height: pixelHeight,
    resolution: 1,
    scaleMode: 'nearest',
  })
  const normalTarget = RenderTexture.create({
    width: pixelWidth,
    height: pixelHeight,
    resolution: 1,
    scaleMode: 'nearest',
  })

  const renderTilemapToTarget = (tilemap: Tilemap, target: RenderTexture): void => {
    tilemap._prepareRender()
    Graphics.app.renderer.render({
      container: tilemap,
      target,
      clear: true,
    })
  }

  renderTilemapToTarget(colorTilemap, colorTarget)
  renderTilemapToTarget(normalTilemap, normalTarget)

  const worldWidth = mapWidth * TILE_UNIT
  const worldHeight = mapHeight * TILE_UNIT

  const group = new Container3D({ label: '原生地面' })

  const mainGround = new Mesh3D({
    geometry: new PlaneGeometry({ width: worldWidth, height: worldHeight, flipV: false }),
    material: new Material3D({
      baseColorTexture: colorTarget,
      normalTexture: normalTarget,
      normalScale: 0.45,
      roughness: 1,
    }),
    rotation: { x: -Math.PI / 2, y: 0, z: 0 },
    castShadow: false,
    receiveShadow: true,
  })

  group.addChild(mainGround)

  let lastFrame = colorTilemap.animationFrame
  const update = (): void => {
    if (!animated)
      return
    colorTilemap.update()
    if (colorTilemap.animationFrame !== lastFrame) {
      lastFrame = colorTilemap.animationFrame
      normalTilemap.animationFrame = lastFrame
      renderTilemapToTarget(colorTilemap, colorTarget)
      renderTilemapToTarget(normalTilemap, normalTarget)
    }
  }

  const destroy = (): void => {
    colorTilemap.destroy({ children: true })
    normalTilemap.destroy({ children: true })
    colorTarget.destroy(true)
    normalTarget.destroy(true)
  }

  return { object: group, update, destroy }
}
