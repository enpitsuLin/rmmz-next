import type { BillboardOptions } from './billboard'
import { Container3D } from '@pixi/3d'
import { loadPixelTexture } from '../../utils/texture'
import { createBillboard } from './billboard'

export async function createGrass(): Promise<Container3D> {
  const [grass1, grass3] = await Promise.all([
    loadPixelTexture('object/grass_1.png'),
    loadPixelTexture('object/grass_3.png'),
  ])

  const group = new Container3D({ label: '草丛' })
  const items: BillboardOptions[] = [
    { position: [0.5, 0.25, -1.35], rotationY: -0.35, texture: grass1, width: 95 * 0.015, height: 37 * 0.015, metalness: 1 },
    { position: [1.75, 0.14, -0.45], rotationY: -0.65, texture: grass3, width: 57 * 0.01, height: 29 * 0.01 },
    { position: [-0.2, 0.44, -2.0], texture: grass3, width: 57 * 0.03, height: 29 * 0.03 },
    { position: [1.65, 0.24, -1.05], rotationY: -0.7, texture: grass3, width: 57 * 0.02, height: 29 * 0.02 },
    { position: [-1.5, 0.25, -1.1], rotationY: 0.55, texture: grass1, width: 95 * 0.015, height: 37 * 0.015, metalness: 1 },
    { position: [-2.4, 0.35, -1.27], rotationY: 0.75, texture: grass1, width: 95 * 0.02, height: 37 * 0.02, metalness: 1 },
  ]

  for (const item of items)
    group.addChild(createBillboard(item))

  return group
}
