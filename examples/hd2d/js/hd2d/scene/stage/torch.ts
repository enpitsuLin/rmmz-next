import type { AnimatedSprite } from '../animatedSprite'
import { Container3D, Material3D, PointLight } from '@pixi/3d'
import { loadPixelTexture } from '../../utils/texture'
import { createAnimatedSprite } from '../animatedSprite'
import { createBillboard } from './billboard'

const BASE_INTENSITY = 12

export interface TorchProp {
  object: Container3D
  spriteLight: PointLight
  sprites: AnimatedSprite[]
  lightFlicker: { light: PointLight, baseIntensity: number, origin: { x: number, y: number } }
}

export async function createTorch(x = 1.3, z = -0.65, rotationY = -0.35): Promise<TorchProp> {
  const [base, flame] = await Promise.all([
    loadPixelTexture('object/torch/base.png'),
    createAnimatedSprite({
      image: 'object/torch/fire.png',
      atlas: 'object/torch/atlas.json',
      definitions: { fireIdle: '0-23' },
      animation: 'fireIdle',
      fps: 20,
      castShadow: true,
      material: new Material3D({
        doubleSided: true,
        metallic: 1,
        roughness: 1,
        emissive: { color: 0xFFBB4C, strength: 0.2 },
      }),
    }),
  ])

  const group = new Container3D({ label: '火把', position: { x, y: 0.75, z } })
  group.rotation.y = rotationY
  flame.sprite.position.set(-0.02, 0.2, 0.001)

  const light = new PointLight({
    color: 0xFFBB4C,
    intensity: BASE_INTENSITY,
    range: 2.6,
    decay: 0.15,
    castShadow: true,
    shadow: { bias: 0.00015 },
  })
  light.position.set(0.16, 0.3, 0.301)
  group.addChild(
    createBillboard({ texture: base, width: 0.08, height: 0.24, position: [0, 0, 0], metalness: 0.35 }),
    flame.sprite,
    light,
  )

  return {
    object: group,
    spriteLight: light,
    sprites: [flame],
    lightFlicker: { light, baseIntensity: BASE_INTENSITY, origin: { x: 0.16, y: 0.3 } },
  }
}
