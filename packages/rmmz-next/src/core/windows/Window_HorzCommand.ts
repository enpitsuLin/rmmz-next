import type { Rectangle } from '../primitives/Rectangle'
import { Window_Command } from './Window_Command'

/**
 * Window_HorzCommand
 *
 * The command window for the horizontal selection format.
 */
export class Window_HorzCommand extends Window_Command {
  constructor(rect: Rectangle.Shape) {
    super(rect)
  }

  maxCols(): number {
    return 4
  }

  itemTextAlign(): CanvasTextAlign {
    return 'center'
  }
}
