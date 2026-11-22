import type { NineSliceSprite } from 'pixi.js'
import { Container, Sprite } from 'pixi.js'
import { equipmentIcon, getAssets } from '../managers/NightwardAssetManager'
import { panel } from '../windows/panel'
import { text } from './Sprite_NightwardText'

export function sprite(part: string, x = 0, y = 0): Sprite {
  const node = new Sprite(getAssets().ui[part]!)
  node.position.set(x, y)
  return node
}
export function box(width: number, height: number, color: number, alpha = 1, x = 0, y = 0): Sprite {
  const node = sprite('white', x, y)
  node.width = width
  node.height = height
  node.tint = color
  node.alpha = alpha
  return node
}

export function icon(index: number): Sprite {
  return new Sprite(equipmentIcon(index))
}

export function iconScale(node: Sprite, factor = 1): number {
  return 16 / node.texture.frame.width * factor
}

export function keycap(value: string): { node: Container, frame: NineSliceSprite, width: number } {
  const node = new Container()
  const line = text(value, 3, 2)
  const width = line.textWidth + 6
  const frame = panel(width, 11, 'keycap')
  node.addChild(frame, line)
  return { node, frame, width }
}

export function touchHintArt(): { node: Container, knob: Sprite } {
  const node = new Container()
  const ring = sprite('ring')
  const knob = sprite('knob')
  ring.anchor.set(0.5)
  knob.anchor.set(0.5)
  ring.scale.set(0.5)
  knob.scale.set(0.5)
  ring.position.set(12, 12)
  knob.position.set(18, 12)
  node.addChild(ring, knob)
  return { node, knob }
}
