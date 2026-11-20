import type { Rectangle } from '../primitives'
import { DataManager } from '../managers/DataManager'
import { TextManager } from '../managers/TextManager'
import { Window_Command } from './Window_Command'

/**
 * Window_TitleCommand
 *
 * The window for selecting New Game/Continue on the title screen.
 */
export class Window_TitleCommand extends Window_Command {
  static _lastCommandSymbol: string | null = null

  static initCommandPosition(): void {
    this._lastCommandSymbol = null
  }

  constructor(rect: Rectangle.Shape) {
    super(rect)
    this.openness = 0
    this.selectLast()
  }

  makeCommandList(): void {
    const continueEnabled = this.isContinueEnabled()
    this.addCommand(TextManager.newGame, 'newGame')
    this.addCommand(TextManager.continue_, 'continue', continueEnabled)
    this.addCommand(TextManager.options, 'options')
  }

  isContinueEnabled(): boolean {
    return DataManager.isAnySavefileExists()
  }

  processOk(): void {
    Window_TitleCommand._lastCommandSymbol = this.currentSymbol()
    super.processOk()
  }

  selectLast(): void {
    if (Window_TitleCommand._lastCommandSymbol) {
      this.selectSymbol(Window_TitleCommand._lastCommandSymbol)
    }
    else if (this.isContinueEnabled()) {
      this.selectSymbol('continue')
    }
  }
}
