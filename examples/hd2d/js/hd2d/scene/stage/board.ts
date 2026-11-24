import { Container3D } from '@pixi/3d'
import { loadPixelTexture } from '../../utils/texture'
import { createBillboard } from './billboard'

export async function createBoard(x = 0.65, z = -0.65, rotationY = -0.35): Promise<Container3D> {
  const board = await loadPixelTexture('object/board.png')
  const group = new Container3D({ label: '公告板' })
  group.addChild(
    createBillboard({
      texture: board,
      width: 68 * 0.015,
      height: 61 * 0.015,
      position: [x, 0.45, z],
      rotationY,
      metalness: 1,
    }),
  )
  return group
}
