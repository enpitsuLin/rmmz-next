import type { Point } from '../primitives/geometry'
import { Container } from 'pixi.js'
import { Graphics, Input, TouchInput } from 'rmmz-next'
import { approach, clamp, uiLayout } from '../primitives/ui'
import { sprite } from './uiSprites'

export class Sprite_NightwardStick extends Container {
  private ring = sprite('ring')
  private knob = sprite('knob')
  private stickOrigin?: Point
  private delta = { x: 0, z: 0 }
  private blocked = true
  private touchAlpha = 0
  private touchSource = false
  private onPointerDown = (event: PointerEvent): void => {
    this.touchSource = event.pointerType !== 'mouse'
  }

  constructor() {
    super({ eventMode: 'none' })
    this.ring.anchor.set(0.5)
    this.knob.anchor.set(0.5)
    this.addChild(this.ring, this.knob)
    Graphics.app.canvas.addEventListener('pointerdown', this.onPointerDown)
  }

  blockPointer(): void {
    this.blocked = true
    this.stickOrigin = undefined
  }

  movement(bandBottom: number): Point {
    let x = Number(Input.isPressed('right')) - Number(Input.isPressed('left'))
    let z = Number(Input.isPressed('down')) - Number(Input.isPressed('up'))
    const pad = [...navigator.getGamepads()].find(pad => pad?.connected)
    if (pad && !x && !z) {
      const px = pad.axes[0] ?? 0
      const pz = pad.axes[1] ?? 0
      const length = Math.hypot(px, pz)
      if (length > 0.2) {
        const strength = Math.min(1, (length - 0.2) / 0.8) / length
        x = px * strength
        z = pz * strength
      }
    }
    if (!TouchInput.isPressed()) {
      this.stickOrigin = undefined
      this.blocked = false
    }
    if (this.touchSource && !this.blocked && TouchInput.isTriggered() && TouchInput.y > bandBottom)
      this.stickOrigin = { x: TouchInput.x, z: TouchInput.y }
    if (this.stickOrigin && TouchInput.isPressed()) {
      const limit = 22 * uiLayout().unit
      let dx = TouchInput.x - this.stickOrigin.x
      let dz = TouchInput.y - this.stickOrigin.z
      let length = Math.hypot(dx, dz)
      if (length > limit * 1.6) {
        const k = (length - limit * 1.6) / length
        this.stickOrigin.x += dx * k
        this.stickOrigin.z += dz * k
        dx = TouchInput.x - this.stickOrigin.x
        dz = TouchInput.y - this.stickOrigin.z
        length = Math.hypot(dx, dz)
      }
      this.delta = { x: dx, z: dz }
      const strength = clamp(length / limit)
      const gain = strength < 0.12 ? 0 : (strength - 0.12) / 0.88 / (length || 1)
      if (!x && !z) {
        x = dx * gain
        z = dz * gain
      }
      this.position.set(this.stickOrigin.x, this.stickOrigin.z)
    }
    return { x, z }
  }

  tick(active: boolean, dt: number): void {
    const u = uiLayout().unit
    this.touchAlpha = approach(this.touchAlpha, this.stickOrigin && active ? 1 : 0, this.stickOrigin ? 20 : 8, dt)
    this.alpha = this.touchAlpha
    const limit = 22 * u
    const length = Math.hypot(this.delta.x, this.delta.z)
    const strength = length > limit ? limit / length : 1
    this.ring.scale.set(u * (0.85 + 0.15 * this.touchAlpha))
    this.knob.scale.set(u)
    this.knob.position.set(Math.round(this.delta.x * strength), Math.round(this.delta.z * strength))
  }

  override destroy(options?: Parameters<Container['destroy']>[0]): void {
    Graphics.app.canvas.removeEventListener('pointerdown', this.onPointerDown)
    super.destroy(options)
  }
}
