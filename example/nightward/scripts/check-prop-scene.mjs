import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { registerHooks } from 'node:module'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { buildGlb, migrateLayout, readGlb } from './prop-scene.mjs'
// Exercise the actual TS runtime without introducing another test/build dependency.
registerHooks({
  resolve(specifier, context, next) {
    if (specifier.startsWith('.') && context.parentURL && !/\.[cm]?[jt]s$/.test(specifier)) {
      const url = new URL(`${specifier}.ts`, context.parentURL)
      if (existsSync(url))
        return next(url.href, context)
    }
    return next(specifier, context)
  },
  load(url, context, next) {
    if (url.endsWith('.ts') && url.includes('/js/nightward/'))
      return { format: 'module', shortCircuit: true, source: ts.transpileModule(readFileSync(new URL(url), 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2021, module: ts.ModuleKind.ESNext } }).outputText }
    return next(url, context)
  },
})
const { Assets: PixiAssets, BufferImageSource, Texture } = await import('pixi.js')
const { Matrix4, getBuffer, glbToGltf } = await import('@pixi/3d')
const { NightwardPropSceneManager } = await import('../js/nightward/managers/NightwardPropSceneManager.ts')
const { Game_NightwardProps } = await import('../js/nightward/objects/Game_NightwardProps.ts')
const { transformPoint } = await import('../js/nightward/primitives/geometry.ts')
const root = fileURLToPath(new URL('../', import.meta.url))
let requests = 0
const originalLoad = PixiAssets.loader.load
PixiAssets.loader.load = async () => new Texture({ source: new BufferImageSource({ resource: new Uint8Array([255, 255, 255, 255]), width: 1, height: 1 }) })
globalThis.XMLHttpRequest = class {
  open(method, url) {
    this.url = url
  }

  send() {
    requests++
    const bytes = readFileSync(new URL(`../${this.url}`, import.meta.url))
    this.response = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
    this.status = 0
    this.onload()
  }
}
const scene = await NightwardPropSceneManager.load('models/maps/graveyard.glb')
assert.equal(requests, 1, 'geometry and metadata share a single XHR')
assert(scene.props.length > 999, 'the layout is independent of the map event capacity')
assert.equal(new Set(scene.props.map(prop => prop.id)).size, scene.props.length)
assert(scene.environment.length > 0)
assert(!scene.environment.some(mesh => mesh.material === 'grass'))
assert(!scene.materials.has('grass'))
assert(!scene.environment.some(mesh => mesh.material === 'dirt'), 'road and scattered mud stay in the native map')
assert.equal(scene.props.filter(prop => prop.model.meshes.some(mesh => mesh.material === 'dirt')).length, 684, 'tomb mud stays attached to the original 3D models')
const manager = new Game_NightwardProps(scene, [], 90)
const prop = manager.props.find(prop => prop.kind === 'brazier')
assert(prop && prop.model.meshes.length && prop.model.lights.length && prop.model.colliders.length)
const originalX = prop.x
const geometry = prop.model.meshes[0].geometry
const radius = prop.radius
manager.move(prop, 11, 2, -7)
assert.deepEqual([prop.x, prop.y, prop.z], [11, 2, -7])
const box = prop.model.colliders[0]
const source = manager.obstacles().find(entry => entry.prop === prop)
assert(Math.abs(source.x - (11 + box.x)) < 1e-5)
const rotated = new Matrix4().makeRotationY(Math.PI / 2).scale({ x: 2, y: 1, z: 3 }).setPosition({ x: 11, y: 2, z: -7 })
manager.transform(prop, rotated)
const movedBox = manager.obstacles().find(entry => entry.prop === prop)
assert(Math.abs(movedBox.width - box.depth * 3) < 1e-4)
assert(Math.abs(movedBox.depth - box.width * 2) < 1e-4)
assert(Math.abs(prop.radius - radius * 3) < 1e-4)
assert.deepEqual(transformPoint(rotated, 0, 0, 0), { x: 11, y: 2, z: -7 })
manager.show(prop, false)
assert(!manager.obstacles().some(entry => entry.prop === prop))
manager.show(prop, true)
assert(manager.break(prop, 12))
assert(!manager.break(prop, 13))
assert.equal(prop.brokenAt, 12)
assert(!manager.obstacles().some(entry => entry.prop === prop))
manager.open(prop, 1, 0, 0)
assert.equal(manager.doorAmount(prop, 0), 1)
assert(manager.select('#brazier').includes(prop))
const reset = new Game_NightwardProps(scene, [], 90)
const restored = reset.get(prop.id)
assert.equal(restored.x, originalX)
assert.equal(restored.broken, false)
assert.equal(restored.hp, prop.model.hp)
manager.remove(prop)
assert.equal(manager.get(prop.id), undefined)
assert.equal(manager.structureRevision, 1)
manager.dispose()
assert(geometry.getAttribute('aPosition').buffer.data.byteLength > 0, 'individual sessions do not release shared geometry')
const comments = [{ code: 108, parameters: ['<prop:brazier:1>\n<propOffset:0.4,1,-0.2>'] }]
const page = { list: comments }
const event = { _erased: false, _pageIndex: -1, _realX: 95, _realY: 92, event: () => ({ pages: [page] }), page: () => page, eventId: () => 1 }
const driven = new Game_NightwardProps(scene, [event], 90)
const bound = driven.get('brazier:1')
assert.equal(bound.active, false)
event._pageIndex = 0
driven.updateEvents()
assert.equal(bound.active, true)
assert(Math.abs(bound.x - 5.4) < 1e-5)
event._realX = 95.5
driven.updateEvents()
assert(Math.abs(bound.x - 5.9) < 1e-5)
event._erased = true
driven.updateEvents()
assert.equal(bound.active, false)
const fakeModel = { kind: 'tomb', colliders: [{ x: 0, z: 0, width: 1, depth: 2 }], lights: [], meshes: [] }
const makePage = (extra = []) => ({ conditions: { switch1Valid: false }, image: { tileId: 0, characterName: '' }, trigger: 0, moveType: 0, moveRoute: { list: [{ code: 0 }] }, list: [{ code: 108, parameters: ['<propModel:cluster>\n<propOffset:0.4,1,-0.2>\n<propCollider:model>'] }, ...extra, { code: 0 }] })
const map = { note: '<nightward:{"center":90,"bounds":90,"propLayout":"events"}>', events: [null, { id: 1, x: 100, y: 105, note: '<nightwardPropSeed:group>', name: 'Moved cluster', pages: [makePage()] }, { id: 2, x: 80, y: 85, note: '<nightwardPropSeed:logic>', name: 'Logic', pages: [makePage([{ code: 121, parameters: [1, 1, 0] }])] }] }
const reference = { propLayout: [{ key: 'group', model: 'cluster', x: 2, z: 3 }], propGroups: { group: [{ key: 'tomb:1', model: 'a', x: 2, z: 3 }, { key: 'tomb:2', model: 'a', x: 4, z: 7 }] } }
const migrated = migrateLayout(map, reference, { a: fakeModel, cluster: fakeModel }, [], {})
assert.equal(map.events[1], null)
assert.deepEqual(migrated[1].translation, [12.4, 1, 18.8])
assert(map.events[2].pages[0].list.some(command => command.code === 121))
assert(map.events[2].pages[0].list.some(command => String(command.parameters[0]).includes('<prop:logic>')))
assert(map.note.includes('<propScene:models/maps/graveyard.glb>'))
const triangle = { material: 'grave', positions: [0, 0, 0, 1, 0, 0, 0, 1, 0], normals: [0, 0, 1, 0, 0, 1, 0, 0, 1], uvs: [0, 0, 1, 0, 0, 1], colors: Array.from({ length: 12 }).fill(255), indices: [0, 1, 2] }
const models = { a: { ...fakeModel, meshes: [triangle] } }
const instance = { name: 'Manual', translation: [7, 2, 3], extras: { nightward: { id: 'manual:1', model: 'a', kind: 'tomb', tags: ['custom'], hp: 42 } } }
const tombMud = buildGlb({ root, surfaces: { dirt: { normal: true } }, models: { a: { ...fakeModel, meshes: [{ ...triangle, material: 'dirt' }] } }, instances: [instance] })
const mudSource = glbToGltf(tombMud.buffer.slice(tombMud.byteOffset, tombMud.byteOffset + tombMud.byteLength))
assert(mudSource.json.nodes.some(node => node.mesh !== undefined), 'resource generation keeps mud geometry attached to Props')
assert.equal(mudSource.json.materials[0].name, 'dirt')
assert(mudSource.json.materials[0].normalTexture)
assert.deepEqual(Array.from(getBuffer(mudSource.json, mudSource.buffers, mudSource.json.meshes[0].primitives[0].attributes.POSITION)), triangle.positions)
const encoded = buildGlb({ root, surfaces: {}, models, instances: [instance] })
const json = glbToGltf(encoded.buffer.slice(encoded.byteOffset, encoded.byteOffset + encoded.byteLength)).json
const saved = structuredClone(json)
saved.nodes.find(node => node.extras?.nightward?.id).translation = [11, 9, 8]
saved.nodes.find(node => node.extras?.nightward?.id).extras.nightward.hp = 99
const rebuilt = buildGlb({ root, surfaces: {}, models, previous: saved })
const refreshed = glbToGltf(rebuilt.buffer.slice(rebuilt.byteOffset, rebuilt.byteOffset + rebuilt.byteLength)).json
assert.deepEqual(refreshed.nodes, saved.nodes, 'refresh keeps transforms, hierarchy, IDs and manual metadata')
for (const material of ['grass', 'dirt']) {
  const withGround = structuredClone(saved)
  withGround.materials.push({ name: material })
  withGround.meshes.push({ name: 'environment/0', primitives: [{ material: withGround.materials.length - 1 }] })
  withGround.nodes.unshift({ name: `environment-${material}`, mesh: withGround.meshes.length - 1 })
  for (const node of withGround.nodes) {
    if (node.children)
      node.children = node.children.map(index => index + 1)
  }
  for (const scene of withGround.scenes)
    scene.nodes = [0, ...scene.nodes.map(index => index + 1)]
  const groundRemoved = buildGlb({ root, surfaces: {}, models, environment: [{ ...triangle, material }], previous: withGround })
  const cleaned = glbToGltf(groundRemoved.buffer.slice(groundRemoved.byteOffset, groundRemoved.byteOffset + groundRemoved.byteLength)).json
  assert.deepEqual(cleaned.nodes, saved.nodes, 'removing ground preserves the remaining node hierarchy')
  assert.deepEqual(cleaned.scenes, saved.scenes)
  assert(!cleaned.materials.some(entry => entry.name === material))
}
const custom = glbToGltf(encoded.buffer.slice(encoded.byteOffset, encoded.byteOffset + encoded.byteLength))
custom.json.binary = new Uint8Array(custom.buffers[0])
custom.json.meshes[0].name = 'custom/0'
custom.json.meshes[0].extras.nightward.key = 'custom/0'
custom.json.materials[0].name = 'custom-grave'
custom.json.nodes.find(node => node.extras?.nightward?.id).extras.nightward.model = 'custom'
const customData = buildGlb({ root, surfaces: {}, models, previous: custom.json })
const retained = glbToGltf(customData.buffer.slice(customData.byteOffset, customData.byteOffset + customData.byteLength))
const customMesh = retained.json.meshes.find(mesh => mesh.name === 'custom/0')
assert.deepEqual(Array.from(getBuffer(retained.json, retained.buffers, customMesh.primitives[0].attributes.POSITION)), triangle.positions, 'custom geometry survives resource refresh')
assert(retained.json.materials.some(material => material.name === 'custom-grave'))
const mapGlb = readGlb(`${root}models/maps/graveyard.glb`)
assert(!mapGlb.images.some(image => image.name.startsWith('grass-')))
assert(mapGlb.images.some(image => image.name === 'dirt-albedo'))
assert(mapGlb.images.some(image => image.name === 'dirt-normal'))
assert(readGlb(`${root}models/props/tombs.glb`).materials.some(material => material.name === 'dirt'))
for (const image of mapGlb.images)
  assert(image.bufferView !== undefined, 'map textures are embedded')
PixiAssets.loader.load = originalLoad
console.log(`GLB/Prop checks passed: ${scene.props.length} Props, native parser, one-read loading, migration, layout retention, transforms, collision, event pages and session reset.`)

if (process.argv.includes('--built')) {
  const deployed = readGlb(`${root}dist/models/maps/graveyard.glb`)
  assert.equal(deployed.asset.version, '2.0')
  assert(!deployed.materials.some(material => material.name === 'grass'))
  assert(deployed.materials.some(material => material.name === 'dirt'))
  for (const suffix of ['B', 'C', 'D']) {
    assert(existsSync(`${root}dist/img/tilesets/NightwardDirtEdges${suffix}.png`))
    assert(existsSync(`${root}dist/img/tilesets/NightwardDirtEdges${suffix}-normal.png`))
  }
  assert(!existsSync(`${root}dist/img/tilesets/NightwardTombDirt.png`))
  assert(!existsSync(`${root}dist/img/tilesets/NightwardTombDirt-normal.png`))
  assert(existsSync(`${root}dist/models/props/brazier.glb`))
  assert(!existsSync(`${root}dist/img/nightward/reference/world.bin`))
  console.log('Production model directory and scene binding are included.')
}
