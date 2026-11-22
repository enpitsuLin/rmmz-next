import { Rectangle, Texture } from 'pixi.js'
import { ImageManager } from 'rmmz-next'
import { loadResource } from '../primitives/resource'
import { NightwardEffectManager } from './NightwardEffectManager'

export interface Frame { x: number, y: number, width: number, height: number }
const combatNames = ['glow', 'hotGlow', 'spark', 'puff', 'ring', 'crescent', 'bolt', 'beam', 'shard', 'ember', 'scorch', 'rune', 'flame', 'halo'] as const
export type CombatAtlas = Record<typeof combatNames[number], Texture> & { frames: Texture[] }
export interface Animation { fps: number, width: number, height: number, textures: Texture[] }

export interface Look {
  exposure: number
  contrast: number
  saturation: number
  split: number
  shadowTint: number
  highlightTint: number
  lift: number
  tint: number
  vignette: number
  grain: number
  aberration: number
  bloomIntensity: number
  bloomThreshold: number
  bloomRadius: number
  tilt: number
  focus: number
  fogColor: number
  fogDensity: number
  moonColor: number
  moonIntensity: number
  moonGlow: number
  skyColor: number
  groundColor: number
  hemisphere: number
  skyTop: number
  skyHorizon: number
}

export interface ReferenceManifest {
  animations: Record<string, { fps: number, width: number, height: number, frames: Frame[] }>
  details: { candles: number[][] }
  look: Record<'play' | 'title' | 'boss' | 'dawn', Look>
  lights: { heroColor: number, heroRange: number, fireY: number, fireColor: number, fireIntensity: number, fireRange: number }
}

export interface ReferenceUi {
  glyphs: { char: string, advance: number, frames: Frame[], bigFrames: Frame[] }[]
  parts: Record<string, Frame>
  space: number
  cap: number
}

export interface Assets {
  animations: Record<string, Animation>
  albedo: Texture
  normal: Texture
  glow: Texture
  effects: Texture[]
  combat: CombatAtlas
  ui: Record<string, Texture>
  glyphs: Map<string, { advance: number, small: Texture[], big: Texture[] }>
  uiData: ReferenceUi
  sky: Texture
  moon: Texture
  mist: Texture
  leaves: Texture[]
  manifest: ReferenceManifest
}

/**
 * The static class that loads and caches Nightward atlases, glyph textures, and IconSet slices.
 */
export class NightwardAssetManager {
  static readonly _folder = 'img/nightward/reference/'
  static _equipmentIcons = new Map<number, Texture>()
  static _assets: Assets | null = null
  static _manifest: ReferenceManifest | null = null
  static _uiData: ReferenceUi | null = null
  static _combatData: { frames: Record<string, Frame> } | null = null
  static _loading: Promise<void> | null = null
  static _ready = false
  static _failure: unknown = null

  constructor() {
    throw new Error('This is a static class')
  }

  static equipmentIcon(index: number): Texture {
    let texture = this._equipmentIcons.get(index)
    if (!texture) {
      const width = ImageManager.iconWidth
      const height = ImageManager.iconHeight
      texture = new Texture({
        source: ImageManager.loadSystem('IconSet').baseTexture,
        frame: new Rectangle(index % 16 * width, Math.floor(index / 16) * height, width, height),
      })
      this._equipmentIcons.set(index, texture)
    }
    return texture
  }

  static load(): void {
    this._loading ??= Promise.all([
      loadResource<ReferenceManifest>(`${this._folder}manifest.json`),
      loadResource<ReferenceUi>(`${this._folder}ui.json`),
      loadResource<{ frames: Record<string, Frame> }>(`${this._folder}combat-fx.json`),
      NightwardEffectManager.load(),
    ])
      .then(([world, ui, combat]) => {
        this._manifest = world
        this._uiData = ui
        this._combatData = combat
        const sharp = new Set(['actors-albedo', 'actors-normal', 'actors-glow', 'ui-pixels', 'leaves'])
        for (const name of ['actors-albedo', 'actors-normal', 'actors-glow', 'effects', 'combat-fx', 'ui-pixels', 'ui-soft', 'sky', 'moon', 'mist', 'leaves'])
          ImageManager.loadBitmap(this._folder, name).smooth = !sharp.has(name)
        ImageManager.loadSystem('IconSet').smooth = false
        ImageManager.loadSystem('Window').smooth = false
        this._ready = true
      })
      .catch((error) => {
        this._failure = error
      })
  }

  static isReady(): boolean {
    if (this._failure)
      throw this._failure
    return this._ready && NightwardEffectManager.isReady()
  }

  static assets(): Assets {
    if (this._assets)
      return this._assets
    const manifest = this._manifest!
    const uiData = this._uiData!
    const combatData = this._combatData!
    const texture = (name: string, frame?: Frame): Texture => {
      const bitmap = ImageManager.loadBitmap(this._folder, name)
      return new Texture({ source: bitmap.baseTexture, frame: frame ? new Rectangle(frame.x, frame.y, frame.width, frame.height) : undefined })
    }
    const animations = Object.fromEntries(
      Object.entries(manifest.animations).map(([name, animation]) => [
        name,
        { ...animation, textures: animation.frames.map(frame => texture('actors-albedo', frame)) },
      ]),
    )
    const ui = Object.fromEntries(Object.entries(uiData.parts).map(([name, frame]) => [name, texture('ui-pixels', frame)]))
    ui.glow = texture('ui-soft', { x: 0, y: 0, width: 64, height: 64 })
    ui.softRect = texture('ui-soft', { x: 72, y: 8, width: 48, height: 48 })
    ui.vignette = texture('ui-soft', { x: 128, y: 0, width: 64, height: 64 })
    const effects = [
      texture('effects', { x: 1, y: 1, width: 126, height: 126 }),
      animations.tome!.textures[0]!,
      texture('effects', { x: 129, y: 1, width: 126, height: 126 }),
      ui.ring!,
      texture('effects', { x: 257, y: 1, width: 126, height: 126 }),
      texture('effects', { x: 1, y: 1, width: 126, height: 126 }),
      ui.sparkle!,
      animations['brazier.fire']!.textures[0]!,
    ]
    const combat = Object.fromEntries(combatNames.map(name => [name, texture('combat-fx', combatData.frames[name])])) as Record<typeof combatNames[number], Texture>
    this._assets = {
      animations,
      albedo: texture('actors-albedo'),
      normal: texture('actors-normal'),
      glow: texture('actors-glow'),
      effects,
      combat: { ...combat, frames: combatNames.map(name => combat[name]) },
      ui,
      glyphs: new Map(uiData.glyphs.map(glyph => [
        glyph.char,
        {
          advance: glyph.advance,
          small: glyph.frames.map(frame => texture('ui-pixels', frame)),
          big: glyph.bigFrames.map(frame => texture('ui-pixels', frame)),
        },
      ])),
      uiData,
      sky: texture('sky'),
      moon: texture('moon'),
      mist: texture('mist'),
      leaves: Array.from({ length: 4 }, (_, index) => texture('leaves', { x: index * 36, y: 0, width: 36, height: 36 })),
      manifest,
    }
    this._assets.sky.source.addressMode = 'repeat'
    return this._assets
  }
}
