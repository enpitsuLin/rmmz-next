/**
 * Window_PartyCommand
 *
 * The window for selecting whether to fight or escape on the battle screen.
 */
export class Window_PartyCommand extends Window_Command {
  constructor(rect) {
    super(rect);
    this.openness = 0;
    this.deactivate();
  }

  makeCommandList() {
    this.addCommand(TextManager.fight, "fight");
    this.addCommand(TextManager.escape, "escape", BattleManager.canEscape());
  }

  setup() {
    this.refresh();
    this.forceSelect(0);
    this.activate();
    this.open();
  }
}
