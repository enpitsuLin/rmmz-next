import { SceneManager } from '../managers/SceneManager'
import { Graphics } from '../primitives/Graphics'
import { Rectangle } from '../primitives/Rectangle'
import { Window_GameEnd } from '../windows/Window_GameEnd'
import { Window_TitleCommand } from '../windows/Window_TitleCommand'
import { Scene_MenuBase } from './Scene_MenuBase'

/*
 /* Scene_GameEnd
 /*
 /* The scene class of the game end screen.
 */
export class Scene_GameEnd extends Scene_MenuBase {
  _commandWindow!: Window_GameEnd

  constructor() {
    super()
  }

  create(): void {
    super.create()
    this.createCommandWindow()
  }

  stop(): void {
    super.stop()
    this._commandWindow.close()
  }

  createBackground(): void {
    super.createBackground()
    this.setBackgroundOpacity(128)
  }

  createCommandWindow(): void {
    const rect = this.commandWindowRect()
    this._commandWindow = new Window_GameEnd(rect)
    this._commandWindow.setHandler('toTitle', this.commandToTitle.bind(this))
    this._commandWindow.setHandler('cancel', this.popScene.bind(this))
    this.addWindow(this._commandWindow)
  }

  commandWindowRect(): Rectangle {
    const ww = this.mainCommandWidth()
    const wh = this.calcWindowHeight(2, true)
    const wx = (Graphics.boxWidth - ww) / 2
    const wy = (Graphics.boxHeight - wh) / 2
    return new Rectangle(wx, wy, ww, wh)
  }

  commandToTitle(): void {
    this.fadeOutAll()
    SceneManager.goto('Title')
    Window_TitleCommand.initCommandPosition()
  }
}
