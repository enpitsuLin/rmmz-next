import type { Sprite3D } from '@pixi/3d'
import type { Texture, TextureSource } from 'pixi.js'
import { FlatMaterial, Geometry3D, Mesh3D } from '@pixi/3d'

const imageDataCache = new WeakMap<TextureSource, ImageData>()
const silhouetteCache = new WeakMap<Texture, Geometry3D>()
export interface SpriteFootprintMetrics {
  bottomInsetRatio: number
  /** Horizontal visible width ratio at the sprite's ground base, in [0, 1]. */
  widthRatio: number
  /** Horizontal center offset of the visible base relative to frame center, in [-0.5, 0.5]. */
  centerOffsetRatio: number
}

const EMPTY_FOOTPRINT: SpriteFootprintMetrics = {
  bottomInsetRatio: 0,
  widthRatio: 0,
  centerOffsetRatio: 0,
}

const footprintCache = new WeakMap<Texture, SpriteFootprintMetrics>()
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

function buildSilhouette(texture: Texture): Geometry3D {
  const cached = silhouetteCache.get(texture)
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
        start = -1
      }
    }
  }

  const geometry = positions.length > 0
    ? new Geometry3D({ positions: new Float32Array(positions), indices: new Uint32Array(indices) })
    : Geometry3D.EMPTY
  silhouetteCache.set(texture, geometry)
  return geometry
}

/** Computes cached opaque base bounds (bottom inset, horizontal width, center offset) of a texture frame. */
export function getSpriteFootprintMetrics(texture: Texture): SpriteFootprintMetrics {
  const cached = footprintCache.get(texture)
  if (cached)
    return cached

  const pixelData = readPixels(texture)
  if (!pixelData)
    return EMPTY_FOOTPRINT

  const { data, width: stride } = pixelData
  const resolution = texture.source.resolution
  const frame = texture.frame
  const left = Math.round(frame.x * resolution)
  const top = Math.round(frame.y * resolution)
  const width = Math.round(frame.width * resolution)
  const height = Math.round(frame.height * resolution)
  if (width <= 0 || height <= 0)
    return EMPTY_FOOTPRINT

  let firstOpaqueY = -1
  let lastOpaqueY = -1
  for (let y = 0; y < height; y++) {
    const row = ((top + y) * stride + left) * 4
    for (let x = 0; x < width; x++) {
      if ((data[row + x * 4 + 3] ?? 0) >= 128) {
        if (firstOpaqueY === -1)
          firstOpaqueY = y
        lastOpaqueY = y
        break
      }
    }
  }

  if (lastOpaqueY === -1) {
    footprintCache.set(texture, EMPTY_FOOTPRINT)
    return EMPTY_FOOTPRINT
  }

  // Measure horizontal footprint over the lower 35% of the visible sprite so capes/flames do not bloat ground colliders.
  const visibleHeight = lastOpaqueY - firstOpaqueY + 1
  const baseBandHeight = Math.max(Math.min(visibleHeight, 6), Math.ceil(visibleHeight * 0.35))
  const baseStartY = Math.max(firstOpaqueY, lastOpaqueY - baseBandHeight + 1)

  let minX = width
  let maxX = -1
  for (let y = baseStartY; y <= lastOpaqueY; y++) {
    const row = ((top + y) * stride + left) * 4
    for (let x = 0; x < width; x++) {
      if ((data[row + x * 4 + 3] ?? 0) >= 128) {
        if (x < minX)
          minX = x
        if (x > maxX)
          maxX = x
      }
    }
  }

  const metrics: SpriteFootprintMetrics = {
    bottomInsetRatio: (height - 1 - lastOpaqueY) / height,
    widthRatio: maxX >= minX ? (maxX - minX + 1) / width : 0,
    centerOffsetRatio: maxX >= minX ? ((minX + maxX + 1) * 0.5) / width - 0.5 : 0,
  }
  footprintCache.set(texture, metrics)
  return metrics
}

/** Returns the fraction of transparent padding rows at the bottom of a texture frame. */
export function getBottomInsetRatio(texture: Texture): number {
  return getSpriteFootprintMetrics(texture).bottomInsetRatio
}

export interface SpriteShadowHandle {
  update: (texture: Texture) => void
  setVisible: (visible: boolean) => void
}

export function addSpriteShadow(sprite: Sprite3D): SpriteShadowHandle {
  const shadow = new Mesh3D({
    geometry: buildSilhouette(sprite.texture),
    material: shadowMaterial,
    castShadow: true,
  })
  shadow.disablePass('opaque')
  sprite.addChild(shadow)

  return {
    update: (texture: Texture): void => {
      shadow.geometry = buildSilhouette(texture)
    },
    setVisible: (visible: boolean): void => {
      shadow.visible = visible
      shadow.castShadow = visible
    },
  }
}
