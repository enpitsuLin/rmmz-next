import type { BillboardOptions } from './billboard'
import { Container3D } from '@pixi/3d'
import { loadPixelTexture } from '../../utils/texture'
import { createBillboard } from './billboard'

export async function createRocks(): Promise<Container3D> {
  const [rock1, rock2] = await Promise.all([
    loadPixelTexture('object/rock_1.png'),
    loadPixelTexture('object/rock_2.png'),
  ])

  const group = new Container3D({ label: '石头' })
  const items: BillboardOptions[] = [
    { position: [-1.0, 0.28, -1.6], rotationY: 0.15, texture: rock1, width: 33 * 0.03, height: 19 * 0.03, material: 'lambert' },
    { position: [-1.5, 0.28, -1.3], rotationY: 0.3, texture: rock2, width: 21 * 0.03, height: 15 * 0.03, material: 'lambert' },
  ]

  for (const item of items)
    group.addChild(createBillboard(item))

  return group
}
