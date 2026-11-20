import type { Rectangle } from '../primitives'
import { Window_SkillList } from './Window_SkillList'

/**
 * Window_BattleSkill
 *
 * The window for selecting a skill to use on the battle screen.
 */
export class Window_BattleSkill extends Window_SkillList {
  constructor(rect: Rectangle.Shape) {
    super(rect)
    this.hide()
  }

  show(): void {
    this.selectLast()
    this.showHelpWindow()
    super.show()
  }

  hide(): void {
    this.hideHelpWindow()
    super.hide()
  }
}
