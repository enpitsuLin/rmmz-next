import type { Rectangle } from '../core'
import { GlobalMananger, DataManager, TextManager } from '../managers'
import { Window_Command } from './Window_Command'

/**
 * Window_MenuCommand
 *
 * The window for selecting a command on the menu screen.
 */
export class Window_MenuCommand extends Window_Command {
  static _lastCommandSymbol: string | null = null

  static initCommandPosition(): void {
    this._lastCommandSymbol = null
  }

  constructor(rect: Rectangle.Shape) {
    super(rect)
    this.selectLast()
    this._canRepeat = false
  }

  makeCommandList(): void {
    this.addMainCommands()
    this.addFormationCommand()
    this.addOriginalCommands()
    this.addOptionsCommand()
    this.addSaveCommand()
    this.addGameEndCommand()
  }

  addMainCommands(): void {
    const enabled = this.areMainCommandsEnabled()
    if (this.needsCommand('item')) {
      this.addCommand(TextManager.item, 'item', enabled)
    }
    if (this.needsCommand('skill')) {
      this.addCommand(TextManager.skill, 'skill', enabled)
    }
    if (this.needsCommand('equip')) {
      this.addCommand(TextManager.equip, 'equip', enabled)
    }
    if (this.needsCommand('status')) {
      this.addCommand(TextManager.status, 'status', enabled)
    }
  }

  addFormationCommand(): void {
    if (this.needsCommand('formation')) {
      const enabled = this.isFormationEnabled()
      this.addCommand(TextManager.formation, 'formation', enabled)
    }
  }

  addOriginalCommands(): void {
    // Add custom commands here
  }

  addOptionsCommand(): void {
    if (this.needsCommand('options')) {
      const enabled = this.isOptionsEnabled()
      this.addCommand(TextManager.options, 'options', enabled)
    }
  }

  addSaveCommand(): void {
    if (this.needsCommand('save')) {
      const enabled = this.isSaveEnabled()
      this.addCommand(TextManager.save, 'save', enabled)
    }
  }

  addGameEndCommand(): void {
    const enabled = this.isGameEndEnabled()
    this.addCommand(TextManager.gameEnd, 'gameEnd', enabled)
  }

  needsCommand(name: string): boolean {
    const table = ['item', 'skill', 'equip', 'status', 'formation', 'save']
    const index = table.indexOf(name)
    if (index >= 0) {
      return GlobalMananger.$dataSystem.menuCommands[index]
    }
    return true
  }

  areMainCommandsEnabled(): boolean {
    return GlobalMananger.$gameParty.exists()
  }

  isFormationEnabled(): boolean {
    return GlobalMananger.$gameParty.size() >= 2 && GlobalMananger.$gameSystem.isFormationEnabled()
  }

  isOptionsEnabled(): boolean {
    return true
  }

  isSaveEnabled(): boolean {
    return !DataManager.isEventTest() && GlobalMananger.$gameSystem.isSaveEnabled()
  }

  isGameEndEnabled(): boolean {
    return true
  }

  processOk(): void {
    Window_MenuCommand._lastCommandSymbol = this.currentSymbol()
    super.processOk()
  }

  selectLast(): void {
    this.selectSymbol(Window_MenuCommand._lastCommandSymbol!)
  }
}
