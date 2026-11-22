const surfaces = [
  { name: 'grass', span: 8, row: 0 },
  { name: 'dirt', span: 4, row: 8 },
]
const columns = 8
const wrap = (value, size) => ((value % size) + size) % size
const neighbors = [[0, -1, 1], [1, 0, 2], [0, 1, 4], [-1, 0, 8], [1, -1, 16], [1, 1, 32], [-1, 1, 64], [-1, -1, 128]]

export function connectedCorners(mask) {
  for (const [sides, corner] of [[3, 16], [6, 32], [12, 64], [9, 128]]) {
    if ((mask & sides) !== sides)
      mask &= ~corner
  }
  return mask
}

export const edgeMasks = [...new Set(Array.from({ length: 256 }, (_, mask) => connectedCorners(mask)))].filter(mask => mask !== 255)

export function isDirtTile(tile) {
  return (tile > 0 && tile <= edgeMasks.length * 16) || (tile >= 1600 && tile < 1632 && tile % 8 < 4)
}

export function groundTileId(name, x, y) {
  const surface = surfaces.find(surface => surface.name === name)
  return 1536 + (surface.row + wrap(y, surface.span)) * columns + wrap(x, surface.span)
}

export function dirtEdgeAlpha(mask, x, y) {
  let distance = 1
  for (const [bit, value] of [[1, y], [2, 1 - x], [4, 1 - y], [8, x], [16, Math.hypot(1 - x, y)], [32, Math.hypot(1 - x, 1 - y)], [64, Math.hypot(x, 1 - y)], [128, Math.hypot(x, y)]]) {
    if (!(mask & bit))
      distance = Math.min(distance, value)
  }
  const t = Math.min(1, distance * 2)
  return t * t * (3 - 2 * t)
}

export function refreshDirtEdges(map, center) {
  const { width, height, data } = map
  const layer = width * height
  const occupied = data.slice(layer, layer * 2).map(isDirtTile)
  const hasDirt = (x, y) => x >= 0 && y >= 0 && x < width && y < height && occupied[y * width + x]
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!hasDirt(x, y))
        continue
      let mask = 0
      for (const [dx, dy, bit] of neighbors) {
        if (hasDirt(x + dx, y + dy))
          mask |= bit
      }
      mask = connectedCorners(mask)
      const phase = wrap(y - center, 4) * 4 + wrap(x - center, 4)
      data[layer + y * width + x] = mask === 255 ? groundTileId('dirt', x - center, y - center) : edgeMasks.indexOf(mask) * 16 + phase + 1
    }
  }
}
