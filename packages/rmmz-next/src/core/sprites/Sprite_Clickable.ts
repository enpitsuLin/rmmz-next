import type { Container } from 'pixi.js'
import { Point } from '../primitives/Point'
import { Rectangle } from '../primitives/Rectangle'
import { Sprite } from '../primitives/Sprite'
import { TouchInput } from '../primitives/TouchInput'

/**
 * Sprite_Clickable
 *
 * The sprite class with click handling functions.
 */
export class Sprite_Clickable extends Sprite {
  _pressed: boolean
  _hovered: boolean
  constructor() {
    super()
    this._pressed = false
    this._hovered = false
  }

  update(): void {
    super.update()
    this.processTouch()
  }

  processTouch(): void {
    if (this.isClickEnabled()) {
      if (this.isBeingTouched()) {
        if (!this._hovered && TouchInput.isHovered()) {
          this._hovered = true
          this.onMouseEnter()
        }
        if (TouchInput.isTriggered()) {
          this._pressed = true
          this.onPress()
        }
      }
      else {
        if (this._hovered) {
          this.onMouseExit()
        }
        this._pressed = false
        this._hovered = false
      }
      if (this._pressed && TouchInput.isReleased()) {
        this._pressed = false
        this.onClick()
      }
    }
    else {
      this._pressed = false
      this._hovered = false
    }
  }

  isPressed(): boolean {
    return this._pressed
  }

  isClickEnabled(): boolean {
    if (!this.visible) {
      return false
    }
    for (let object: Container | null = this.parent; object; object = object.parent) {
      if (!object.visible) {
        return false
      }
    }
    return true
  }

  isBeingTouched(): boolean {
    const touchPos = new Point(TouchInput.x, TouchInput.y)
    const localPos = this.toLocal(touchPos)
    return this.hitTest(localPos.x, localPos.y)
  }

  hitTest(x: number, y: number): boolean {
    const rect = new Rectangle(
      -this.anchor.x * this.width,
      -this.anchor.y * this.height,
      this.width,
      this.height,
    )
    return rect.contains(x, y)
  }

  onMouseEnter(): void {
    //
  }

  onMouseExit(): void {
    //
  }

  onPress(): void {
    //
  }

  onClick(): void {
    //
  }
}
