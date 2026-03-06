import type { Rectangle } from '../core'
import { BattleManager } from '../managers/BattleManager'
import { TextManager } from '../managers/TextManager'
import { Window_Command } from './Window_Command'

/**
 * Window_PartyCommand
 *
 * The window for selecting whether to fight or escape on the battle screen.
 */
export class Window_PartyCommand extends Window_Command {
  constructor(rect: Rectangle.Shape) {
    super(rect)
    this.openness = 0
    this.deactivate()
  }

  makeCommandList(): void {
    this.addCommand(TextManager.fight, 'fight')
    this.addCommand(TextManager.escape, 'escape', BattleManager.canEscape())
  }

  setup(): void {
    this.refresh()
    this.forceSelect(0)
    this.activate()
    this.open()
  }
}
