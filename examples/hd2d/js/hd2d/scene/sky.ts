import type { View3D } from '@pixi/3d'
import { equirectToCube, parseRadianceHdr } from '@pixi/3d'
import { hd2dAssetUrl } from '../constants'

type SkyEnvironment = ReturnType<typeof equirectToCube>

const SKY_ROTATION_Y = -Math.PI * 0.095

let cachedEnvironment: Promise<SkyEnvironment> | null = null

async function loadSkyboxEnvironment(): Promise<SkyEnvironment> {
  const response = await fetch(hd2dAssetUrl('skybox.hdr'))
  if (!response.ok)
    throw new Error(`Failed to load skybox: ${response.status}`)

  const panorama = parseRadianceHdr(await response.arrayBuffer())
  const { width, height, data } = panorama
  const stride = width * 3
  const shift = Math.round((-SKY_ROTATION_Y * width) / (2 * Math.PI)) * 3
  const wrapped = new Float32Array(shift)

  // Horizontal wrap preserves matching yaw for both sky background and IBL lighting.
  for (let y = 0; y < height; y++) {
    const start = y * stride
    const end = start + stride
    wrapped.set(data.subarray(end - shift, end))
    data.copyWithin(start + shift, start, end - shift)
    data.set(wrapped, start)
  }

  return equirectToCube(panorama, 512, 'skybox')
}

export async function applySkybox(view: View3D): Promise<void> {
  cachedEnvironment ??= loadSkyboxEnvironment()
  const environment = await cachedEnvironment
  view.background = environment
  view.environment = environment
}
