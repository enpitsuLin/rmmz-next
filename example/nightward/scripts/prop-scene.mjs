import { Buffer } from 'node:buffer'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'

export function readGlb(path) {
  const data = readFileSync(path)
  if (data.readUInt32LE(0) !== 0x46546C67 || data.readUInt32LE(4) !== 2)
    throw new Error(`Invalid GLB: ${path}`)
  const length = data.readUInt32LE(12)
  const json = JSON.parse(data.subarray(20, 20 + length).toString())
  Object.defineProperty(json, 'binary', { value: data.subarray(28 + length) })
  return json
}
const numbers = text => text.split(',').map(Number)
function binding(page) {
  const text = page.list.filter(command => [108, 408].includes(command.code)).map(command => command.parameters[0]).join('\n')
  const model = text.match(/<propModel:([^>]+)>/i)?.[1]?.trim()
  if (!model)
    return
  return { model, offset: numbers(text.match(/<propOffset:([^>]+)>/i)?.[1] ?? '0,0,0'), collider: text.match(/<propCollider:([^>]+)>/i)?.[1]?.trim() ?? 'model' }
}
function placementOnly(event) {
  return event.pages.length === 1 && event.pages.every(page => !Object.entries(page.conditions).some(([key, value]) => key.endsWith('Valid') && value)
    && page.moveType === 0 && page.moveRoute.list.every(command => command.code === 0)
    && !page.image.tileId && !page.image.characterName && page.trigger === 0
    && page.list.every(command => [0, 108, 408].includes(command.code)))
}
export function migrateLayout(map, reference, models, placements, aliases) {
  const center = JSON.parse(map.note.match(/<nightward:([^>]+)>/)[1]).center
  const instances = []
  for (const event of map.events.filter(Boolean)) {
    const pages = event.pages.map(binding)
    if (!pages.some(Boolean))
      continue
    const key = event.note.match(/<nightwardPropSeed:([^>]+)>/)?.[1] ?? `event:${event.id}`
    const source = reference.propLayout?.find(entry => entry.key === key)
    const pure = placementOnly(event)
    const variants = new Map()
    for (const [pageIndex, current] of pages.entries()) {
      if (!current)
        continue
      const modelKey = aliases[current.model] ?? current.model
      const members = modelKey === source?.model && reference.propGroups?.[key]
        ? reference.propGroups[key]
        : [{ key, model: modelKey, x: source?.x ?? 0, z: source?.z ?? 0 }]
      const signature = `${modelKey}/${current.collider}`
      const variant = variants.get(signature) ?? (variants.size ? `@page-${pageIndex + 1}` : '')
      variants.set(signature, variant)
      const ids = []
      for (const [index, member] of members.entries()) {
        const model = models[member.model]
        if (!model)
          throw new Error(`Unknown model ${member.model} on event ${event.id}`)
        const config = structuredClone(model)
        delete config.meshes
        if (current.collider !== 'model') {
          const [x, z, width, depth] = numbers(current.collider)
          config.colliders = current.collider === 'none' ? [] : [{ x, z, width, depth }]
        }
        const delta = [member.x - (source?.x ?? member.x), 0, member.z - (source?.z ?? member.z)]
        const id = member.key + variant
        ids.push({ id, delta })
        if (!instances.some(entry => entry.extras.nightward.id === id))
          instances.push({ name: `${member.model} (${id})`, translation: [event.x - center + current.offset[0] + delta[0], current.offset[1], event.y - center + current.offset[2] + delta[2]], extras: { nightward: { ...config, id, model: member.model, seed: event.id + index, tags: [model.kind], ...(pure ? {} : { active: false }), editor: { name: event.name, note: event.note, comments: event.pages[pageIndex].list.filter(command => [108, 408].includes(command.code)).map(command => command.parameters[0]) } } } })
      }
      if (!pure) {
        const page = event.pages[pageIndex]
        page.list = page.list.flatMap((command) => {
          if (![108, 408].includes(command.code))
            return [command]
          const text = String(command.parameters[0]).replace(/<prop(?:Model|Offset|Collider):[^>]+>/gi, '').trim()
          return text ? [{ ...command, parameters: [text] }] : []
        })
        const comments = ids.map(({ id, delta }) => `<prop:${id}>\n<propOffset:${[current.offset[0] + delta[0], current.offset[1], current.offset[2] + delta[2]].join(',')}>`)
        page.list.unshift(...comments.map((text, index) => ({ code: index ? 408 : 108, indent: 0, parameters: [text] })))
      }
    }
    if (pure)
      map.events[event.id] = null
  }
  if (!instances.length) {
    for (const entry of placements) {
      const config = { ...models[entry.model] }
      delete config.meshes
      instances.push({ name: entry.key, translation: [entry.x, 0, entry.z], extras: { nightward: { ...config, id: entry.key, model: entry.model, tags: [config.kind] } } })
    }
  }
  while (map.events.length > 1 && !map.events.at(-1))
    map.events.pop()
  const tag = map.note.match(/<nightward:([^>]+)>/)
  const settings = JSON.parse(tag[1])
  delete settings.propLayout
  map.note = map.note.replace(tag[0], `<nightward:${JSON.stringify(settings)}>`)
  if (!map.note.includes('<propScene:'))
    map.note += '\n<propScene:models/maps/graveyard.glb>'
  return instances
}
const mapGroundMaterials = new Set(['grass', 'dirt'])
const roughness = { cobble: 0.5, flagstone: 0.55, grave: 0.68, masonry: 0.8, bark: 0.95, thicket: 0.95, deadwood: 0.85, iron: 0.6, glass: 0.55 }
const linear = value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
const rgb = color => [16, 8, 0].map(shift => linear((color >> shift & 255) / 255))
export function buildGlb({ root, surfaces, environment = [], models, instances, previous, library = false }) {
  const json = { asset: { version: '2.0', generator: 'Nightward reference asset compiler' }, scene: 0, scenes: [{ name: 'Nightward', nodes: [] }], nodes: [], meshes: [], accessors: [], bufferViews: [], buffers: [], materials: [], textures: [], images: [], samplers: [{ magFilter: 9728, minFilter: 9729, wrapS: 10497, wrapT: 10497 }], extensionsUsed: ['KHR_materials_unlit', 'KHR_materials_emissive_strength'] }
  const chunks = []
  const materials = new Map()
  const meshes = new Map()
  const textures = new Map()
  let size = 0
  const view = (data, target) => {
    const bytes = Buffer.from(data.buffer, data.byteOffset, data.byteLength)
    const id = json.bufferViews.length
    json.bufferViews.push({ buffer: 0, byteOffset: size, byteLength: bytes.length, ...(target ? { target } : {}) })
    chunks.push(bytes)
    size += bytes.length
    if (size % 4) {
      const padding = Buffer.alloc(4 - size % 4)
      chunks.push(padding)
      size += padding.length
    }
    return id
  }
  const texture = (name) => {
    if (textures.has(name))
      return textures.get(name)
    const data = readFileSync(`${root}img/nightward/reference/${name}.png`)
    const image = json.images.push({ name, mimeType: 'image/png', bufferView: view(data) }) - 1
    const id = json.textures.push({ source: image, sampler: 0 }) - 1
    textures.set(name, id)
    return id
  }
  const material = (name) => {
    if (materials.has(name))
      return materials.get(name)
    const surface = surfaces[name] ?? {}
    const result = { name, pbrMetallicRoughness: { baseColorTexture: { index: texture(name === 'sky' ? 'sky' : `${name}-albedo`) }, metallicFactor: name === 'iron' ? 0.3 : 0, roughnessFactor: roughness[name] ?? 1 }, alphaMode: name === 'sky' ? 'BLEND' : ['dirt', 'cobble', 'flagstone', 'grave', 'masonry', 'thicket', 'deadwood'].includes(name) ? 'MASK' : 'OPAQUE', doubleSided: name === 'thicket', extras: { nightward: { vertexColors: name !== 'sky', flatShading: name === 'bark' || name === 'deadwood', fog: name !== 'sky' } } }
    if (result.alphaMode === 'MASK')
      result.alphaCutoff = 0.5
    if (name === 'sky') {
      result.extensions = { KHR_materials_unlit: {} }
      result.pbrMetallicRoughness.baseColorFactor = [...rgb(10133680), 1]
    }
    if (surface.normal)
      result.normalTexture = { index: texture(`${name}-normal`) }
    if (surface.emissive || name === 'grave' || name === 'masonry') {
      result.emissiveTexture = { index: texture(surface.emissive ? `${name}-emissive` : `${name}-albedo`) }
      result.emissiveFactor = surface.emissive ? [1, 1, 1] : rgb(name === 'grave' ? 6322368 : 5269680)
      result.extensions = { KHR_materials_emissive_strength: { emissiveStrength: surface.emissive ? 2.4 : name === 'grave' ? 0.14 : 0.1 } }
    }
    const id = json.materials.push(result) - 1
    materials.set(name, id)
    return id
  }
  const accessor = (values, components, semantic) => {
    let maximum = 0
    if (semantic === 'indices') {
      for (const value of values)
        maximum = Math.max(maximum, value)
    }
    const data = semantic === 'indices' ? (maximum > 65535 ? new Uint32Array(values) : new Uint16Array(values)) : semantic === 'colors' ? new Uint8Array(values) : new Float32Array(values)
    const result = { bufferView: view(data, semantic === 'indices' ? 34963 : 34962), componentType: data instanceof Float32Array ? 5126 : data instanceof Uint8Array ? 5121 : data instanceof Uint16Array ? 5123 : 5125, count: data.length / components, type: ['SCALAR', 'VEC2', 'VEC3', 'VEC4'][components - 1] }
    if (semantic === 'colors')
      result.normalized = true
    if (semantic === 'positions') {
      result.min = Array.from({ length: 3 }).fill(Infinity)
      result.max = Array.from({ length: 3 }).fill(-Infinity)
      for (let index = 0; index < data.length; index++) {
        const axis = index % 3
        result.min[axis] = Math.min(result.min[axis], data[index])
        result.max[axis] = Math.max(result.max[axis], data[index])
      }
    }
    return json.accessors.push(result) - 1
  }
  const addMesh = (key, mesh) => {
    if (mapGroundMaterials.has(mesh.material))
      return
    if (meshes.has(key))
      return meshes.get(key)
    const attributes = Object.fromEntries([['POSITION', 'positions', 3], ['NORMAL', 'normals', 3], ['TEXCOORD_0', 'uvs', 2], ['COLOR_0', 'colors', 4]].map(([semantic, field, count]) => [semantic, accessor(mesh[field], count, field)]))
    const id = json.meshes.push({ name: key, extras: { nightward: { key } }, primitives: [{ attributes, indices: accessor(mesh.indices, 1, 'indices'), material: material(mesh.material) }] }) - 1
    meshes.set(key, id)
    return id
  }
  for (const [key, model] of Object.entries(models)) {
    for (const [index, mesh] of model.meshes.entries())
      addMesh(`${key}/${index}`, mesh)
  }
  for (const [index, mesh] of environment.entries()) {
    if (!mapGroundMaterials.has(mesh.material))
      addMesh(`environment/${index}`, mesh)
  }
  const addNode = node => json.nodes.push(node) - 1
  const children = (key) => {
    const model = models[key]
    const nodes = []
    for (const [index, mesh] of model.meshes.entries()) {
      if (mapGroundMaterials.has(mesh.material))
        continue
      if (mesh.kind === 'door') {
        for (const side of [-1, 1])
          nodes.push(addNode({ name: `door-${side < 0 ? 'left' : 'right'}`, translation: [side * model.door.hingeX, model.door.y, model.door.z - 0.12], rotation: [0, side > 0 ? 1 : 0, 0, side > 0 ? 0 : 1], mesh: meshes.get(`${key}/${index}`), extras: { nightward: { doorSide: side } } }))
      }
      else {
        nodes.push(addNode({ name: `${key}-mesh-${index}`, mesh: meshes.get(`${key}/${index}`) }))
      }
    }
    for (const [index, light] of model.lights.entries()) {
      const { x, y, z, ...config } = light
      nodes.push(addNode({ name: `${light.kind}-${index}`, translation: [x, y, z], extras: { nightward: { light: config } } }))
    }
    return nodes
  }
  if (previous) {
    const oldViews = new Map()
    const oldAccessors = new Map()
    const oldImages = new Map()
    const oldTextures = new Map()
    const oldMaterials = new Map()
    const oldMeshes = new Map()
    const copyView = (index) => {
      if (oldViews.has(index))
        return oldViews.get(index)
      const raw = previous.bufferViews[index]
      const start = raw.byteOffset ?? 0
      const id = view(previous.binary.subarray(start, start + raw.byteLength), raw.target)
      if (raw.byteStride)
        json.bufferViews[id].byteStride = raw.byteStride
      oldViews.set(index, id)
      return id
    }
    const copyAccessor = (index) => {
      if (oldAccessors.has(index))
        return oldAccessors.get(index)
      const raw = structuredClone(previous.accessors[index])
      if (raw.bufferView !== undefined)
        raw.bufferView = copyView(raw.bufferView)
      if (raw.sparse) {
        for (const data of [raw.sparse.indices, raw.sparse.values])
          data.bufferView = copyView(data.bufferView)
      }
      const id = json.accessors.push(raw) - 1
      oldAccessors.set(index, id)
      return id
    }
    const copyImage = (index) => {
      if (oldImages.has(index))
        return oldImages.get(index)
      const raw = structuredClone(previous.images[index])
      if (raw.bufferView !== undefined)
        raw.bufferView = copyView(raw.bufferView)
      const id = json.images.push(raw) - 1
      oldImages.set(index, id)
      return id
    }
    const copyTexture = (index) => {
      if (oldTextures.has(index))
        return oldTextures.get(index)
      const raw = structuredClone(previous.textures[index])
      if (raw.source !== undefined)
        raw.source = copyImage(raw.source)
      for (const extension of Object.values(raw.extensions ?? {})) {
        if (extension.source !== undefined)
          extension.source = copyImage(extension.source)
      }
      if (raw.sampler !== undefined)
        raw.sampler = json.samplers.push(structuredClone(previous.samplers[raw.sampler])) - 1
      const id = json.textures.push(raw) - 1
      oldTextures.set(index, id)
      return id
    }
    const copyMaterial = (index) => {
      if (oldMaterials.has(index))
        return oldMaterials.get(index)
      const raw = structuredClone(previous.materials[index])
      if (materials.has(raw.name))
        return materials.get(raw.name)
      const visit = (object, name = '') => {
        if (!object || typeof object !== 'object')
          return
        if (name.endsWith('Texture') && object.index !== undefined)
          object.index = copyTexture(object.index)
        for (const [key, child] of Object.entries(object))
          visit(child, key)
      }
      visit(raw)
      const id = json.materials.push(raw) - 1
      oldMaterials.set(index, id)
      return id
    }
    const copyMesh = (index) => {
      if (oldMeshes.has(index))
        return oldMeshes.get(index)
      const raw = structuredClone(previous.meshes[index])
      for (const primitive of raw.primitives) {
        primitive.attributes = Object.fromEntries(Object.entries(primitive.attributes).map(([key, accessor]) => [key, copyAccessor(accessor)]))
        if (primitive.indices !== undefined)
          primitive.indices = copyAccessor(primitive.indices)
        if (primitive.material !== undefined)
          primitive.material = copyMaterial(primitive.material)
        if (primitive.targets)
          primitive.targets = primitive.targets.map(target => Object.fromEntries(Object.entries(target).map(([key, accessor]) => [key, copyAccessor(accessor)])))
      }
      const id = json.meshes.push(raw) - 1
      oldMeshes.set(index, id)
      return id
    }
    const nodeIndices = new Map()
    for (const [index, node] of previous.nodes.entries()) {
      if (node.mesh !== undefined && previous.meshes[node.mesh].primitives.every(primitive => mapGroundMaterials.has(previous.materials[primitive.material]?.name)))
        continue
      nodeIndices.set(index, json.nodes.length)
      json.nodes.push(structuredClone(node))
    }
    const retainedNodes = indices => indices.filter(index => nodeIndices.has(index)).map(index => nodeIndices.get(index))
    json.scenes = structuredClone(previous.scenes)
    for (const scene of json.scenes)
      scene.nodes = retainedNodes(scene.nodes ?? [])
    json.scene = previous.scene ?? 0
    for (const node of json.nodes) {
      if (node.children)
        node.children = retainedNodes(node.children)
      if (node.mesh !== undefined) {
        const old = previous.meshes[node.mesh]
        const key = old.extras?.nightward?.key ?? old.name
        node.mesh = meshes.has(key) ? meshes.get(key) : copyMesh(node.mesh)
      }
    }
  }
  else {
    for (const [index, mesh] of environment.entries()) {
      if (!mapGroundMaterials.has(mesh.material))
        json.scenes[0].nodes.push(addNode({ name: `environment-${mesh.material}`, mesh: meshes.get(`environment/${index}`) }))
    }
    for (const instance of instances)
      json.scenes[0].nodes.push(addNode({ ...instance, children: children(instance.extras.nightward.model) }))
  }
  if (library)
    json.scenes = json.scenes[0].nodes.map(index => ({ name: json.nodes[index].name, nodes: [index] }))
  json.extensionsUsed = [...new Set(json.materials.flatMap(material => Object.keys(material.extensions ?? {})))]
  json.buffers = [{ byteLength: size }]
  const binary = Buffer.concat(chunks)
  const encoded = Buffer.from(JSON.stringify(json))
  const text = Buffer.concat([encoded, Buffer.alloc((4 - encoded.length % 4) % 4, 32)])
  const header = Buffer.alloc(20)
  const binHeader = Buffer.alloc(8)
  header.writeUInt32LE(0x46546C67)
  header.writeUInt32LE(2, 4)
  header.writeUInt32LE(28 + text.length + binary.length, 8)
  header.writeUInt32LE(text.length, 12)
  header.writeUInt32LE(0x4E4F534A, 16)
  binHeader.writeUInt32LE(binary.length)
  binHeader.writeUInt32LE(0x004E4942, 4)
  return Buffer.concat([header, text, binHeader, binary])
}
export function writePropAssets({ root, surfaces, environment, models, layout, aliases, previousReference, resetLayout = false }) {
  const mapPath = `${root}data/Map001.json`
  const scenePath = `${root}models/maps/graveyard.glb`
  const map = existsSync(mapPath) ? JSON.parse(readFileSync(mapPath, 'utf8')) : undefined
  const previous = existsSync(scenePath) && !resetLayout ? readGlb(scenePath) : undefined
  let instances
  if (!previous) {
    instances = map && !resetLayout
      ? migrateLayout(map, previousReference, models, layout, aliases)
      : layout.map((entry) => {
          const config = { ...models[entry.model] }
          delete config.meshes
          return { name: entry.key, translation: [entry.x, 0, entry.z], extras: { nightward: { ...config, id: entry.key, model: entry.model, tags: [config.kind] } } }
        })
  }
  mkdirSync(`${root}models/maps`, { recursive: true })
  mkdirSync(`${root}models/props`, { recursive: true })
  const scene = buildGlb({ root, surfaces, environment, models, instances, previous })
  writeFileSync(scenePath, scene)
  for (const kind of new Set(Object.values(models).map(model => model.kind))) {
    if (kind === 'collision')
      continue
    const selected = Object.fromEntries(Object.entries(models).filter(([, model]) => model.kind === kind))
    const entries = Object.entries(selected).map(([key, model]) => {
      const config = { ...model }
      delete config.meshes
      return { name: key, extras: { nightward: { ...config, id: key, model: key, tags: [kind] } } }
    })
    const file = kind === 'tomb' ? 'tombs' : kind === 'tree' ? 'trees' : kind === 'fence' ? 'fences' : kind
    writeFileSync(`${root}models/props/${file}.glb`, buildGlb({ root, surfaces, models: selected, instances: entries, library: true }))
  }
  if (map && !previous)
    writeFileSync(mapPath, `${JSON.stringify(map)}\n`)
  rmSync(`${root}img/nightward/reference/world.bin`, { force: true })
  console.log(`Wrote GLB scene (${scene.length} bytes); ${previous ? 'preserved existing scene hierarchy and layout' : `migrated ${instances.length} independent Props`}.`)
}
