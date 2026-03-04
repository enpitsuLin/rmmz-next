import type { Bitmap } from './Bitmap'
import * as PIXI from 'pixi.js'
import { Point } from './Point'
import { Rectangle } from './Rectangle'

/**
 * The sprite object for a tiling image.
 *
 * @class
 * @extends PIXI.TilingSprite
 * @param {Bitmap} bitmap - The image for the tiling sprite.
 */
export class TilingSprite extends PIXI.TilingSprite {
  _bitmap?: Bitmap
  _frame: Rectangle

  /**
   * The origin point of the tiling sprite for scrolling.
   */
  origin: Point

  constructor(bitmap?: Bitmap) {
    if (!TilingSprite._emptyBaseTexture) {
      TilingSprite._emptyBaseTexture = new PIXI.BaseTexture()
      TilingSprite._emptyBaseTexture.setSize(1, 1)
    }
    const frame = new Rectangle()
    const texture = new PIXI.Texture(TilingSprite._emptyBaseTexture, frame)
    super(texture)
    this._bitmap = bitmap
    this._width = 0
    this._height = 0
    this._frame = frame

    this.origin = new Point()

    this._onBitmapChange()
  }

  static _emptyBaseTexture: PIXI.BaseTexture | null = null

  /**
   * The image for the tiling sprite.
   *
   * @type Bitmap
   * @name TilingSprite#bitmap
   */
  get bitmap() {
    return this._bitmap
  }

  set bitmap(value) {
    if (this._bitmap !== value) {
      this._bitmap = value
      this._onBitmapChange()
    }
  }

  /**
   * The opacity of the tiling sprite (0 to 255).
   *
   * @type number
   * @name TilingSprite#opacity
   */
  get opacity() {
    return this.alpha * 255
  }

  set opacity(value) {
    this.alpha = value.clamp(0, 255) / 255
  }

  /**
   * Destroys the tiling sprite.
   */
  destroy(options = { children: true, texture: true }) {
    super.destroy(options)
  }

  /**
   * Updates the tiling sprite for each frame.
   */
  update() {
    for (const child of this.children) {
      if (child.update) {
        child.update()
      }
    }
  }

  /**
   * Sets the x, y, width, and height all at once.
   *
   * @param x - The x coordinate of the tiling sprite.
   * @param y - The y coordinate of the tiling sprite.
   * @param width - The width of the tiling sprite.
   * @param height - The height of the tiling sprite.
   */
  move(x = 0, y = 0, width = 0, height = 0) {
    this.x = x
    this.y = y
    this._width = width
    this._height = height
  }

  /**
   * Specifies the region of the image that the tiling sprite will use.
   *
   * @param x - The x coordinate of the frame.
   * @param y - The y coordinate of the frame.
   * @param width - The width of the frame.
   * @param height - The height of the frame.
   */
  setFrame(x: number, y: number, width: number, height: number) {
    this._frame.x = x
    this._frame.y = y
    this._frame.width = width
    this._frame.height = height
    this._refresh()
  }

  /**
   * Updates the transform on all children of this container for rendering.
   */
  updateTransform() {
    this.tilePosition.x = Math.round(-this.origin.x)
    this.tilePosition.y = Math.round(-this.origin.y)
    super.updateTransform()
  }

  _onBitmapChange() {
    if (this._bitmap) {
      this._bitmap.addLoadListener(this._onBitmapLoad.bind(this))
    }
    else {
      this.texture.frame = new Rectangle()
    }
  }

  _onBitmapLoad() {
    this.texture.baseTexture = this._bitmap!.baseTexture
    this._refresh()
  }

  _refresh() {
    const texture = this.texture
    const frame = this._frame.clone()
    if (frame.width === 0 && frame.height === 0 && this._bitmap) {
      frame.width = this._bitmap.width
      frame.height = this._bitmap.height
    }
    if (texture) {
      if (texture.baseTexture) {
        try {
          texture.frame = frame
        }
        catch (e) {
          texture.frame = new Rectangle()
        }
      }
      texture._updateID++
    }
  }
}
