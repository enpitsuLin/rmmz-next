import type { BillboardOptions } from './billboard'
import { Container3D } from '@pixi/3d'
import { loadPixelTexture } from '../../utils/texture'
import { createBillboard } from './billboard'

const WIDTH = 153 * 0.015
const HEIGHT = 162 * 0.015

type TreeItem = Omit<BillboardOptions, 'width' | 'height'>

export async function createTrees(): Promise<Container3D> {
  const [tree1, tree2] = await Promise.all([
    loadPixelTexture('object/tree_1.png'),
    loadPixelTexture('object/tree_2.png'),
  ])

  const group = new Container3D({ label: '树木' })
  const items: TreeItem[] = [
    { position: [1.5, 1.2, -0.95], rotationY: -0.55, texture: tree1, metalness: 0.5 },
    { position: [0.5, 1.2, -1.6], rotationY: -0.25, texture: tree2, metalness: 0 },
    { position: [-2.0, 1.2, -0.75], rotationY: 0.55, texture: tree1, metalness: 1 },
    { position: [-2.5, 1.2, -0.9], rotationY: 0.85, texture: tree2, metalness: 0 },
    { position: [3.2, 1.2, -1.5], rotationY: -0.7, texture: tree2, metalness: 0.3 },
    { position: [-3.4, 1.2, 0.4], rotationY: 0.75, texture: tree1, metalness: 0.4 },
    { position: [3.4, 1.2, 0.6], rotationY: -0.65, texture: tree1, metalness: 0.4 },
  ]

  for (const item of items)
    group.addChild(createBillboard({ ...item, width: WIDTH, height: HEIGHT }))

  return group
}
