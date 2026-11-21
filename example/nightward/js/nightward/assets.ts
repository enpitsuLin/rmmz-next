import { ImageManager } from 'rmmz-next'
import { groupD8, Rectangle, Texture } from 'pixi.js'

export const actorNames = ['hero', 'bat', 'skeleton', 'ghoul', 'wraith', 'skull', 'reaper'] as const
export type ActorImage = typeof actorNames[number]
const mirroredTextures = new WeakMap<Texture, Texture>()
export function facingTexture(texture: Texture, facing: number): Texture {
  if (facing >= 0) return texture
  let mirrored = mirroredTextures.get(texture)
  if (!mirrored) {
    // Billboard shaders discard negative scale; mirror atlas UVs instead.
    mirrored = new Texture({ source: texture.source, frame: texture.frame, rotate: groupD8.MIRROR_HORIZONTAL })
    mirroredTextures.set(texture, mirrored)
  }
  return mirrored
}
export interface Frame { x: number, y: number, width: number, height: number }
const combatNames = ['glow', 'hotGlow', 'spark', 'puff', 'ring', 'crescent', 'bolt', 'beam', 'shard', 'ember', 'scorch', 'rune', 'flame', 'halo'] as const
export type CombatAtlas = Record<typeof combatNames[number], Texture> & { frames: Texture[] }
export interface Animation { fps: number, width: number, height: number, textures: Texture[] }
export interface PackedAttribute { offset: number, length: number, type: 'Float32Array' | 'Uint32Array' | 'Uint16Array' | 'Uint8Array' }
export interface ModelMesh { material: string, kind?: 'door' | 'sky', offset?: { x: number, y: number, z: number }, attributes: Record<'positions' | 'normals' | 'uvs' | 'colors' | 'indices', PackedAttribute> }
export interface LocalCollider { x: number, z: number, width: number, depth: number }
export interface PropLight { kind: 'fire' | 'candle' | 'candle-flame' | 'window' | 'crypt', x: number, y: number, z: number, color: number, intensity: number, range: number, size?: number, lampY?: number }
export interface PropModel {
  kind: string
  meshes: ModelMesh[]
  colliders: LocalCollider[]
  lights: PropLight[]
  hp?: number
  radius?: number
  door?: { hingeX: number, y: number, z: number, width: number, height: number, thickness: number }
}
export interface Look {
  exposure: number, contrast: number, saturation: number, split: number, shadowTint: number, highlightTint: number, lift: number, tint: number, vignette: number, grain: number, aberration: number,
  bloomIntensity: number, bloomThreshold: number, bloomRadius: number, tilt: number, focus: number, fogColor: number, fogDensity: number, moonColor: number, moonIntensity: number,
  moonGlow: number, skyColor: number, groundColor: number, hemisphere: number, skyTop: number, skyHorizon: number
}
export interface ReferenceManifest {
  animations: Record<string, { fps: number, width: number, height: number, frames: Frame[] }>
  icons: Record<string, { x: number, y: number, w: number, h: number }>
  surfaces: Record<string, { tile: number, normal: boolean, emissive: boolean }>
  meshes: ModelMesh[]
  propModels: Record<string, PropModel>
  propAliases: Record<string, string>
  propLayout: { key: string, model: string, x: number, z: number }[]
  propGroups: Record<string, { key: string, model: string, x: number, z: number }[]>
  details: {
    colliders: { minX: number, minZ: number, maxX: number, maxZ: number }[]
    fireY: number
    candles: number[][]
    candleSites: { x: number, y: number, z: number, color: number, intensity: number, range: number }[]
    windows: { x: number, y: number, z: number, color: number, intensity: number, range: number }[]
    door: { hingeX: number, y: number, z: number, width: number, height: number, thickness: number }
    cryptGlow: { x: number, y: number, z: number, color: number, intensity: number, range: number }
  }
  braziers: { x: number, z: number }[]
  crypt: { x: number, z: number, width: number, depth: number }
  look: Record<'play' | 'title' | 'boss' | 'dawn', Look>
  palette: Record<string, number>
  skyRadius: number
  lights: { heroColor: number, heroRange: number, fireY: number, fireColor: number, fireIntensity: number, fireRange: number }
}
export interface ReferenceUi {
  glyphs: { char: string, advance: number, frames: Frame[], bigFrames: Frame[] }[]
  parts: Record<string, Frame>
  space: number
  cap: number
}
export interface Assets {
  actors: Record<ActorImage, Texture[]>
  animations: Record<string, Animation>
  albedo: Texture
  normal: Texture
  glow: Texture
  effects: Texture[]
  combat: CombatAtlas
  icons: Texture[]
  hudIcons: Record<string, Texture>
  surfaces: Record<string, { albedo: Texture, normal?: Texture, emissive?: Texture }>
  ui: Record<string, Texture>
  glyphs: Map<string, { advance: number, small: Texture[], big: Texture[] }>
  uiData: ReferenceUi
  sky: Texture
  moon: Texture
  mist: Texture
  leaves: Texture[]
  manifest: ReferenceManifest
  geometry: ArrayBuffer
}
const folder = 'img/nightward/reference/'
let assets: Assets | undefined
let manifest: ReferenceManifest
let uiData: ReferenceUi
let combatData: { frames: Record<string, Frame> }
let geometry: ArrayBuffer
let loading: Promise<void> | undefined
let ready = false
let failure: unknown
function loadResource<T>(name: string, binary = false): Promise<T> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest()
    request.open('GET', `${folder}${name}`)
    request.responseType = binary ? 'arraybuffer' : 'json'
    request.onload = () => request.status < 400 ? resolve(request.response as T) : reject(new Error(`Nightward asset: ${name} (${request.status})`))
    request.onerror = () => reject(new Error(`Nightward asset: ${name}`))
    request.send()
  })
}
export function requestAssets(): void {
  loading ??= Promise.all([loadResource<ReferenceManifest>('manifest.json'), loadResource<ReferenceUi>('ui.json'), loadResource<ArrayBuffer>('world.bin', true), loadResource<typeof combatData>('combat-fx.json')])
    .then(async ([world, ui, packed, combat]) => {
      manifest = world
      uiData = ui
      combatData = combat
      geometry = await new Response(new Blob([packed]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer()
      for (const name of ['actors-albedo', 'actors-normal', 'actors-glow', 'effects', 'combat-fx', 'icons', 'ui-pixels', 'ui-soft', 'sky', 'moon', 'mist', 'leaves']) ImageManager.loadBitmap(folder, name).smooth = !['actors-albedo', 'actors-normal', 'actors-glow', 'ui-pixels', 'icons', 'leaves'].includes(name)
      for (const [name, surface] of Object.entries(manifest.surfaces)) {
        ImageManager.loadBitmap(folder, `${name}-albedo`).smooth = false
        if (surface.normal) ImageManager.loadBitmap(folder, `${name}-normal`).smooth = false
        if (surface.emissive) ImageManager.loadBitmap(folder, `${name}-emissive`).smooth = false
      }
      ImageManager.loadSystem('IconSet').smooth = false
      ImageManager.loadSystem('Window').smooth = false
      ready = true
    }).catch(error => { failure = error })
}
export function assetsReady(): boolean {
  if (failure) throw failure
  return ready
}
export function getAssets(): Assets {
  if (assets) return assets
  const texture = (name: string, frame?: Frame): Texture => {
    const bitmap = ImageManager.loadBitmap(folder, name)
    return new Texture({ source: bitmap.baseTexture, frame: frame ? new Rectangle(frame.x, frame.y, frame.width, frame.height) : undefined })
  }
  const animations = Object.fromEntries(Object.entries(manifest.animations).map(([name, animation]) => [name, { ...animation, textures: animation.frames.map(frame => texture('actors-albedo', frame)) }]))
  const names = ['hero.walk', 'bat.fly', 'skeleton.walk', 'ghoul.walk', 'wraith.float', 'skull.fly', 'reaper.walk']
  const ui = Object.fromEntries(Object.entries(uiData.parts).map(([name, frame]) => [name, texture('ui-pixels', frame)]))
  ui.glow = texture('ui-soft', { x: 0, y: 0, width: 64, height: 64 })
  ui.softRect = texture('ui-soft', { x: 72, y: 8, width: 48, height: 48 })
  ui.vignette = texture('ui-soft', { x: 128, y: 0, width: 64, height: 64 })
  const effects = [texture('effects', { x: 1, y: 1, width: 126, height: 126 }), animations.tome!.textures[0]!, texture('effects', { x: 129, y: 1, width: 126, height: 126 }), ui.ring!, texture('effects', { x: 257, y: 1, width: 126, height: 126 }), texture('effects', { x: 1, y: 1, width: 126, height: 126 }), ui.sparkle!, animations['brazier.fire']!.textures[0]!]
  const iconBitmap = ImageManager.loadSystem('IconSet')
  const combat = Object.fromEntries(combatNames.map(name => [name, texture('combat-fx', combatData.frames[name])])) as Record<typeof combatNames[number], Texture>
  assets = {
    actors: Object.fromEntries(actorNames.map((name, index) => [name, animations[names[index]!]!.textures])) as Assets['actors'],
    animations, albedo: texture('actors-albedo'), normal: texture('actors-normal'), glow: texture('actors-glow'), effects, combat: { ...combat, frames: combatNames.map(name => combat[name]) },
    icons: Array.from({ length: 128 }, (_, index) => new Texture({ source: iconBitmap.baseTexture, frame: new Rectangle(index % 16 * 32, Math.floor(index / 16) * 32, 32, 32) })),
    hudIcons: Object.fromEntries(Object.entries(manifest.icons).map(([name, frame]) => [name, texture('icons', { x: frame.x, y: frame.y, width: frame.w, height: frame.h })])),
    surfaces: Object.fromEntries(Object.entries(manifest.surfaces).map(([name, surface]) => {
      const albedo = texture(`${name}-albedo`), normal = surface.normal ? texture(`${name}-normal`) : undefined, emissive = surface.emissive ? texture(`${name}-emissive`) : undefined
      for (const map of [albedo, normal, emissive]) if (map) { map.source.addressMode = 'repeat'; map.source.style.magFilter = 'nearest'; map.source.style.minFilter = 'linear' }
      return [name, { albedo, normal, emissive }]
    })),
    ui, glyphs: new Map(uiData.glyphs.map(glyph => [glyph.char, { advance: glyph.advance, small: glyph.frames.map(frame => texture('ui-pixels', frame)), big: glyph.bigFrames.map(frame => texture('ui-pixels', frame)) }])), uiData, sky: texture('sky'), moon: texture('moon'), mist: texture('mist'),
    leaves: Array.from({ length: 4 }, (_, index) => texture('leaves', { x: index * 36, y: 0, width: 36, height: 36 })), manifest, geometry,
  }
  assets.sky.source.addressMode = 'repeat'
  return assets
}
