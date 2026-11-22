import type { Texture } from 'pixi.js'
import type { WindowChoice } from '../windows/Window_NightwardSelectable'
import { Container, Rectangle, Sprite } from 'pixi.js'
import { SoundManager } from 'rmmz-next'
import { back, colors, out, phase, reducedMotion } from '../primitives/ui'
import { panel } from '../windows/panel'
import { Sprite_NightwardText } from './Sprite_NightwardText'
import { sprite } from './uiSprites'

export type ButtonCue = 'ok' | 'cancel' | 'cursor' | null

export class Sprite_NightwardButton extends Container implements WindowChoice {
  readonly motion = new Container()
  readonly body = new Container()
  readonly caption?: Sprite_NightwardText
  readonly glyph?: Sprite
  private frame = panel(1, 1)
  private glow = panel(1, 1, 'softRect')
  private cursorSprite = sprite('cursor')
  enabled = true
  focused = false
  selected = false
  keyed = true
  showCursor = true
  row = 0
  col = 0
  onActivate?: () => void
  onFocus?: () => void
  step?: (direction: number) => void
  private pressed = false
  private pressScale = 1
  private pressFrom = 1
  private pressTarget = 1
  private pressAge = 1
  private punchAge = 10
  private time = 0
  private buttonWidth = 0
  private buttonHeight = 0
  constructor(caption: string | Texture, width: number, height = 22, readonly cue: ButtonCue = 'ok') {
    super({ eventMode: 'static', cursor: 'pointer' })
    this.glow.tint = colors.lantern
    this.cursorSprite.anchor.set(1, 0.5)
    if (typeof caption === 'string') {
      this.caption = new Sprite_NightwardText(caption, 0, 0.5)
    }
    else {
      this.glyph = new Sprite(caption)
      this.glyph.anchor.set(0.5)
      this.showCursor = false
    }
    this.body.addChild(this.glow, this.frame)
    if (this.caption)
      this.body.addChild(this.caption)
    if (this.glyph)
      this.body.addChild(this.glyph)
    this.motion.addChild(this.cursorSprite, this.body)
    this.addChild(this.motion)
    this.setSize(width, height)
  }

  setSize(width: number, height: number, tap = 0): void {
    this.buttonWidth = width
    this.buttonHeight = height
    this.frame.width = width
    this.frame.height = height
    this.glow.position.set(-12, -12)
    this.glow.width = width + 24
    this.glow.height = height + 24
    this.body.pivot.set(width / 2, height / 2)
    this.body.position.copyFrom(this.body.pivot)
    this.caption?.position.set(Math.round(width / 2), Math.round((height - 7) / 2))
    this.glyph?.position.set(Math.round(width / 2), Math.round(height / 2))
    this.cursorSprite.y = Math.round(height / 2)
    this.hitArea = new Rectangle((width - Math.max(width, tap)) / 2, (height - Math.max(height, tap)) / 2, Math.max(width, tap), Math.max(height, tap))
  }

  get node(): Container { return this }
  get rect(): Rectangle { return this.hitArea as Rectangle }
  setPressed(pressed: boolean): void { this.pressed = pressed }
  activate(): void {
    if (this.enabled) {
      if (this.cue === 'ok')
        SoundManager.playOk()
      else if (this.cue === 'cancel')
        SoundManager.playCancel()
      else if (this.cue === 'cursor')
        SoundManager.playCursor()
      this.onActivate?.()
    }
  }

  focus(focused: boolean, keyed = true): void {
    if (focused && !this.focused) {
      this.time = 0
      this.onFocus?.()
    }
    this.focused = focused
    this.keyed = keyed
  }

  punch(): void { this.punchAge = 0 }
  tick(dt: number, live = true): void {
    this.time += dt
    this.punchAge += dt
    this.eventMode = live && this.enabled ? 'static' : 'none'
    const focused = this.focused && this.enabled
    const still = reducedMotion()
    this.frame.highlighted = focused || this.pressed || this.selected
    this.glow.visible = focused
    this.glow.alpha = still ? 0.5 : 0.475 - 0.125 * Math.cos(this.time * Math.PI / 1.3)
    this.cursorSprite.visible = focused && this.keyed && this.showCursor
    this.cursorSprite.x = still ? -5 : Math.round(-6 + Math.cos(this.time * Math.PI / 0.45))
    const target = this.pressed ? 0.94 : 1
    if (target !== this.pressTarget) {
      this.pressFrom = this.pressScale
      this.pressTarget = target
      this.pressAge = 0
    }
    this.pressAge += dt
    const pressP = phase(this.pressAge, 0, this.pressed ? 0.06 : 0.22)
    this.pressScale = this.pressFrom + (target - this.pressFrom) * (this.pressed ? out(pressP) : back(pressP, 3))
    let punch = 0
    if (this.punchAge < 0.08)
      punch = 0.08 * out(this.punchAge / 0.08)
    else if (this.punchAge < 0.26)
      punch = 0.08 * (1 - back((this.punchAge - 0.08) / 0.18, 3))
    this.body.scale.set(still ? 1 : this.pressScale + punch)
    this.body.alpha = this.enabled ? 1 : 0.45
    if (this.caption) {
      this.caption.font = this.selected ? 1 : 0
      this.caption.tint = this.enabled ? focused || this.selected ? 0xFFFFFF : colors.label : colors.edge
    }
  }

  get size(): { width: number, height: number } { return { width: this.buttonWidth, height: this.buttonHeight } }
}
