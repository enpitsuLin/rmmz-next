import { NightwardDataManager } from '../managers/NightwardDataManager'
import { NightwardManager } from '../managers/NightwardManager'
import { Window_NightwardHowTo } from '../windows/Window_NightwardHowTo'
import { Scene_NightwardMenuBase } from './Scene_NightwardMenuBase'

export class Scene_NightwardHowTo extends Scene_NightwardMenuBase {
  private _howToWindow!: Window_NightwardHowTo

  protected override createMenuWindow(): void {
    const content = NightwardManager.run()?.content ?? NightwardDataManager.content()
    this._howToWindow = new Window_NightwardHowTo(content)
    this._howToWindow.setHandler('cancel', () => this.closeAndPop(this._howToWindow))
    this.addWindow(this._howToWindow)
  }
}
