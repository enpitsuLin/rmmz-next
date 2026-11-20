import type { Game_Actor } from '../objects/Game_Actor'
import { GlobalMananger } from '../managers/GlobalManager'
import { ImageManager } from '../managers/ImageManager'
import { Graphics } from '../primitives/Graphics'
import { Rectangle } from '../primitives/Rectangle'
import { Window_NameEdit, Window_NameInput } from '../windows'
import { Scene_MenuBase } from './Scene_MenuBase'

/*
 /* Scene_Name
 /*
 /* The scene class of the name input screen.
 */
export class Scene_Name extends Scene_MenuBase {
  _actorId!: number
  _maxLength!: number
  _editWindow!: Window_NameEdit
  _inputWindow!: Window_NameInput

  constructor() {
    super()
  }

  prepare(actorId: number, maxLength: number): void {
    this._actorId = actorId
    this._maxLength = maxLength
  }

  create(): void {
    super.create()
    this._actor = GlobalMananger.$gameActors.actor(this._actorId) as Game_Actor
    this.createEditWindow()
    this.createInputWindow()
  }

  start(): void {
    super.start()
    this._editWindow.refresh()
  }

  createEditWindow(): void {
    const rect = this.editWindowRect()
    this._editWindow = new Window_NameEdit(rect)
    this._editWindow.setup(this._actor, this._maxLength)
    this.addWindow(this._editWindow)
  }

  editWindowRect(): Rectangle {
    const inputWindowHeight = this.calcWindowHeight(9, true)
    const padding = GlobalMananger.$gameSystem.windowPadding()
    const ww = 600
    const wh = ImageManager.standardFaceHeight + padding * 2
    const wx = (Graphics.boxWidth - ww) / 2
    const wy = (Graphics.boxHeight - (wh + inputWindowHeight + 8)) / 2
    return new Rectangle(wx, wy, ww, wh)
  }

  createInputWindow(): void {
    const rect = this.inputWindowRect()
    this._inputWindow = new Window_NameInput(rect)
    this._inputWindow.setEditWindow(this._editWindow)
    this._inputWindow.setHandler('ok', this.onInputOk.bind(this))
    this.addWindow(this._inputWindow)
  }

  inputWindowRect(): Rectangle {
    const wx = this._editWindow.x
    const wy = this._editWindow.y + this._editWindow.height + 8
    const ww = this._editWindow.width
    const wh = this.calcWindowHeight(9, true)
    return new Rectangle(wx, wy, ww, wh)
  }

  onInputOk(): void {
    this._actor.setName(this._editWindow.name)
    this.popScene()
  }
}
