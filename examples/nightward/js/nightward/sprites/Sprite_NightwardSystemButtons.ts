import { Container } from 'pixi.js'
import { NightwardAssetManager } from '../managers/NightwardAssetManager'
import { NightwardConfig } from '../patches/ConfigManager'
import { toggleFullscreen } from '../patches/Graphics'
import { back, phase, reducedMotion } from '../primitives/ui'
import { Window_NightwardSelectable } from '../windows/Window_NightwardSelectable'
import { Sprite_NightwardButton } from './Sprite_NightwardButton'

export class Sprite_NightwardSystemButtons extends Container {
  readonly buttons: Sprite_NightwardButton[]
  private nativeWindow: Window_NightwardSelectable

  constructor() {
    super()
    const ui = NightwardAssetManager.assets().ui
    const mute = new Sprite_NightwardButton(ui.speakerOn!, 15, 15, null)
    mute.onActivate = () => NightwardConfig.toggleNightwardMute()
    this.buttons = [mute]
    if (document.fullscreenEnabled) {
      const full = new Sprite_NightwardButton(ui.fullscreenEnter!, 15, 15, 'cursor')
      full.onActivate = toggleFullscreen
      this.buttons.push(full)
    }
    this.nativeWindow = new Window_NightwardSelectable(34, 15)
    this.nativeWindow.pointerOnly = true
    this.nativeWindow.choices = this.buttons
    this.nativeWindow._clientArea!.addChild(...this.buttons)
    this.addChild(this.nativeWindow)
  }

  layout(tap: number): number {
    this.buttons.forEach((button, i) => {
      button.x = i * Math.max(19, tap)
      button.setSize(15, 15, tap)
    })
    const width = 15 + (this.buttons.length - 1) * Math.max(19, tap)
    this.nativeWindow.move(0, 0, width, 15)
    return width
  }

  tick(dt: number, live: boolean, age = Infinity): void {
    const ui = NightwardAssetManager.assets().ui
    this.buttons[0]!.glyph!.texture = ui[NightwardConfig.nightwardMuted ? 'speakerOff' : 'speakerOn']!
    if (this.buttons[1])
      this.buttons[1].glyph!.texture = ui[document.fullscreenElement ? 'fullscreenExit' : 'fullscreenEnter']!
    this.nativeWindow.setLive(live && age >= 0)
    this.nativeWindow.update()
    this.buttons.forEach((button, i) => {
      button.tick(dt, live && age >= 0)
      button.motion.pivot.set(7.5)
      button.motion.position.set(7.5)
      button.motion.alpha = phase(age, i * 0.06, 0.3)
      button.motion.scale.set(reducedMotion() ? 1 : 0.6 + 0.4 * back(phase(age, i * 0.06, 0.3), 3))
    })
  }
}
