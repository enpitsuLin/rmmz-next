import type { Game_Picture } from '../objects/Game_Picture'
import { GlobalMananger } from '../managers/GlobalManager'
import { ImageManager } from '../managers/ImageManager'
import { Sprite_Clickable } from './Sprite_Clickable'

/**
 * Sprite_Picture
 *
 * The sprite for displaying a picture.
 */
export class Sprite_Picture extends Sprite_Clickable {
  _pictureId: number
  _pictureName: string
  constructor(pictureId: number) {
    super()
    this._pictureId = pictureId
    this._pictureName = ''
    this.update()
  }

  picture(): Game_Picture {
    return GlobalMananger.$gameScreen.picture(this._pictureId)
  }

  update(): void {
    super.update()
    this.updateBitmap()
    if (this.visible) {
      this.updateOrigin()
      this.updatePosition()
      this.updateScale()
      this.updateTone()
      this.updateOther()
    }
  }

  updateBitmap(): void {
    const picture = this.picture()
    if (picture) {
      const pictureName = picture.name()
      if (this._pictureName !== pictureName) {
        this._pictureName = pictureName
        this.loadBitmap()
      }
      this.visible = true
    }
    else {
      this._pictureName = ''
      this.bitmap = null
      this.visible = false
    }
  }

  updateOrigin(): void {
    const picture = this.picture()
    if (picture.origin() === 0) {
      this.anchor.x = 0
      this.anchor.y = 0
    }
    else {
      this.anchor.x = 0.5
      this.anchor.y = 0.5
    }
  }

  updatePosition(): void {
    const picture = this.picture()
    this.x = Math.round(picture.x())
    this.y = Math.round(picture.y())
  }

  updateScale(): void {
    const picture = this.picture()
    this.scale.x = picture.scaleX() / 100
    this.scale.y = picture.scaleY() / 100
  }

  updateTone(): void {
    const picture = this.picture()
    if (picture.tone()) {
      this.setColorTone(picture.tone()!)
    }
    else {
      this.setColorTone([0, 0, 0, 0])
    }
  }

  updateOther(): void {
    const picture = this.picture()
    this.opacity = picture.opacity()
    this.blendMode = picture.blendMode()
    this.rotation = (picture.angle() * Math.PI) / 180
  }

  loadBitmap(): void {
    this.bitmap = ImageManager.loadPicture(this._pictureName)
  }
}
