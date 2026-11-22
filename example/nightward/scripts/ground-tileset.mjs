import { dirtEdgeAlpha, edgeMasks, groundTileId, isDirtTile, refreshDirtEdges } from '../js/nightward/primitives/groundTiles.js'

const tileSize = 48
const columns = 8
const surfaces = [
  { name: 'grass', span: 8, row: 0 },
  { name: 'dirt', span: 4, row: 8 },
]
const wrap = (value, size) => ((value % size) + size) % size

export { dirtEdgeAlpha, groundTileId, isDirtTile, refreshDirtEdges }

export function createGroundTileset(world) {
  const width = columns * tileSize
  const height = 16 * tileSize
  const result = Object.fromEntries(['albedo', 'normal'].map(name => [name, { width, height, pixels: new Uint8ClampedArray(width * height * 4) }]))
  for (const { name, span, row } of surfaces) {
    for (const channel of ['albedo', 'normal']) {
      const source = world[name][channel].source.resource
      const albedo = world[name].albedo.source.resource
      for (let y = 0; y < span * tileSize; y++) {
        for (let x = 0; x < span * tileSize; x++) {
          // MZ tile coordinates mark cell centres; the original UVs use world X/Z.
          const sx = wrap(Math.floor(((x + 0.5) / tileSize - 0.5) * source.width / span), source.width)
          const sy = wrap(Math.floor(((y + 0.5) / tileSize - 0.5) * source.height / span), source.height)
          const from = (sy * source.width + sx) * 4
          const to = ((row * tileSize + y) * width + x) * 4
          result[channel].pixels.set(source.pixels.subarray(from, from + 4), to)
          if (channel === 'normal')
            result.normal.pixels[to + 3] = albedo.pixels[from + 3]
        }
      }
    }
  }
  return result
}

export function createDirtEdgeTilesets(ground) {
  const width = 16 * tileSize
  const sheets = Array.from({ length: 3 }, () => Object.fromEntries(['albedo', 'normal'].map(name => [name, { width, height: width, pixels: new Uint8ClampedArray(width * width * 4) }])))
  for (const [variant, mask] of edgeMasks.entries()) {
    for (let phase = 0; phase < 16; phase++) {
      // B's first tile is reserved as empty by the native editor.
      const id = variant * 16 + phase + 1
      const sheet = sheets[Math.floor(id / 256)]
      const tx = (Math.floor(id / 128) % 2) * 8 + id % 8
      const ty = Math.floor(id % 128 / 8)
      for (let y = 0; y < tileSize; y++) {
        for (let x = 0; x < tileSize; x++) {
          const alpha = dirtEdgeAlpha(mask, (x + 0.5) / tileSize, (y + 0.5) / tileSize)
          const from = ((8 * tileSize + Math.floor(phase / 4) * tileSize + y) * ground.albedo.width + phase % 4 * tileSize + x) * 4
          const to = ((ty * tileSize + y) * width + tx * tileSize + x) * 4
          for (const channel of ['albedo', 'normal']) {
            const source = ground[channel].pixels
            sheet[channel].pixels.set(source.subarray(from, from + 4), to)
            sheet[channel].pixels[to + 3] = Math.round(source[from + 3] * alpha)
          }
        }
      }
    }
  }
  return sheets
}
