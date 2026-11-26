import type { PointLight, SpotLight } from '@pixi/3d'
import { Vector3 } from '@pixi/3d'

export type DynamicSpriteLight = PointLight | SpotLight

const lightPosition = new Vector3()

export function tintSprite(position: Vector3, lights: readonly DynamicSpriteLight[]): [number, number, number] {
  let red = 0.79
  let green = 0.63
  let blue = 0.54

  for (const light of lights) {
    if (!light.visible || light.intensity <= 0)
      continue
    const distance = light.getGlobalPosition(lightPosition).distanceTo(position)
    const falloff = Math.max(0, 1 - distance / (light.range || 4))
    const strength = 0.3 * Math.min(light.intensity / 10, 1) * falloff ** 2
    red += light.color.red * strength
    green += light.color.green * strength
    blue += light.color.blue * strength
  }

  return [Math.min(red, 1), Math.min(green, 1), Math.min(blue, 1)]
}
