import type { PointLight } from '@pixi/3d'
import { Vector3 } from '@pixi/3d'

const lightPosition = new Vector3()

export function tintSprite(position: Vector3, lights: readonly PointLight[]): [number, number, number] {
  let red = 0.79
  let green = 0.63
  let blue = 0.54

  for (const light of lights) {
    const distance = light.getGlobalPosition(lightPosition).distanceTo(position)
    const falloff = Math.max(0, 1 - distance / (light.range || 4))
    const strength = 0.3 * Math.min(light.intensity / 10, 1) * falloff ** 2
    red += light.color.red * strength
    green += light.color.green * strength
    blue += light.color.blue * strength
  }

  return [Math.min(red, 1), Math.min(green, 1), Math.min(blue, 1)]
}
