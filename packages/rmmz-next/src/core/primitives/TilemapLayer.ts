import type { TilemapAtlas } from './TilemapRenderer'
import * as PIXI from 'pixi.js'

/**
 * Internal class for the tilemap layer.
 *
 * @class
 * @extends PIXI.Container
 */
export class TilemapLayer extends PIXI.RenderContainer {
  _elements: [setNumber: number, sx: number, sy: number, dx: number, dy: number, w: number, h: number][] = []
  _indexBuffer: PIXI.Buffer | null = null
  _indexArray: Uint16Array | Uint32Array = new Uint16Array(0)
  _vertexBuffer: PIXI.Buffer | null = null
  _vertexArray = new Float32Array(0)
  _vao: PIXI.Geometry | null = null
  _needsVertexUpdate = false
  private atlas: TilemapAtlas | null = null
  _state = PIXI.State.for2d()

  constructor() {
    super({})
    this.addBounds = (bounds) => {
      for (const [, , , x, y, width, height] of this._elements) {
        bounds.addFrame(x, y, x + width, y + height)
      }
    }
    this._createVao()
  }

  static VERTEX_STRIDE = 9 * 4
  static MAX_SIZE = 16000

  destroy(options?: PIXI.DestroyOptions): void {
    this._vao?.destroy(true)
    this._indexBuffer = null
    this._vertexBuffer = null
    this._vao = null
    super.destroy(options)
  }

  setAtlas(atlas: TilemapAtlas): void {
    this.atlas = atlas
  }

  clear(): void {
    this._elements.length = 0
    this._needsVertexUpdate = true
    this.onViewUpdate()
  }

  size(): number {
    return this._elements.length
  }

  addRect(setNumber: number, sx: number, sy: number, dx: number, dy: number, w: number, h: number): void {
    this._elements.push([setNumber, sx, sy, dx, dy, w, h])
  }

  render(renderer: PIXI.WebGLRenderer): void {
    if (!this.atlas || this._elements.length === 0)
      return

    const tilemapRenderer = renderer.rpgtilemap
    tilemapRenderer.bindTextures(renderer, this.atlas)
    const shader = tilemapRenderer.getShader()
    const matrix = shader.resources.tilemapUniforms.uniforms.uProjectionMatrix
    const globals = renderer.globalUniforms.globalUniformData
    matrix.copyFrom(globals.projectionMatrix)
      .append(globals.worldTransformMatrix)
      .append(this.groupTransform)

    this._updateIndexBuffer()
    if (this._needsVertexUpdate) {
      this._updateVertexBuffer()
      this._needsVertexUpdate = false
    }

    renderer.encoder.draw({
      geometry: this._vao!,
      shader,
      state: this._state,
      size: this._elements.length * 6,
    })
  }

  isReady(): boolean {
    return !!this.atlas?.images.length
      && this.atlas.images.every(image => image.width > 0 && image.height > 0)
  }

  _createVao(): void {
    this._indexBuffer = new PIXI.Buffer({
      data: new Uint16Array(0),
      usage: PIXI.BufferUsage.INDEX | PIXI.BufferUsage.COPY_DST,
    })
    this._vertexBuffer = new PIXI.Buffer({
      data: new Float32Array(0),
      usage: PIXI.BufferUsage.VERTEX | PIXI.BufferUsage.COPY_DST,
    })
    const buffer = this._vertexBuffer
    const stride = TilemapLayer.VERTEX_STRIDE
    this._vao = new PIXI.Geometry({
      indexBuffer: this._indexBuffer,
      attributes: {
        aTextureId: { buffer, format: 'float32', stride, offset: 0 },
        aFrame: { buffer, format: 'float32x4', stride, offset: 4 },
        aSource: { buffer, format: 'float32x2', stride, offset: 5 * 4 },
        aDest: { buffer, format: 'float32x2', stride, offset: 7 * 4 },
      },
    })
  }

  _updateIndexBuffer(): void {
    const numElements = this._elements.length
    if (this._indexArray.length < numElements * 6) {
      this._indexArray = PIXI.createIndicesForQuads(numElements)
      this._indexBuffer!.data = this._indexArray
    }
  }

  _updateVertexBuffer(): void {
    const numElements = this._elements.length
    const required = numElements * TilemapLayer.VERTEX_STRIDE
    if (this._vertexArray.length < required) {
      this._vertexArray = new Float32Array(required * 2)
    }
    const vertexArray = this._vertexArray!
    let index = 0
    for (const item of this._elements) {
      const setNumber = item[0]
      const tid = setNumber >> 2
      const sxOffset = 1024 * (setNumber & 1)
      const syOffset = 1024 * ((setNumber >> 1) & 1)
      const sx = item[1] + sxOffset
      const sy = item[2] + syOffset
      const dx = item[3]
      const dy = item[4]
      const w = item[5]
      const h = item[6]
      const frameLeft = sx + 0.5
      const frameTop = sy + 0.5
      const frameRight = sx + w - 0.5
      const frameBottom = sy + h - 0.5
      vertexArray[index++] = tid
      vertexArray[index++] = frameLeft
      vertexArray[index++] = frameTop
      vertexArray[index++] = frameRight
      vertexArray[index++] = frameBottom
      vertexArray[index++] = sx
      vertexArray[index++] = sy
      vertexArray[index++] = dx
      vertexArray[index++] = dy
      vertexArray[index++] = tid
      vertexArray[index++] = frameLeft
      vertexArray[index++] = frameTop
      vertexArray[index++] = frameRight
      vertexArray[index++] = frameBottom
      vertexArray[index++] = sx + w
      vertexArray[index++] = sy
      vertexArray[index++] = dx + w
      vertexArray[index++] = dy
      vertexArray[index++] = tid
      vertexArray[index++] = frameLeft
      vertexArray[index++] = frameTop
      vertexArray[index++] = frameRight
      vertexArray[index++] = frameBottom
      vertexArray[index++] = sx + w
      vertexArray[index++] = sy + h
      vertexArray[index++] = dx + w
      vertexArray[index++] = dy + h
      vertexArray[index++] = tid
      vertexArray[index++] = frameLeft
      vertexArray[index++] = frameTop
      vertexArray[index++] = frameRight
      vertexArray[index++] = frameBottom
      vertexArray[index++] = sx
      vertexArray[index++] = sy + h
      vertexArray[index++] = dx
      vertexArray[index++] = dy + h
    }
    this._vertexBuffer!.data = vertexArray
    this._vertexBuffer!.update()
  }
}
