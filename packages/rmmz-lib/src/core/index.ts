//=============================================================================
// rmmz_core.js v1.9.0
//=============================================================================
import * as PIXI from 'pixi.js'
import { TilemapRenderer } from './TilemapRenderer'

PIXI.extensions.add({
  name: "rpgtilemap",
  type: PIXI.ExtensionType.RendererPlugin,
  ref: TilemapRenderer,
});
