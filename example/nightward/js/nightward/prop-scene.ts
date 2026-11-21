import type { BaseMaterial3D, Geometry3D, GltfFormat, Scene3DSource } from '@pixi/3d'
import type { MeshValues, ModelMesh, PropLight, PropModel } from './assets'
import { getAttributeData, glbToGltf, loadImages, Matrix4, normalizeMeshopt, parseGltf, Quaternion } from '@pixi/3d'
import { Assets as PixiAssets } from 'pixi.js'

export interface PropPlacement {
  id: string
  modelKey: string
  model: PropModel
  matrix: Matrix4
  seed: number
}
export interface PropScene {
  source: Scene3DSource
  environment: ModelMesh[]
  props: PropPlacement[]
  materials: Map<string, BaseMaterial3D>
}
type Node = GltfFormat.Node & {
  extras?: {
    nightward?: Partial<Omit<PropModel, 'meshes'>> & {
      id?: string
      model?: string
      seed?: number
      light?: Omit<PropLight, 'x' | 'y' | 'z'>
      doorSide?: number
    }
  }
}
const scenes = new Map<string, {
  scene?: PropScene
  failure?: unknown
}>()
export function nodeMatrix(node: GltfFormat.Node): Matrix4 {
  const matrix = new Matrix4()
  if (node.matrix) {
    matrix.elements.set(node.matrix)
  }
  else {
    const p = node.translation ?? [0, 0, 0]
    const q = node.rotation ?? [0, 0, 0, 1]
    const s = node.scale ?? [1, 1, 1]
    matrix.compose({ x: p[0]!, y: p[1]!, z: p[2]! }, new Quaternion(q[0]!, q[1]!, q[2]!, q[3]!), { x: s[0]!, y: s[1]!, z: s[2]! })
  }
  return matrix
}
export function transformPoint(matrix: Matrix4, x: number, y: number, z: number): {
  x: number
  y: number
  z: number
} {
  const m = matrix.elements
  return { x: m[0]! * x + m[4]! * y + m[8]! * z + m[12]!, y: m[1]! * x + m[5]! * y + m[9]! * z + m[13]!, z: m[2]! * x + m[6]! * y + m[10]! * z + m[14]! }
}
export async function loadPropScene(url: string): Promise<PropScene> {
  // RMMZ/NW.js loads local resources through XHR; fetch(file://) is unavailable.
  const data = await new Promise<ArrayBuffer>((resolve, reject) => {
    const request = new XMLHttpRequest()
    request.open('GET', url)
    request.responseType = 'arraybuffer'
    request.onload = () => request.status < 400 && request.response ? resolve(request.response) : reject(new Error(`Nightward GLB: ${url} (${request.status})`))
    request.onerror = () => reject(new Error(`Nightward GLB: ${url}`))
    request.send()
  })
  const { json, buffers } = glbToGltf(data)
  await normalizeMeshopt(json, buffers)
  const images = await loadImages(json, url.slice(0, url.lastIndexOf('/') + 1), buffers, PixiAssets.loader)
  let source: Scene3DSource
  try {
    source = await parseGltf(json, buffers, images.textures)
  }
  catch (error) {
    await PixiAssets.loader.unload(images.urls)
    throw error
  }
  const materials = new Map<string, BaseMaterial3D>()
  for (const [index, raw] of (json.materials ?? []).entries()) {
    const material = source.materials[index]!
    const flags = (raw as typeof raw & {
      extras?: {
        nightward?: {
          flatShading?: boolean
          fog?: boolean
        }
      }
    }).extras?.nightward
    if (flags)
      Object.assign(material, flags)
    materials.set(raw.name ?? `material-${index}`, material)
  }
  const values = new Map<Geometry3D, MeshValues>()
  const geometryValues = (geometry: Geometry3D): MeshValues => {
    let result = values.get(geometry)
    if (!result) {
      const positions = getAttributeData(geometry, 'aPosition', 3)
      const count = positions.length / 3
      const colors = geometry.attributes.aColor ? Uint8Array.from(getAttributeData(geometry, 'aColor', 4), value => Math.round(value * 255)) : new Uint8Array(count * 4).fill(255)
      result = { positions, normals: geometry.attributes.aNormal ? getAttributeData(geometry, 'aNormal', 3) : new Float32Array(count * 3), uvs: geometry.attributes.aUV ? getAttributeData(geometry, 'aUV', 2) : new Float32Array(count * 2), colors, indices: geometry.indices }
      values.set(geometry, result)
    }
    return result
  }
  const environment: ModelMesh[] = []
  const props: PropPlacement[] = []
  const ids = new Set<string>()
  const nodes = json.nodes as Node[]
  const visit = (index: number, parent: Matrix4, owner?: PropPlacement): void => {
    const node = nodes[index]!
    const info = node.extras?.nightward
    let matrix = new Matrix4().multiplyMatrices(parent, nodeMatrix(node))
    if (info?.id && info.model) {
      if (ids.has(info.id))
        throw new Error(`Duplicate Nightward Prop ID: ${info.id}`)
      ids.add(info.id)
      owner = { id: info.id, modelKey: info.model, seed: info.seed ?? props.length, matrix, model: { kind: info.kind ?? 'decoration', colliders: info.colliders ?? [], ...info, meshes: [], lights: [] } }
      props.push(owner)
      matrix = new Matrix4()
    }
    if (node.mesh !== undefined) {
      const primitives = json.meshes![node.mesh]!.primitives
      for (const [primitive, raw] of primitives.entries()) {
        const geometry = source.geometries[node.mesh]![primitive]!
        const material = raw.material === undefined ? 'default' : json.materials?.[raw.material]?.name ?? `material-${raw.material}`
        const mesh = { geometry, values: geometryValues(geometry), material, matrix, doorSide: info?.doorSide }
        if (!materials.has(mesh.material))
          materials.set(mesh.material, raw.material === undefined ? source.materials[source.materials.length - 1]! : source.materials[raw.material]!);
        (owner ? owner.model.meshes : environment).push(mesh)
      }
    }
    if (owner && info?.light) {
      const point = transformPoint(matrix, 0, 0, 0)
      const light = { ...info.light, ...point }
      if (light.lampY !== undefined)
        light.lampY = transformPoint(matrix, 0, light.lampY - (node.translation?.[1] ?? 0), 0).y
      owner.model.lights.push(light)
    }
    for (const child of node.children ?? [])
      visit(child, matrix, owner)
  }
  try {
    for (const index of json.scenes![json.scene ?? 0]!.nodes ?? [])
      visit(index, new Matrix4())
  }
  catch (error) {
    source.destroy()
    await PixiAssets.loader.unload(images.urls)
    throw error
  }
  return { source, environment, props, materials }
}
export function propSceneReady(url: string): boolean {
  let entry = scenes.get(url)
  if (!entry) {
    entry = {}
    scenes.set(url, entry)
    const pending = entry
    void loadPropScene(url).then((scene) => {
      pending.scene = scene
    }).catch((error) => {
      pending.failure = error
    })
  }
  if (entry.failure)
    throw entry.failure
  return !!entry.scene
}
export function getPropScene(url: string): PropScene {
  return scenes.get(url)!.scene!
}
export function propSceneUrl(note: string): string {
  const url = note.match(/<propScene:([^>]+)>/i)?.[1]?.trim()
  if (!url)
    throw new Error('Nightward map requires <propScene:models/maps/graveyard.glb>')
  return url
}
