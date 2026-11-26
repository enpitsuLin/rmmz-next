import type { Bitmap } from 'rmmz-next'
import { ImageManager } from 'rmmz-next'

export function waitBitmapReady(bitmap: Bitmap): Promise<Bitmap> {
  if (bitmap.isReady() || bitmap.isError())
    return Promise.resolve(bitmap)
  return new Promise((resolve) => {
    bitmap.addLoadListener(() => resolve(bitmap))
  })
}

export async function loadTilesetBitmaps(tilesetNames: readonly string[]): Promise<Bitmap[]> {
  const bitmaps = tilesetNames.map(name => ImageManager.loadTileset(name))
  await Promise.all(bitmaps.map(waitBitmapReady))
  for (const bitmap of bitmaps) {
    if (bitmap.baseTexture)
      bitmap.baseTexture.scaleMode = 'nearest'
  }
  return bitmaps
}

export function createFlatNormalBitmap(width = 48, height = 48): Bitmap {
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(width, 1)
  canvas.height = Math.max(height, 1)
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = 'rgb(128, 128, 255)'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // Wrap canvas in a lightweight Bitmap-compatible object expected by TilemapAtlas.
  return {
    width: canvas.width,
    height: canvas.height,
    canvas,
    image: null,
    isReady: () => true,
    isError: () => false,
    addLoadListener: (cb: (b: Bitmap) => void) => cb(undefined as unknown as Bitmap),
  } as unknown as Bitmap
}

export function loadOptionalNormalBitmap(tilesetName: string, fallbackWidth: number, fallbackHeight: number): Promise<Bitmap> {
  if (!tilesetName)
    return Promise.resolve(createFlatNormalBitmap(fallbackWidth, fallbackHeight))

  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight,
        image: img,
        canvas: null,
        isReady: () => true,
        isError: () => false,
        addLoadListener: (cb: (b: Bitmap) => void) => cb(undefined as unknown as Bitmap),
      } as unknown as Bitmap)
    }
    img.onerror = () => {
      resolve(createFlatNormalBitmap(fallbackWidth, fallbackHeight))
    }
    img.src = `img/tilesets/${encodeURIComponent(tilesetName).replace(/%2F/g, '/').replace(/%24/g, '$')}-normal.png`
  })
}
