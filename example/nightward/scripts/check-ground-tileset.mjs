import assert from 'node:assert/strict'
import { createDirtEdgeTilesets, createGroundTileset, dirtEdgeAlpha, groundTileId, isDirtTile, refreshDirtEdges } from './ground-tileset.mjs'

function surface(span) {
  const width = span * 8
  const pixels = new Uint8ClampedArray(width * width * 4)
  for (let y = 0; y < width; y++) {
    for (let x = 0; x < width; x++)
      pixels.set([x, y, 128, 255], (y * width + x) * 4)
  }
  const texture = { source: { resource: { width, height: width, pixels } } }
  return { albedo: texture, normal: texture }
}

const atlas = createGroundTileset({ grass: surface(8), dirt: surface(4) })
assert.deepEqual([atlas.albedo.width, atlas.albedo.height], [384, 768])
const ids = new Set()
for (let y = 0; y < 8; y++) {
  for (let x = 0; x < 8; x++) {
    ids.add(groundTileId('grass', x, y))
    const offset = ((y * 48 + 24) * 384 + x * 48 + 24) * 4
    assert.deepEqual(Array.from(atlas.albedo.pixels.subarray(offset, offset + 4)), [x * 8, y * 8, 128, 255], 'each MZ cell samples its own part of the original eight-unit texture')
    assert.deepEqual(atlas.normal.pixels.subarray(offset, offset + 4), atlas.albedo.pixels.subarray(offset, offset + 4))
  }
}
assert.equal(ids.size, 64)
assert.equal(groundTileId('grass', -1, -1), groundTileId('grass', 7, 7))
assert.equal(groundTileId('dirt', -1, -1), groundTileId('dirt', 3, 3))
assert.equal(groundTileId('dirt', 0, 0), 1600)
assert.equal(atlas.albedo.pixels[(12 * 48 * 384) * 4 + 3], 0)
const edgeSheets = createDirtEdgeTilesets(atlas)
assert.equal(edgeSheets.length, 3)
assert.equal(edgeSheets[0].albedo.pixels[3], 0, 'native B tile zero stays empty')
assert.equal(dirtEdgeAlpha(0, 0, 0.5), 0)
assert.equal(dirtEdgeAlpha(0, 0.5, 0.5), 1)
assert(dirtEdgeAlpha(0, 0.25, 0.5) > 0 && dirtEdgeAlpha(0, 0.25, 0.5) < 1)
assert.equal(dirtEdgeAlpha(255 ^ 16, 1, 0), 0, 'an absent diagonal fades the concave corner')
for (const x of [0.25, 0.5, 0.75])
  assert.equal(dirtEdgeAlpha(255 ^ 16, x, 0), dirtEdgeAlpha(255 ^ 2 ^ 16 ^ 32, x, 1), 'shared boundaries have matching opacity')
const map = { width: 5, height: 5, data: Array.from({ length: 5 * 5 * 6 }).fill(0) }
for (let y = 1; y < 4; y++) {
  for (let x = 1; x < 4; x++)
    map.data[25 + y * 5 + x] = groundTileId('dirt', x - 2, y - 2)
}
refreshDirtEdges(map, 2)
assert.equal(map.data[25 + 2 * 5 + 2], groundTileId('dirt', 0, 0), 'interior dirt keeps the original four-unit pattern')
const edge = map.data[25 + 1 * 5 + 1]
assert(edge > 0 && edge < 768 && isDirtTile(edge))
const sheet = edgeSheets[Math.floor(edge / 256)]
const tx = ((Math.floor(edge / 128) % 2) * 8 + edge % 8) * 48
const ty = Math.floor(edge % 128 / 8) * 48
const pixel = (channel, x, y) => sheet[channel].pixels.subarray(((ty + y) * 768 + tx + x) * 4, ((ty + y) * 768 + tx + x) * 4 + 4)
assert.equal(pixel('albedo', 0, 24)[3], 0)
assert(pixel('albedo', 12, 24)[3] > 0 && pixel('albedo', 12, 24)[3] < 255)
assert.equal(pixel('albedo', 24, 24)[3], 255)
assert.equal(pixel('albedo', 12, 24)[3], pixel('normal', 12, 24)[3], 'color and normal edges blend with the same opacity')
const painted = map.data.slice()
refreshDirtEdges(map, 2)
assert.deepEqual(map.data, painted, 'restarting a run does not change the mud footprint or edge IDs')
console.log('Ground checks passed: original texture scales, native alpha tiles, soft and concave edges, normal blending and repeatable map preparation.')
