import { Container3D, PointLight } from '@pixi/3d'
import { loadPixelTexture } from '../../utils/texture'
import { createBillboard } from './billboard'

export interface StreetLightProp {
  object: Container3D
  spriteLight: PointLight
  lampSwing: { sway: Container3D, lamp: Container3D }
}

export async function createStreetLight(x = -0.65, z = 0.65, rotationY = 0.1): Promise<StreetLightProp> {
  const [pillar, chain1, chain2, lampOn] = await Promise.all([
    loadPixelTexture('object/pillar.png'),
    loadPixelTexture('object/chain_1.png'),
    loadPixelTexture('object/chain_2.png'),
    loadPixelTexture('object/lamp_on.png'),
  ])

  const group = new Container3D({ label: '路灯', position: { x, y: 0.735, z } })
  group.rotation.y = rotationY

  const sway = new Container3D({ position: { x: 0.24, y: 0.49, z: 0 } })
  const lamp = new Container3D({ position: { x: 0, y: -0.18, z: 0.009 } })
  group.addChild(
    createBillboard({ texture: pillar, width: 45 * 0.015, height: 97 * 0.015, position: [0, 0, 0], metalness: 0.9 }),
    createBillboard({
      texture: chain1,
      width: 3 * 0.013,
      height: 3 * 0.015,
      position: [0.24, 0.57, 0],
      material: 'lambert',
      castShadow: false,
    }),
    sway,
  )
  sway.addChild(
    createBillboard({ texture: chain2, width: 3 * 0.013, height: 9 * 0.015, position: [0, 0, 0], material: 'lambert', castShadow: false }),
    lamp,
  )

  const pool = new PointLight({
    color: 0xFFBB4C,
    intensity: 14,
    range: 2.6,
    decay: 0.15,
    position: { x: -0.1, y: 0, z: 0.159 },
    castShadow: true,
    shadow: { bias: 0.00015 },
  })
  const fill = new PointLight({
    color: 0xFFD39B,
    intensity: 2.8,
    range: 14,
    decay: 1.35,
    position: { x: -0.1, y: 0, z: 1 },
  })
  lamp.addChild(
    createBillboard({
      texture: lampOn,
      width: 13 * 0.0135,
      height: 18 * 0.0135,
      position: [0, 0, 0],
      metalness: 1,
      emissive: { color: 0xFFC484, texture: lampOn, strength: 0.45 },
      castShadow: false,
    }),
    pool,
    fill,
  )

  return {
    object: group,
    spriteLight: fill,
    lampSwing: { sway, lamp },
  }
}
