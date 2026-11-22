import type { Container } from 'pixi.js'
import type { ButtonCue } from '../sprites/Sprite_NightwardButton'
import { Sprite_NightwardButton } from '../sprites/Sprite_NightwardButton'
import { Window_NightwardScreen } from './Window_NightwardScreen'

/**
 * RMMZ Window_Command-style base for Nightward command menus.
 * Commands bind to symbolic handlers via setHandler(symbol, fn).
 */
export abstract class Window_NightwardCommand extends Window_NightwardScreen {
  protected addCommand(
    name: string,
    symbol: string,
    width: number,
    height = 22,
    cue: ButtonCue = 'ok',
    row = this.buttons.length,
    col = 0,
    parent: Container = this.content,
  ): Sprite_NightwardButton {
    const button = this.addButton(new Sprite_NightwardButton(name, width, height, cue), row, col, parent)
    button.onActivate = () => this.callCommandHandler(symbol)
    return button
  }

  protected callCommandHandler(symbol: string): void {
    if (this.isHandled(symbol))
      this.callHandler(symbol)
  }
}
