// Capture the original builders in place, preserving their RNG, shading and UVs.
export function capturePropWorld(context, builders, makeWorld) {
  const models = {}, layout = [], counters = {}, trees = new Map()
  const arrays = ['positions', 'normals', 'uvs', 'colors', 'indices']
  let details, capturing = false, interiorTrees = false
  function capture(kind, x, z, generate, materials = Object.keys(builders)) {
    const marks = Object.fromEntries(materials.map(name => [name, arrays.map(key => builders[name][`_${key}`].length)]))
    const starts = Object.fromEntries(['colliders', 'candles', 'candleSites', 'windows'].map(key => [key, details[key].length]))
    capturing = true
    try { generate() }
    finally { capturing = false }
    const index = counters[kind] = (counters[kind] ?? 0) + 1
    const key = kind === 'brazier' || kind === 'crypt' || kind === 'ruin' || kind === 'monument' ? kind : `${kind}-${String(index).padStart(4, '0')}`
    const model = { kind, meshes: [], colliders: [], lights: [] }
    for (const name of materials) {
      const builder = builders[name], mark = marks[name]
      if (builder._positions.length > mark[0]) {
        const values = Object.fromEntries(arrays.map((field, at) => [field, builder[`_${field}`].splice(mark[at])]))
        for (let at = 0; at < values.positions.length; at += 3) { values.positions[at] -= x; values.positions[at + 2] -= z }
        values.indices = values.indices.map(value => value - mark[0] / 3)
        model.meshes.push({ material: name, ...values })
      }
    }
    for (const box of details.colliders.splice(starts.colliders)) model.colliders.push({ x: (box.minX + box.maxX) / 2 - x, z: (box.minZ + box.maxZ) / 2 - z, width: box.maxX - box.minX, depth: box.maxZ - box.minZ })
    for (const [cx, cy, cz] of details.candles.splice(starts.candles)) model.lights.push({ kind: 'candle-flame', x: cx - x, y: cy, z: cz - z, color: 16756816, intensity: 0, range: 0 })
    for (const light of details.candleSites.splice(starts.candleSites)) model.lights.push({ ...light, kind: 'candle', x: light.x - x, z: light.z - z })
    for (const light of details.windows.splice(starts.windows)) model.lights.push({ ...light, kind: 'window', x: light.x - x, z: light.z - z })
    if (kind === 'brazier') {
      model.hp = 10; model.radius = .45
      model.lights.push({ kind: 'fire', x: 0, y: details.fireY - .08, lampY: 1.9, z: 0, color: 16749632, intensity: 36, range: 6.5 })
    }
    if (kind === 'crypt') {
      model.door = { ...details.door, z: details.door.z - z }
      model.lights.push({ ...details.cryptGlow, kind: 'crypt', x: details.cryptGlow.x - x, z: details.cryptGlow.z - z })
    }
    models[key] ??= model
    layout.push({ key: `${kind}:${index}`, model: key, x, z })
    if (kind === 'tree') trees.set(`${x},${z}`, model)
    return model
  }
  const originals = {}
  function wrap(name, hook) { originals[name] = context[name]; context[name] = hook(originals[name]) }
  wrap('v9', original => (...args) => {
    details = args[2]
    return capture('monument', 0, 0, () => original(...args), Object.keys(builders).filter(name => !['grass', 'dirt', 'flagstone', 'masonry'].includes(name)))
  })
  wrap('A9', original => (...args) => capture('brazier', args[1], args[2], () => original(...args)))
  wrap('S9', original => (...args) => capture('crypt', context.reference.crypt.x, context.reference.crypt.z, () => original(...args)))
  wrap('E9', original => (...args) => capture('ruin', -25, -27, () => original(...args)))
  wrap('R9', original => (...args) => capture('tomb', args[3], args[4], () => original(...args)))
  wrap('wa', original => (...args) => capture('fence', (args[1] + args[3]) / 2, (args[2] + args[4]) / 2, () => original(...args)))
  wrap('O9', original => (...args) => {
    interiorTrees = true
    try { return original(...args) }
    finally { interiorTrees = false }
  })
  wrap('jc', original => (...args) => {
    if (!interiorTrees || capturing) return original(...args)
    return capture('tree', args[2], args[3], () => original(...args))
  })
  let environment
  try { environment = makeWorld(builders) }
  finally { for (const [name, original] of Object.entries(originals)) context[name] = original }
  environment.colliders = environment.colliders.filter(box => {
    const x = (box.minX + box.maxX) / 2, z = (box.minZ + box.maxZ) / 2
    const tree = trees.get(`${x},${z}`) ?? [...trees].find(([key]) => { const [tx, tz] = key.split(',').map(Number); return Math.abs(tx - x) < 1e-6 && Math.abs(tz - z) < 1e-6 })?.[1]
    if (!tree) return true
    tree.colliders.push({ x: 0, z: 0, width: box.maxX - box.minX, depth: box.maxZ - box.minZ })
    return false
  })
  models.collider = { kind: 'collision', meshes: [], colliders: [], lights: [] }
  const aliases = {}
  for (const kind of ['tomb', 'tree', 'fence']) aliases[kind] = Object.keys(models).find(key => models[key].kind === kind)
  return { details: environment, models, layout, aliases }
}
