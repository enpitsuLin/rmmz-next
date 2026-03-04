import * as PIXI from 'pixi.js'

/** Options for destroying the screen sprite (compatible with PIXI.Container destroy). */
export interface ScreenSpriteDestroyOptions {
  children?: boolean
  texture?: boolean
}

/**
 * The sprite which covers the entire game screen.
 *
 * @class
 * @extends PIXI.Container
 */
export class ScreenSprite extends PIXI.Container {
  private _graphics: PIXI.Graphics
  private _red: number
  private _green: number
  private _blue: number

  constructor() {
    super()
    this._graphics = new PIXI.Graphics()
    this.addChild(this._graphics)
    this.opacity = 0
    this._red = -1
    this._green = -1
    this._blue = -1
    this.setBlack()
  }

  /**
   * The opacity of the sprite (0 to 255).
   *
   * @type number
   * @name ScreenSprite#opacity
   */
  get opacity(): number {
    return this.alpha * 255
  }

  set opacity(value: number) {
    this.alpha = value.clamp(0, 255) / 255
  }

  /**
   * Destroys the screen sprite.
   */
  destroy(options: ScreenSpriteDestroyOptions = { children: true, texture: true }): void {
    super.destroy(options)
  }

  /**
   * Sets black to the color of the screen sprite.
   */
  setBlack(): void {
    this.setColor(0, 0, 0)
  }

  /**
   * Sets white to the color of the screen sprite.
   */
  setWhite(): void {
    this.setColor(255, 255, 255)
  }

  /**
   * Sets the color of the screen sprite by values.
   *
   * @param r - The red value in the range (0, 255).
   * @param g - The green value in the range (0, 255).
   * @param b - The blue value in the range (0, 255).
   */
  setColor(r: number, g: number, b: number): void {
    if (this._red !== r || this._green !== g || this._blue !== b) {
      const red = Math.round(r ?? 0).clamp(0, 255)
      const green = Math.round(g ?? 0).clamp(0, 255)
      const blue = Math.round(b ?? 0).clamp(0, 255)
      this._red = red
      this._green = green
      this._blue = blue
      const graphics = this._graphics
      graphics.clear()
      graphics.beginFill((red << 16) | (green << 8) | blue, 1)
      graphics.drawRect(-50000, -50000, 100000, 100000)
    }
  }
}
