import type { MZ } from '../../database-types'
import type { Game_Actor } from '../objects/Game_Actor'
import type { Game_Battler } from '../objects/Game_Battler'
import type { Window_Selectable } from '../windows'
import { GlobalMananger } from '../managers/GlobalManager'
import { SceneManager } from '../managers/SceneManager'
import { SoundManager } from '../managers/SoundManager'
import { Game_Action } from '../objects/Game_Action'
import { Graphics, Rectangle } from '../primitives'
import { Window_MenuActor } from '../windows'
import { Scene_Map } from './Scene_Map'
import { Scene_MenuBase } from './Scene_MenuBase'

/*
 /* Scene_ItemBase
 /*
 /* The superclass of Scene_Item and Scene_Skill.
 */
export abstract class Scene_ItemBase extends Scene_MenuBase {
  _actorWindow!: Window_MenuActor
  abstract _itemWindow: Window_Selectable
  abstract user(): Game_Battler
  abstract playSeForItem(): void

  constructor() {
    super()
  }

  create(): void {
    super.create()
  }

  createActorWindow(): void {
    const rect = this.actorWindowRect()
    this._actorWindow = new Window_MenuActor(rect)
    this._actorWindow.setHandler('ok', this.onActorOk.bind(this))
    this._actorWindow.setHandler('cancel', this.onActorCancel.bind(this))
    this.addWindow(this._actorWindow)
  }

  actorWindowRect(): Rectangle {
    const wx = 0
    const wy = Math.min(this.mainAreaTop(), this.helpAreaTop())
    const ww = Graphics.boxWidth - this.mainCommandWidth()
    const wh = this.mainAreaHeight() + this.helpAreaHeight()
    return new Rectangle(wx, wy, ww, wh)
  }

  item(): MZ.GeneralItem | null {
    return this._itemWindow.item!()
  }

  isCursorLeft(): boolean {
    return this._itemWindow.index() % 2 === 0
  }

  showActorWindow(): void {
    if (this.isCursorLeft()) {
      this._actorWindow.x = Graphics.boxWidth - this._actorWindow.width
    }
    else {
      this._actorWindow.x = 0
    }
    this._actorWindow.show()
    this._actorWindow.activate()
  }

  hideActorWindow(): void {
    this._actorWindow.hide()
    this._actorWindow.deactivate()
  }

  isActorWindowActive(): boolean {
    return this._actorWindow && this._actorWindow.active
  }

  onActorOk(): void {
    if (this.canUse()) {
      this.useItem()
    }
    else {
      SoundManager.playBuzzer()
    }
  }

  onActorCancel(): void {
    this.hideActorWindow()
    this.activateItemWindow()
  }

  determineItem(): void {
    const action = new Game_Action(this.user())
    const item = this.item()
    action.setItemObject(item)
    if (action.isForFriend()) {
      this.showActorWindow()
      this._actorWindow.selectForItem(this.item())
    }
    else {
      this.useItem()
      this.activateItemWindow()
    }
  }

  useItem(): void {
    this.playSeForItem()
    this.user().useItem(this.item())
    this.applyItem()
    this.checkCommonEvent()
    this.checkGameover()
    this._actorWindow.refresh()
  }

  activateItemWindow(): void {
    this._itemWindow.refresh()
    this._itemWindow.activate()
  }

  itemTargetActors(): Game_Actor[] {
    const action = new Game_Action(this.user())
    action.setItemObject(this.item())
    if (!action.isForFriend()) {
      return []
    }
    else if (action.isForAll()) {
      return GlobalMananger.$gameParty.members()
    }
    else {
      return [GlobalMananger.$gameParty.members()[this._actorWindow.index()]]
    }
  }

  canUse(): boolean {
    const user = this.user()
    return user && user.canUse(this.item()) && this.isItemEffectsValid()
  }

  isItemEffectsValid(): boolean {
    const action = new Game_Action(this.user())
    action.setItemObject(this.item())
    return this.itemTargetActors().some(target => action.testApply(target))
  }

  applyItem(): void {
    const action = new Game_Action(this.user())
    action.setItemObject(this.item())
    for (const target of this.itemTargetActors()) {
      for (let i = 0; i < action.numRepeats(); i++) {
        action.apply(target)
      }
    }
    action.applyGlobal()
  }

  checkCommonEvent(): void {
    if (GlobalMananger.$gameTemp.isCommonEventReserved()) {
      SceneManager.goto(Scene_Map)
    }
  }
}
