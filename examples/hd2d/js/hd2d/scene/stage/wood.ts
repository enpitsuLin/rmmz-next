import type { BillboardOptions } from './billboard'
import { Container3D } from '@pixi/3d'
import { loadPixelTexture } from '../../utils/texture'
import { createBillboard } from './billboard'

export async function createWood(): Promise<Container3D> {
  const [wood1, wood2, wood3, wood4] = await Promise.all([
    loadPixelTexture('object/wood_1.png'),
    loadPixelTexture('object/wood_2.png'),
    loadPixelTexture('object/wood_3.png'),
    loadPixelTexture('object/wood_4.png'),
  ])

  const group = new Container3D({ label: '木料' })
  const items: BillboardOptions[] = [
    { position: [1.35, 0.07, -0.95], rotationY: -0.5, texture: wood4, width: 24 * 0.015, height: 9 * 0.015 },
    { position: [-1.0, 0.06, -1.3], rotationY: 0.5, texture: wood2, width: 19 * 0.015, height: 8 * 0.015 },
    { position: [-2.0, 0.075, -0.2], rotationY: 0.7, texture: wood3, width: 17 * 0.015, height: 10 * 0.015 },
    { position: [-1.22, 0.06, 0.52], rotationY: 0.2, texture: wood3, width: 17 * 0.012, height: 10 * 0.012 },
    { position: [-2.0, 0.06, -0.45], rotationY: 0.75, texture: wood1, width: 11 * 0.015, height: 7 * 0.015, metalness: 1 },
  ]

  for (const item of items)
    group.addChild(createBillboard(item))

  return group
}
