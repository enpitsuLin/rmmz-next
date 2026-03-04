/**
 * Window_MenuCommand
 *
 * The window for selecting a command on the menu screen.
 */
export class Window_MenuCommand extends Window_Command {
  static _lastCommandSymbol = null

  static initCommandPosition() {
    this._lastCommandSymbol = null
  }

  constructor(rect) {
    super(rect)
    this.selectLast()
    this._canRepeat = false
  }

  makeCommandList() {
    this.addMainCommands()
    this.addFormationCommand()
    this.addOriginalCommands()
    this.addOptionsCommand()
    this.addSaveCommand()
    this.addGameEndCommand()
  }

  addMainCommands() {
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

  addFormationCommand() {
    if (this.needsCommand('formation')) {
      const enabled = this.isFormationEnabled()
      this.addCommand(TextManager.formation, 'formation', enabled)
    }
  }

  addOriginalCommands() {
    // Add custom commands here
  }

  addOptionsCommand() {
    if (this.needsCommand('options')) {
      const enabled = this.isOptionsEnabled()
      this.addCommand(TextManager.options, 'options', enabled)
    }
  }

  addSaveCommand() {
    if (this.needsCommand('save')) {
      const enabled = this.isSaveEnabled()
      this.addCommand(TextManager.save, 'save', enabled)
    }
  }

  addGameEndCommand() {
    const enabled = this.isGameEndEnabled()
    this.addCommand(TextManager.gameEnd, 'gameEnd', enabled)
  }

  needsCommand(name) {
    const table = ['item', 'skill', 'equip', 'status', 'formation', 'save']
    const index = table.indexOf(name)
    if (index >= 0) {
      return $dataSystem.menuCommands[index]
    }
    return true
  }

  areMainCommandsEnabled() {
    return $gameParty.exists()
  }

  isFormationEnabled() {
    return $gameParty.size() >= 2 && $gameSystem.isFormationEnabled()
  }

  isOptionsEnabled() {
    return true
  }

  isSaveEnabled() {
    return !DataManager.isEventTest() && $gameSystem.isSaveEnabled()
  }

  isGameEndEnabled() {
    return true
  }

  processOk() {
    Window_MenuCommand._lastCommandSymbol = this.currentSymbol()
    super.processOk()
  }

  selectLast() {
    this.selectSymbol(Window_MenuCommand._lastCommandSymbol)
  }
}
