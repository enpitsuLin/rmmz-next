import type { Rectangle } from '../primitives'
import { TextManager } from '../managers/TextManager'
import { Window_Command } from './Window_Command'

/**
 * Window_GameEnd
 *
 * The window for selecting "Go to Title" on the game end screen.
 */
export class Window_GameEnd extends Window_Command {
  constructor(rect: Rectangle.Shape) {
    super(rect)
    this.openness = 0
    this.open()
  }

  makeCommandList(): void {
    this.addCommand(TextManager.toTitle, 'toTitle')
    this.addCommand(TextManager.cancel, 'cancel')
  }
}
