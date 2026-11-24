import type { Texture } from 'pixi.js'
import { Assets } from 'pixi.js'
import { hd2dAssetUrl } from '../constants'

export async function loadPixelTexture(relativePath: string): Promise<Texture> {
  const texture = await Assets.load<Texture>(hd2dAssetUrl(relativePath))
  texture.source.scaleMode = 'nearest'
  return texture
}
