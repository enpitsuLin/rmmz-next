import { Sprite3D } from '@pixi/3d'
import { Texture } from 'pixi.js'

function createBlobTexture(): Texture {
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 128

  const context = canvas.getContext('2d')!
  const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64)
  gradient.addColorStop(0, 'rgba(0, 0, 0, 0.95)')
  gradient.addColorStop(0.55, 'rgba(0, 0, 0, 0.55)')
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)')
  context.fillStyle = gradient
  context.fillRect(0, 0, 128, 128)

  return Texture.from(canvas)
}

let blobTexture: Texture | undefined

export function createGroundShadow(width = 0.56, height = width, alpha = 0.78): Sprite3D {
  blobTexture ??= createBlobTexture()
  return new Sprite3D({
    texture: blobTexture,
    width,
    height,
    alpha,
    billboardMode: 'none',
    position: { x: 0, y: 0.004, z: 0 },
    rotation: { x: -Math.PI / 2, y: 0, z: 0 },
  })
}
