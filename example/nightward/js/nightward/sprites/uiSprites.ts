import { Sprite } from 'pixi.js'
import { equipmentIcon, getAssets } from '../managers/NightwardAssetManager'

export function sprite(part: string, x = 0, y = 0): Sprite {
  const node = new Sprite(getAssets().ui[part]!)
  node.position.set(x, y)
  return node
}
export function box(width: number, height: number, color: number, alpha = 1, x = 0, y = 0): Sprite {
  const node = sprite('white', x, y)
  node.width = width; node.height = height; node.tint = color; node.alpha = alpha
  return node
}

export function icon(key: string | number): Sprite {
  return new Sprite(typeof key === 'number' ? equipmentIcon(key) : getAssets().hudIcons[key]!)
}
