import { Material3D, Mesh3D, PlaneGeometry } from '@pixi/3d'
import { Matrix } from 'pixi.js'
import { TILE_UNIT } from '../../constants'
import { loadPixelTexture } from '../../utils/texture'

const GROUND_MARGIN = 4

export async function createGround(mapWidth: number, mapHeight: number): Promise<Mesh3D> {
  const [grass, grassNormal] = await Promise.all([
    loadPixelTexture('ground/grass.png'),
    loadPixelTexture('ground/grass_normal.png'),
  ])
  grass.source.style.addressMode = 'repeat'
  grassNormal.source.style.addressMode = 'repeat'

  const width = Math.max(8, mapWidth * TILE_UNIT + GROUND_MARGIN)
  const height = Math.max(8, mapHeight * TILE_UNIT + GROUND_MARGIN)
  const repeatX = (width / 8) * 5
  const repeatY = (height / 8) * 5

  return new Mesh3D({
    geometry: new PlaneGeometry({ width, height, flipV: true }),
    material: new Material3D({
      baseColorTexture: grass,
      normalTexture: grassNormal,
      normalScale: 0.45,
      uvTransform: new Matrix().scale(repeatX, repeatY),
      roughness: 1,
    }),
    rotation: { x: -Math.PI / 2, y: 0, z: 0 },
    castShadow: false,
    receiveShadow: true,
  })
}
