import { Window_NightwardOptions } from '../windows/Window_NightwardOptions'
import { Scene_NightwardMenuBase } from './Scene_NightwardMenuBase'

export class Scene_NightwardOptions extends Scene_NightwardMenuBase {
  private _optionsWindow!: Window_NightwardOptions

  protected override createMenuWindow(): void {
    this._optionsWindow = new Window_NightwardOptions()
    this._optionsWindow.setHandler('cancel', () => this.closeAndPop(this._optionsWindow))
    this.addWindow(this._optionsWindow)
  }
}
