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
  override children!: PIXI.Sprite[]

  _bitmap?: Bitmap
  _frame: Rectangle

  /**
   * The origin point of the tiling sprite for scrolling.
   */
  scrollOrigin: Point

  constructor(bitmap?: Bitmap) {
    const frame = new Rectangle()
    const texture = new PIXI.Texture({ source: PIXI.Texture.EMPTY.source, frame, dynamic: true })
    super({ texture, width: 0, height: 0 })
    this.allowChildren = true
    this.onRender = this._prepareRender.bind(this)
    this._bitmap = bitmap
    this._frame = frame

    this.scrollOrigin = new Point()

    this._onBitmapChange()
  }

  /**
   * The image for the tiling sprite.
   *
   * @type Bitmap
   * @name TilingSprite#bitmap
   */
  get bitmap(): Bitmap {
    return this._bitmap!
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
  get opacity(): number {
    return this.alpha * 255
  }

  set opacity(value) {
    this.alpha = value.clamp(0, 255) / 255
  }

  /**
   * Destroys the tiling sprite.
   */
  destroy(options = { children: true, texture: true }): void {
    super.destroy(options)
  }

  /**
   * Updates the tiling sprite for each frame.
   */

  update(): void {
    for (const child of this.children) {
      if (child.update) {
        child.update()
      }
    }
  }

  /**
   * Sets the x, y, width, and height all at once.
   */
  move(x = 0, y = 0, width = 0, height = 0): void {
    this.x = x
    this.y = y
    this.width = width
    this.height = height
  }

  /**
   * Specifies the region of the image that the tiling sprite will use.
   */
  setFrame(x: number, y: number, width: number, height: number): void {
    this._frame.x = x
    this._frame.y = y
    this._frame.width = width
    this._frame.height = height
    this._refresh()
  }

  /**
   * Updates the transform on all children of this container for rendering.
   */
  _prepareRender(): void {
    this.tilePosition.x = Math.round(-this.scrollOrigin.x)
    this.tilePosition.y = Math.round(-this.scrollOrigin.y)
  }

  _onBitmapChange(): void {
    if (this._bitmap) {
      this._bitmap.addLoadListener(this._onBitmapLoad.bind(this))
    }
    else {
      this.texture.frame.copyFrom(new Rectangle())
      this.texture.update()
    }
  }

  _onBitmapLoad(): void {
    this.texture.source = this._bitmap!.baseTexture
    this._refresh()
  }

  _refresh(): void {
    const texture = this.texture
    const frame = this._frame.clone()
    if (frame.width === 0 && frame.height === 0 && this._bitmap) {
      frame.width = this._bitmap.width
      frame.height = this._bitmap.height
    }
    if (texture) {
      if (texture.source) {
        try {
          texture.frame.copyFrom(frame)
        }
        catch (e) {
          console.error(e)
          texture.frame.copyFrom(new Rectangle())
        }
      }
      texture.update()
    }
  }
}
