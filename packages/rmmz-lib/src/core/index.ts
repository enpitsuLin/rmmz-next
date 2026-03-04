import * as PIXI from 'pixi.js'
import { TilemapRenderer } from './TilemapRenderer'

PIXI.extensions.add({
  name: 'rpgtilemap',
  type: PIXI.ExtensionType.RendererPlugin,
  ref: TilemapRenderer,
})

export * from './Bitmap'
export * from './ColorFilter'
export * from './FPSCounter'
export * from './Graphics'
export * from './Input'
export * from './JsonEx'
export * from './Point'
export * from './Rectangle'
export * from './ScreenSprite'
export * from './Sprite'
export * from './Stage'
export * from './Tilemap'
export * from './TilemapLayer'
export * from './TilemapRenderer'
export * from './TilingSprite'
export * from './TouchInput'
export * from './Utils'
export * from './Video'
export * from './Weather'
export * from './WebAudio'
export * from './Window'
export * from './WindowLayer'
