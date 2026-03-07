import type { MZ } from '@rmmz-lib/database-types'
import type { Rectangle } from '../core'
import { DataManager, GlobalMananger } from '../managers'
import { Game_Action } from '../objects'
import { Window_MenuStatus } from './Window_MenuStatus'

/**
 * Window_MenuActor
 *
 * The window for selecting a target actor on the item and skill screens.
 */
export class Window_MenuActor extends Window_MenuStatus {
  constructor(rect: Rectangle.Shape) {
    super(rect)
    this.hide()
  }

  processOk(): void {
    if (!this.cursorAll()) {
      GlobalMananger.$gameParty.setTargetActor(GlobalMananger.$gameParty.members()[this.index()])
    }
    this.callOkHandler()
  }

  selectLast(): void {
    this.forceSelect(GlobalMananger.$gameParty.targetActor().index() || 0)
  }

  selectForItem(item: MZ.GeneralItem | null): void {
    const actor = GlobalMananger.$gameParty.menuActor()
    const action = new Game_Action(actor)
    action.setItemObject(item)
    this.setCursorFixed(false)
    this.setCursorAll(false)
    if (action.isForUser()) {
      if (DataManager.isSkill(item)) {
        this.setCursorFixed(true)
        this.forceSelect(actor.index())
      }
      else {
        this.selectLast()
      }
    }
    else if (action.isForAll()) {
      this.setCursorAll(true)
      this.forceSelect(0)
    }
    else {
      this.selectLast()
    }
  }
}
