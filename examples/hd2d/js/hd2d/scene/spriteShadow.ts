import type { Sprite3D } from '@pixi/3d'
import type { Texture, TextureSource } from 'pixi.js'
import { FlatMaterial, Geometry3D, Mesh3D } from '@pixi/3d'

const imageDataCache = new WeakMap<TextureSource, ImageData>()
const silhouetteCache = new WeakMap<Texture, Geometry3D>()
const crossSilhouetteCache = new WeakMap<Texture, Geometry3D>()
const bottomInsetCache = new WeakMap<Texture, number>()
const shadowMaterial = new FlatMaterial()

function readPixels(texture: Texture): ImageData | null {
  const source = texture.source
  const cached = imageDataCache.get(source)
  if (cached)
    return cached

  const resource = source.resource as CanvasImageSource | undefined
  if (!resource || source.pixelWidth <= 0 || source.pixelHeight <= 0)
    return null

  const canvas = document.createElement('canvas')
  canvas.width = source.pixelWidth
  canvas.height = source.pixelHeight
  const context = canvas.getContext('2d')
  if (!context)
    return null

  context.drawImage(resource, 0, 0)
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height)
  imageDataCache.set(source, pixels)
  return pixels
}

function buildSilhouette(texture: Texture, crossCard = false): Geometry3D {
  const cache = crossCard ? crossSilhouetteCache : silhouetteCache
  const cached = cache.get(texture)
  if (cached)
    return cached

  const pixelData = readPixels(texture)
  if (!pixelData)
    return Geometry3D.EMPTY

  const { data, width: stride } = pixelData
  const resolution = texture.source.resolution
  const frame = texture.frame
  const left = Math.round(frame.x * resolution)
  const top = Math.round(frame.y * resolution)
  const width = Math.round(frame.width * resolution)
  const height = Math.round(frame.height * resolution)
  if (width <= 0 || height <= 0)
    return Geometry3D.EMPTY

  const positions: number[] = []
  const indices: number[] = []

  // Native shadow pass ignores texture alpha; build run-length quads for opaque pixels.
  for (let y = 0; y < height; y++) {
    const row = ((top + y) * stride + left) * 4
    let start = -1

    for (let x = 0; x <= width; x++) {
      if (x < width && (data[row + x * 4 + 3] ?? 0) >= 128) {
        if (start === -1)
          start = x
      }
      else if (start !== -1) {
        const index = positions.length / 3
        const x0 = start / width - 0.5
        const x1 = x / width - 0.5
        const y0 = 0.5 - (y + 1) / height
        const y1 = 0.5 - y / height
        positions.push(x0, y0, 0, x1, y0, 0, x1, y1, 0, x0, y1, 0)
        // Shadow pass culls back faces, so emit both windings.
        indices.push(index, index + 1, index + 2, index, index + 2, index + 3)
        indices.push(index + 2, index + 1, index, index + 3, index + 2, index)
        if (crossCard) {
          // Add an orthogonal profile quad so side-on lights still cast a solid character shadow.
          const sideIndex = positions.length / 3
          const z0 = x0 * 0.6
          const z1 = x1 * 0.6
          positions.push(0, y0, z0, 0, y0, z1, 0, y1, z1, 0, y1, z0)
          indices.push(sideIndex, sideIndex + 1, sideIndex + 2, sideIndex, sideIndex + 2, sideIndex + 3)
          indices.push(sideIndex + 2, sideIndex + 1, sideIndex, sideIndex + 3, sideIndex + 2, sideIndex)
        }
        start = -1
      }
    }
  }

  const geometry = positions.length > 0
    ? new Geometry3D({ positions: new Float32Array(positions), indices: new Uint32Array(indices) })
    : Geometry3D.EMPTY
  cache.set(texture, geometry)
  return geometry
}

/** Returns the fraction of transparent padding rows at the bottom of a texture frame. */
export function getBottomInsetRatio(texture: Texture): number {
  const cached = bottomInsetCache.get(texture)
  if (cached !== undefined)
    return cached

  const pixelData = readPixels(texture)
  if (!pixelData)
    return 0

  const { data, width: stride } = pixelData
  const resolution = texture.source.resolution
  const frame = texture.frame
  const left = Math.round(frame.x * resolution)
  const top = Math.round(frame.y * resolution)
  const width = Math.round(frame.width * resolution)
  const height = Math.round(frame.height * resolution)
  if (width <= 0 || height <= 0)
    return 0

  let lastOpaqueY = -1
  for (let y = height - 1; y >= 0; y--) {
    const row = ((top + y) * stride + left) * 4
    for (let x = 0; x < width; x++) {
      if ((data[row + x * 4 + 3] ?? 0) >= 128) {
        lastOpaqueY = y
        break
      }
    }
    if (lastOpaqueY !== -1)
      break
  }

  const ratio = lastOpaqueY === -1 ? 0 : (height - 1 - lastOpaqueY) / height
  bottomInsetCache.set(texture, ratio)
  return ratio
}

export interface SpriteShadowOptions {
  crossCard?: boolean
}

export function addSpriteShadow(sprite: Sprite3D, options: SpriteShadowOptions = {}): (texture: Texture) => void {
  const crossCard = options.crossCard ?? false
  const shadow = new Mesh3D({
    geometry: buildSilhouette(sprite.texture, crossCard),
    material: shadowMaterial,
    castShadow: true,
  })
  shadow.disablePass('opaque')
  sprite.addChild(shadow)

  return (texture: Texture): void => {
    shadow.geometry = buildSilhouette(texture, crossCard)
  }
}
