import { NineSliceSprite } from 'pixi.js'
import { getAssets } from '../managers/NightwardAssetManager'
import { Window_NightwardPanel } from './Window_NightwardPanel'

export function panel(width: number, height: number, part?: 'panel' | 'panelHot'): Window_NightwardPanel
export function panel(width: number, height: number, part: 'softRect' | 'thinFrame' | 'barFrame' | 'keycap'): NineSliceSprite
export function panel(width: number, height: number, part = 'panel'): Window_NightwardPanel | NineSliceSprite {
  if (part === 'panel' || part === 'panelHot') { const node = new Window_NightwardPanel(width, height); node.highlighted = part === 'panelHot'; return node }
  const border = part === 'softRect' ? 18 : part === 'thinFrame' ? 1 : 3
  return new NineSliceSprite({ texture: getAssets().ui[part]!, leftWidth: border, rightWidth: border, topHeight: border, bottomHeight: part === 'keycap' ? 4 : border, width, height })
}
