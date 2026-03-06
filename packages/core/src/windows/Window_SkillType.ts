import type { MZ } from '@rmmz-lib/database-types'
import type { Rectangle } from '../core'
import type { Game_Actor } from '../objects/Game_Actor'
import type { Window_SkillList } from './Window_SkillList'
import { Window_Command } from './Window_Command'

/**
 * Window_SkillType
 *
 * The window for selecting a skill type on the skill screen.
 */
export class Window_SkillType extends Window_Command {
  _actor: Game_Actor | null = null
  _skillWindow: Window_SkillList | null = null

  constructor(rect: Rectangle.Shape) {
    super(rect)
    this._actor = null
  }

  setActor(actor: Game_Actor | null): void {
    if (this._actor !== actor) {
      this._actor = actor
      this.refresh()
      this.selectLast()
    }
  }

  makeCommandList(): void {
    if (this._actor) {
      const skillTypes = this._actor.skillTypes()
      for (const stypeId of skillTypes) {
        const name = $dataSystem.skillTypes[stypeId]
        this.addCommand(name, 'skill', true, stypeId)
      }
    }
  }

  update(): void {
    super.update()
    if (this._skillWindow) {
      this._skillWindow.setStypeId(this.currentExt())
    }
  }

  setSkillWindow(skillWindow: Window_SkillList): void {
    this._skillWindow = skillWindow
  }

  selectLast(): void {
    const skill = this._actor?.lastMenuSkill() as MZ.Skill | null ?? null
    if (skill) {
      this.selectExt(skill.stypeId)
    }
    else {
      this.forceSelect(0)
    }
  }
}
