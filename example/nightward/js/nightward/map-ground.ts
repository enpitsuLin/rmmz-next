import type { View3D } from '@pixi/3d'
import type { Bitmap } from 'rmmz-next'
import type { MZ } from 'rmmz-next/database-types'
import { Material3D, Mesh3D, Plane, PlaneGeometry, Vector3 } from '@pixi/3d'
import { RenderTexture } from 'pixi.js'
import { GlobalMananger as globals, Graphics, ImageManager, Tilemap } from 'rmmz-next'
import { refreshDirtEdges } from '../../scripts/ground-tileset.mjs'

export function groundBitmaps(tileset: MZ.Tileset): { albedo: Bitmap[], normal: Bitmap[] } {
  const normals = JSON.parse(tileset.note.match(/<normalTilesets:([^>]+)>/)?.[1] ?? '{}') as Record<number, string>
  return {
    albedo: tileset.tilesetNames.map(name => ImageManager.loadTileset(name)),
    normal: tileset.tilesetNames.map((_, index) => ImageManager.loadTileset(normals[index] ?? '')),
  }
}

export class MapGround {
  readonly tilemap = new Tilemap()
  readonly normalTilemap = new Tilemap()
  readonly texture = RenderTexture.create({ width: 1, height: 1, scaleMode: 'nearest' })
  readonly normalTexture = RenderTexture.create({ width: 1, height: 1, scaleMode: 'linear' })
  readonly mesh = new Mesh3D({
    geometry: new PlaneGeometry({ flipV: true }),
    material: new Material3D({ baseColorTexture: this.texture, normalTexture: this.normalTexture, roughness: 0.92, alphaMode: 'mask' }),
    castShadow: false,
    receiveShadow: true,
  })

  private plane = new Plane(new Vector3(0, 1, 0), 0)
  private region = ''
  private frame = -1
  private tilesetId = -1
  private bitmaps!: ReturnType<typeof groundBitmaps>

  constructor(private view: View3D, private center: number) {
    const map = globals.$gameMap
    refreshDirtEdges({ width: map.width(), height: map.height(), data: map.data() }, center)
    for (const tilemap of [this.tilemap, this.normalTilemap]) {
      tilemap.tileWidth = map.tileWidth()
      tilemap.tileHeight = map.tileHeight()
      tilemap.setData(map.width(), map.height(), map.data())
      tilemap.horizontalWrap = map.isLoopHorizontal()
      tilemap.verticalWrap = map.isLoopVertical()
    }
    // Map shadows darken albedo, but must not change normal vectors.
    const normals = map.data().slice()
    normals.fill(0, map.width() * map.height() * 4, map.width() * map.height() * 5)
    this.normalTilemap.setData(map.width(), map.height(), normals)
    this.mesh.rotation.x = -Math.PI / 2
    view.root.addChild(this.mesh)
  }

  update(animate: boolean): void {
    const map = globals.$gameMap
    if (this.tilesetId !== map.tilesetId()) {
      this.bitmaps = groundBitmaps(map.tileset())
      for (const [index, tilemap] of [this.tilemap, this.normalTilemap].entries()) {
        tilemap.setBitmaps(index ? this.bitmaps.normal : this.bitmaps.albedo)
        tilemap.flags = map.tilesetFlags()
      }
      this.tilesetId = map.tilesetId()
      this.region = ''
    }
    if (!this.tilemap.isReady() || !this.normalTilemap.isReady())
      return
    if (animate)
      this.tilemap.update()
    const corners = [{ x: 0, y: 0 }, { x: this.view.width, y: 0 }, { x: 0, y: this.view.height }, { x: this.view.width, y: this.view.height }]
    const points = corners.map(corner => this.view.screenToWorld(this.view.toGlobal(corner), this.plane))
    if (points.some(point => !point))
      return
    const xs = points.map(point => point!.x + this.center + 0.5)
    const ys = points.map(point => point!.z + this.center + 0.5)
    // Cache the visible native map in eight-tile blocks, rather than a map-sized texture.
    const x = Math.floor(Math.min(...xs) / 8) * 8
    const y = Math.floor(Math.min(...ys) / 8) * 8
    const width = (Math.ceil((Math.max(...xs) - Math.min(...xs)) / 8) + 1) * 8
    const height = (Math.ceil((Math.max(...ys) - Math.min(...ys)) / 8) + 1) * 8
    const region = `${x},${y},${width},${height}`
    if (this.region === region && this.frame === this.tilemap.animationFrame && !this.tilemap._needsRepaint)
      return
    const pixelWidth = width * this.tilemap.tileWidth
    const pixelHeight = height * this.tilemap.tileHeight
    if (this.texture.width !== pixelWidth || this.texture.height !== pixelHeight) {
      this.texture.resize(pixelWidth, pixelHeight)
      this.normalTexture.resize(pixelWidth, pixelHeight)
    }
    for (const tilemap of [this.tilemap, this.normalTilemap]) {
      tilemap.width = pixelWidth
      tilemap.height = pixelHeight
      tilemap.scrollOrigin.set(x * tilemap.tileWidth, y * tilemap.tileHeight)
      tilemap.animationFrame = this.tilemap.animationFrame
    }
    // Native Tilemaps share the renderer's tileset atlas; switch it for each pass.
    this.tilemap.setBitmaps(this.bitmaps.albedo)
    Graphics.app.renderer.render({ container: this.tilemap, target: this.texture, clear: true })
    this.normalTilemap.setBitmaps(this.bitmaps.normal)
    Graphics.app.renderer.render({ container: this.normalTilemap, target: this.normalTexture, clear: true, clearColor: [0.5, 0.5, 1, 1] })
    this.mesh.scale.set(width, height, 1)
    this.mesh.position.set(x + width / 2 - this.center - 0.5, 0, y + height / 2 - this.center - 0.5)
    this.region = region
    this.frame = this.tilemap.animationFrame
  }

  destroy(): void {
    this.mesh.destroy({ geometry: true, material: true })
    this.tilemap.destroy({ children: true })
    this.normalTilemap.destroy({ children: true })
    this.texture.destroy(true)
    this.normalTexture.destroy(true)
  }
}
