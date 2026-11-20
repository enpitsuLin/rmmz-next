import type { MZ } from '../../database-types'
import type { Game_Actor } from '../objects'
import type { Rectangle } from '../primitives'
import { ColorManager } from '../managers/ColorManager'
import { Window_Selectable } from './Window_Selectable'

/**
 * Window_SkillList
 *
 * The window for selecting a skill on the skill screen.
 */
export class Window_SkillList extends Window_Selectable<MZ.Skill> {
  _actor: Game_Actor | null
  _stypeId: number | null
  _data: MZ.Skill[]

  constructor(rect: Rectangle.Shape) {
    super(rect)
    this._actor = null
    this._stypeId = 0
    this._data = []
  }

  setActor(actor: Game_Actor | null): void {
    if (this._actor !== actor) {
      this._actor = actor
      this.refresh()
      this.scrollTo(0, 0)
    }
  }

  setStypeId(stypeId: number | null): void {
    if (this._stypeId !== stypeId) {
      this._stypeId = stypeId
      this.refresh()
      this.scrollTo(0, 0)
    }
  }

  maxCols(): number {
    return 2
  }

  colSpacing(): number {
    return 16
  }

  maxItems(): number {
    return this._data ? this._data.length : 1
  }

  item(): MZ.Skill | null {
    return this.itemAt(this.index())
  }

  itemAt(index: number): MZ.Skill | null {
    return this._data && index >= 0 ? this._data[index] ?? null : null
  }

  isCurrentItemEnabled(): boolean {
    return this.isEnabled(this._data[this.index()] ?? null)
  }

  includes(item: MZ.Skill | null): boolean {
    return !!(item && item.stypeId === this._stypeId)
  }

  isEnabled(item: MZ.Skill | null): boolean {
    return !!(this._actor && item && this._actor.canUse(item))
  }

  makeItemList(): void {
    if (this._actor) {
      this._data = this._actor.skills().filter(item => this.includes(item))
    }
    else {
      this._data = []
    }
  }

  selectLast(): void {
    const index = this._data.indexOf(this._actor!.lastSkill() as MZ.Skill)
    this.forceSelect(index >= 0 ? index : 0)
  }

  drawItem(index: number): void {
    const skill = this.itemAt(index)
    if (skill) {
      const costWidth = this.costWidth()
      const rect = this.itemLineRect(index)
      this.changePaintOpacity(this.isEnabled(skill))
      this.drawItemName(skill as unknown as MZ.Item, rect.x, rect.y, rect.width - costWidth)
      this.drawSkillCost(skill, rect.x, rect.y, rect.width)
      this.changePaintOpacity(true)
    }
  }

  costWidth(): number {
    return this.textWidth('000')
  }

  drawSkillCost(skill: MZ.Skill, x: number, y: number, width: number): void {
    if (this._actor!.skillTpCost(skill) > 0) {
      this.changeTextColor(ColorManager.tpCostColor())
      this.drawText(String(this._actor!.skillTpCost(skill)), x, y, width, 'right')
    }
    else if (this._actor!.skillMpCost(skill) > 0) {
      this.changeTextColor(ColorManager.mpCostColor())
      this.drawText(String(this._actor!.skillMpCost(skill)), x, y, width, 'right')
    }
  }

  updateHelp(): void {
    this.setHelpWindowItem(this.item())
  }

  refresh(): void {
    this.makeItemList()
    super.refresh()
  }
}
