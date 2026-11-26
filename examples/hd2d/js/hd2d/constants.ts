export const TILE_UNIT = 0.65
export const CHAR_PIXEL_SIZE_TALL = 0.01
export const CHAR_PIXEL_SIZE_COMPACT = 0.015
export const TILE_BILLBOARD_PIXEL_SIZE = 0.0155
export const HD2D_ASSET_ROOT = 'img/hd2d'

export interface WorldPoint {
  x: number
  z: number
}

/**
 * Converts RMMZ map tile coordinates into centered 3D world coordinates.
 * Tile center (mapWidth - 1) / 2, (mapHeight - 1) / 2 maps to world origin (0, 0).
 */
export function tileToWorld(tileX: number, tileY: number, mapWidth: number, mapHeight: number): WorldPoint {
  return {
    x: (tileX - (mapWidth - 1) / 2) * TILE_UNIT,
    z: (tileY - (mapHeight - 1) / 2) * TILE_UNIT,
  }
}

export function hd2dAssetUrl(relativePath: string): string {
  const clean = relativePath.replace(/^\/+/, '')
  return `${HD2D_ASSET_ROOT}/${clean}`
}
