import type { Rectangle } from '../core'
import { TextManager } from '../managers/TextManager'
import { Window_HorzCommand } from './Window_HorzCommand'

/**
 * Window_EquipCommand
 *
 * The window for selecting a command on the equipment screen.
 */
export class Window_EquipCommand extends Window_HorzCommand {
  constructor(rect: Rectangle.Shape) {
    super(rect)
  }

  maxCols(): number {
    return 3
  }

  makeCommandList(): void {
    this.addCommand(TextManager.equip2, 'equip')
    this.addCommand(TextManager.optimize, 'optimize')
    this.addCommand(TextManager.clear, 'clear')
  }
}
