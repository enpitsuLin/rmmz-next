import type { MZ } from '../../database-types'
import type { Game_Actor } from '../objects/Game_Actor'
import type { Rectangle } from '../primitives'
import { ConfigManager } from '../managers/ConfigManager'
import { GlobalMananger } from '../managers/GlobalManager'
import { TextManager } from '../managers/TextManager'
import { Window_Command } from './Window_Command'

/**
 * Window_ActorCommand
 *
 * The window for selecting an actor's action on the battle screen.
 */
export class Window_ActorCommand extends Window_Command {
  _actor: Game_Actor | null = null

  constructor(rect: Rectangle.Shape) {
    super(rect)
    this.openness = 0
    this.deactivate()
    this._actor = null
  }

  makeCommandList(): void {
    if (this._actor) {
      this.addAttackCommand()
      this.addSkillCommands()
      this.addGuardCommand()
      this.addItemCommand()
    }
  }

  addAttackCommand(): void {
    this.addCommand(TextManager.attack, 'attack', this._actor!.canAttack())
  }

  addSkillCommands(): void {
    const skillTypes = this._actor!.skillTypes()
    for (const stypeId of skillTypes) {
      const name = GlobalMananger.$dataSystem.skillTypes[stypeId]
      this.addCommand(name, 'skill', true, stypeId)
    }
  }

  addGuardCommand(): void {
    this.addCommand(TextManager.guard, 'guard', this._actor!.canGuard())
  }

  addItemCommand(): void {
    this.addCommand(TextManager.item, 'item')
  }

  setup(actor: Game_Actor | null): void {
    this._actor = actor
    this.refresh()
    this.selectLast()
    this.activate()
    this.open()
  }

  actor(): Game_Actor | null {
    return this._actor
  }

  processOk(): void {
    if (this._actor) {
      if (ConfigManager.commandRemember) {
        this._actor.setLastCommandSymbol(this.currentSymbol()!)
      }
      else {
        this._actor.setLastCommandSymbol('')
      }
    }
    super.processOk()
  }

  selectLast(): void {
    this.forceSelect(0)
    if (this._actor && ConfigManager.commandRemember) {
      const symbol = this._actor.lastCommandSymbol()
      this.selectSymbol(symbol)
      if (symbol === 'skill') {
        const skill = this._actor.lastBattleSkill() as MZ.Skill | null
        if (skill) {
          this.selectExt(skill.stypeId)
        }
      }
    }
  }
}
