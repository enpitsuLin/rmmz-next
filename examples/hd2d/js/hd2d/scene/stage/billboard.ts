import type { Material3DOptions } from '@pixi/3d'
import type { Texture } from 'pixi.js'
import { Material3D, Sprite3D } from '@pixi/3d'
import { addSpriteShadow } from '../spriteShadow'

export interface BillboardOptions {
  texture: Texture
  width: number
  height: number
  position: [number, number, number]
  rotationY?: number
  metalness?: number
  material?: 'standard' | 'lambert'
  emissive?: Material3DOptions['emissive']
  castShadow?: boolean
}

export function createBillboard({
  texture,
  width,
  height,
  position: [x, y, z],
  rotationY = 0,
  metalness = 0,
  material = 'standard',
  emissive,
  castShadow = true,
}: BillboardOptions): Sprite3D {
  const sprite = new Sprite3D({
    texture,
    width,
    height,
    position: { x, y, z },
    rotation: { x: 0, y: rotationY, z: 0 },
    billboardMode: 'none',
    material: new Material3D({
      doubleSided: true,
      alphaMode: 'mask',
      metallic: metalness,
      roughness: 1,
      emissive,
      specular: material === 'lambert' ? { factor: 0 } : undefined,
    }),
    receiveShadow: true,
  })
  if (castShadow)
    addSpriteShadow(sprite)
  return sprite
}
