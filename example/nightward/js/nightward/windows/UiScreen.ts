import type { Sprite_NightwardButton } from '../sprites/Sprite_NightwardButton'
import { Container } from 'pixi.js'
import { Input } from 'rmmz-next'
import { approach, phase, reducedMotion, uiLayout } from '../primitives/ui'
import { Window_NightwardSelectable } from './Window_NightwardSelectable'

export abstract class UiScreen extends Container {
  // Scene start can render before the first tick applies animation states.
  readonly content = new Container({ alpha: 0 })
  readonly buttons: Sprite_NightwardButton[] = []
  readonly nativeWindow: Window_NightwardSelectable
  age = 0
  live = true
  inputBlocked = false
  focused?: Sprite_NightwardButton
  onBack?: () => void
  protected layout = uiLayout()
  protected closing = -1
  private closeDuration = 0.2
  private closeDone?: () => void
  private dim = 1
  dimmed = false
  constructor() {
    super({ eventMode: 'passive' })
    this.nativeWindow = new Window_NightwardSelectable(this.layout.w, this.layout.h)
    this.nativeWindow.choices = this.buttons
    this.nativeWindow.onSelection = (choice) => { this.focused = choice as Sprite_NightwardButton | undefined }
    this.nativeWindow._clientArea!.addChild(this.content)
    this.addChild(this.nativeWindow); this.scale.set(this.layout.unit)
  }

  protected addButton(button: Sprite_NightwardButton, row = this.buttons.length, col = 0, parent = this.content): Sprite_NightwardButton {
    button.row = row; button.col = col; parent.addChild(button); this.buttons.push(button)
    return button
  }

  focus(button: Sprite_NightwardButton, audible = false, keyed = true): void {
    const index = this.buttons.indexOf(button)
    if (audible && this.nativeWindow.index() !== index)
      this.nativeWindow.playCursorSound()
    this.nativeWindow.focusChoice(index, keyed)
  }

  protected handle(): void {
    if (Input.isTriggered('pause') && this.onBack) { this.nativeWindow.processCancel(); return }
    this.nativeWindow.update()
  }

  tick(dt: number): void {
    this.age += dt
    this.dim = approach(this.dim, this.dimmed ? 0 : 1, 20, dt)
    this.content.alpha = this.dim
    if (this.closing >= 0) {
      this.closing += dt
      const p = phase(this.closing, 0, reducedMotion() ? 0.15 : this.closeDuration)
      this.content.alpha *= 1 - p ** 3; this.content.y = reducedMotion() ? 0 : Math.round(p ** 3 * 8)
      if (p === 1) { const done = this.closeDone; this.closeDone = undefined; done?.(); return }
    }
    this.animate(dt)
    if (this.destroyed)
      return
    const live = this.live && !this.inputBlocked && !this.dimmed && this.closing < 0 && this.accepting
    for (const button of this.buttons) button.tick(dt, live)
    this.nativeWindow.onCancel = this.onBack
    this.nativeWindow.setLive(live)
    if (live)
      this.handle()
  }

  get accepting(): boolean { return this.age >= 0.15 }
  close(done: () => void, seconds = 0.2): void { this.live = false; this.closing = 0; this.closeDuration = seconds; this.closeDone = done }
  protected abstract animate(dt: number): void
}
