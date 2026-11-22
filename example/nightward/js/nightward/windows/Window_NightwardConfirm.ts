import type { Sprite_NightwardButton } from '../sprites/Sprite_NightwardButton'
import { Container } from 'pixi.js'
import { colors, out, phase, reducedMotion } from '../primitives/ui'
import { text } from '../sprites/Sprite_NightwardText'
import { Window_NightwardCommand } from './Window_NightwardCommand'

/**
 * Dedicated YES/NO confirmation window paired with Window_NightwardPause.
 * Uses standard RMMZ multi-window focus handoff (openPrompt / hidePrompt).
 */
export class Window_NightwardConfirm extends Window_NightwardCommand {
  private box = new Container()
  private yes: Sprite_NightwardButton
  private no: Sprite_NightwardButton
  private baseX = 0
  private baseY = 0
  private showAge = -1
  private hideAge = -1

  constructor() {
    super()
    this.yes = this.addCommand('YES', 'yes', 44, 22, 'ok', 0, 0, this.box)
    this.no = this.addCommand('NO', 'no', 44, 22, null, 0, 1, this.box)
    this.yes.showCursor = this.no.showCursor = false
    this.yes.position.set(27, 64)
    this.no.position.set(79, 64)
    this.box.addChild(
      text('Abandon this run?', 75, 16, 0, 0xFFFFFF, 0.5),
      text('Your progress', 75, 32, 0, colors.blue, 0.5),
      text('will be lost.', 75, 42, 0, colors.blue, 0.5),
    )
    this.content.addChild(this.box)
    this.box.alpha = 0
    this.visible = false
    this.live = false
  }

  placeAt(x: number, y: number): void {
    this.baseX = x
    this.baseY = y
    this.box.position.set(x, y)
  }

  openPrompt(): void {
    this.visible = true
    this.live = true
    this.age = 0.2
    this.box.alpha = 0
    this.showAge = 0
    this.hideAge = -1
    this.focusButton(this.no, false)
  }

  closePrompt(): void {
    this.live = false
    this.showAge = -1
    this.hideAge = 0
  }

  protected animate(dt: number): void {
    if (this.showAge >= 0) {
      this.showAge += dt
      this.box.alpha = phase(this.showAge, 0.15, 0.2)
      this.box.x = this.baseX + (reducedMotion() ? 0 : Math.round(12 * (1 - out(phase(this.showAge, 0.15, 0.2)))))
      this.box.y = this.baseY
    }
    if (this.hideAge >= 0) {
      this.hideAge += dt
      this.box.alpha = 1 - phase(this.hideAge, 0, 0.12)
      if (this.hideAge >= 0.4) {
        this.hideAge = -1
        this.visible = false
      }
    }
  }
}
