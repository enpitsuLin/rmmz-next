import type * as PIXI from 'pixi.js'
import { GlobalMananger } from '../managers/GlobalManager'
import { Bitmap } from '../primitives/Bitmap'
import { Sprite } from '../primitives/Sprite'

/**
 * Sprite_Destination
 *
 * The sprite for displaying the destination place of the touch input.
 */
export class Sprite_Destination extends Sprite {
  _frameCount: number
  constructor() {
    super()
    this.createBitmap()
    this._frameCount = 0
  }

  destroy(options?: PIXI.IDestroyOptions): void {
    if (this.bitmap) {
      this.bitmap.destroy()
    }
    super.destroy(options)
  }

  update(): void {
    super.update()
    if (GlobalMananger.$gameTemp.isDestinationValid()) {
      this.updatePosition()
      this.updateAnimation()
      this.visible = true
    }
    else {
      this._frameCount = 0
      this.visible = false
    }
  }

  createBitmap(): void {
    const tileWidth = GlobalMananger.$gameMap.tileWidth()
    const tileHeight = GlobalMananger.$gameMap.tileHeight()
    this.bitmap = new Bitmap(tileWidth, tileHeight)
    this.bitmap.fillAll('white')
    this.anchor.x = 0.5
    this.anchor.y = 0.5
    this.blendMode = 1
  }

  updatePosition(): void {
    const tileWidth = GlobalMananger.$gameMap.tileWidth()
    const tileHeight = GlobalMananger.$gameMap.tileHeight()
    const x = GlobalMananger.$gameTemp.destinationX()!
    const y = GlobalMananger.$gameTemp.destinationY()!
    this.x = (GlobalMananger.$gameMap.adjustX(x) + 0.5) * tileWidth
    this.y = (GlobalMananger.$gameMap.adjustY(y) + 0.5) * tileHeight
  }

  updateAnimation(): void {
    this._frameCount++
    this._frameCount %= 20
    this.opacity = (20 - this._frameCount) * 6
    this.scale.x = 1 + this._frameCount / 20
    this.scale.y = this.scale.x
  }
}
