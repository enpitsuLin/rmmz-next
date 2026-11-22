import type { Sprite_NightwardButton } from '../sprites/Sprite_NightwardButton'
import { Container } from 'pixi.js'
import { Input } from 'rmmz-next'
import { approach, FRAME_DT, phase, reducedMotion, uiLayout } from '../primitives/ui'
import { Window_NightwardSelectable } from './Window_NightwardSelectable'

/**
 * Base class for full-viewport Nightward UI windows.
 * Directly extends Window_NightwardSelectable (a real RMMZ Window_Selectable)
 * so every screen lives cleanly inside Scene_Base._windowLayer and updates via update().
 */
export abstract class Window_NightwardScreen extends Window_NightwardSelectable {
  // Scene start can render before the first update applies animation states.
  readonly content = new Container({ alpha: 0 })
  readonly buttons: Sprite_NightwardButton[] = []
  age = 0
  live = true
  inputBlocked = false
  focused?: Sprite_NightwardButton
  dimmed = false
  protected layout = uiLayout()
  protected closingAge = -1
  private closeDuration = 0.2
  private closeDone?: () => void
  private dim = 1

  constructor() {
    const layout = uiLayout()
    super(layout.w, layout.h)
    this.eventMode = 'passive'
    this.layout = layout
    this.choices = this.buttons
    this.onSelection = (choice) => {
      this.focused = choice as Sprite_NightwardButton | undefined
    }
    this._clientArea!.addChild(this.content)
    this.scale.set(this.layout.unit)
  }

  protected addButton(button: Sprite_NightwardButton, row = this.buttons.length, col = 0, parent = this.content): Sprite_NightwardButton {
    button.row = row
    button.col = col
    parent.addChild(button)
    this.buttons.push(button)
    return button
  }

  focusButton(button: Sprite_NightwardButton, audible = false, keyed = true): void {
    const index = this.buttons.indexOf(button)
    if (audible && this.index() !== index)
      this.playCursorSound()
    this.focusChoice(index, keyed)
  }

  protected handleInput(): void {
    if (Input.isTriggered('pause') && this.isCancelEnabled()) {
      this.processCancel()
      return
    }
    super.update()
  }

  override update(): void {
    const dt = FRAME_DT
    this.age += dt
    this.dim = approach(this.dim, this.dimmed ? 0 : 1, 20, dt)
    this.content.alpha = this.dim
    if (this.closingAge >= 0) {
      this.closingAge += dt
      const p = phase(this.closingAge, 0, reducedMotion() ? 0.15 : this.closeDuration)
      this.content.alpha *= 1 - p ** 3
      this.content.y = reducedMotion() ? 0 : Math.round(p ** 3 * 8)
      if (p === 1) {
        const done = this.closeDone
        this.closeDone = undefined
        done?.()
        return
      }
    }
    this.animate(dt)
    if (this.destroyed)
      return
    const live = this.live && !this.inputBlocked && !this.dimmed && this.closingAge < 0 && this.accepting
    for (const button of this.buttons)
      button.tick(dt, live)
    this.setLive(live)
    if (live)
      this.handleInput()
  }

  get accepting(): boolean { return this.age >= 0.15 }

  closeWithAnimation(done: () => void, seconds = 0.2): void {
    this.live = false
    this.closingAge = 0
    this.closeDuration = seconds
    this.closeDone = done
  }

  protected abstract animate(dt: number): void
}
