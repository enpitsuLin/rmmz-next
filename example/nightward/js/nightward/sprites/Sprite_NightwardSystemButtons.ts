import { Container } from 'pixi.js'
import { getAssets } from '../managers/NightwardAssetManager'
import { settings, toggleMute } from '../managers/NightwardConfigManager'
import { back, fullscreen, phase, reducedMotion } from '../primitives/ui'
import { Window_NightwardSelectable } from '../windows/Window_NightwardSelectable'
import { Sprite_NightwardButton } from './Sprite_NightwardButton'

export class Sprite_NightwardSystemButtons extends Container {
  readonly buttons: Sprite_NightwardButton[]
  private nativeWindow: Window_NightwardSelectable
  constructor() {
    super()
    const mute = new Sprite_NightwardButton(getAssets().ui.speakerOn!, 15, 15, null)
    mute.onActivate = toggleMute
    this.buttons = [mute]
    if (document.fullscreenEnabled) {
      const full = new Sprite_NightwardButton(getAssets().ui.fullscreenEnter!, 15, 15, 'Cursor')
      full.onActivate = fullscreen
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
    this.buttons[0]!.glyph!.texture = getAssets().ui[settings.muted ? 'speakerOff' : 'speakerOn']!
    if (this.buttons[1])
      this.buttons[1].glyph!.texture = getAssets().ui[document.fullscreenElement ? 'fullscreenExit' : 'fullscreenEnter']!
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
