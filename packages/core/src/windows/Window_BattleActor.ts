import type { Rectangle } from '../core'
import { GlobalMananger } from '../managers'
import { Window_BattleStatus } from './Window_BattleStatus'

/**
 * Window_BattleActor
 *
 * The window for selecting a target actor on the battle screen.
 */
export class Window_BattleActor extends Window_BattleStatus {
  constructor(rect: Rectangle.Shape) {
    super(rect)
    this.openness = 255
    this.hide()
  }

  show(): void {
    this.forceSelect(0)
    GlobalMananger.$gameTemp.clearTouchState()
    super.show()
  }

  hide(): void {
    super.hide()
    GlobalMananger.$gameParty.select(null as any)
  }

  select(index: number): void {
    super.select(index)
    GlobalMananger.$gameParty.select(this.actor(index) as any)
  }

  processTouch(): void {
    super.processTouch()
    if (this.isOpenAndActive()) {
      const target = GlobalMananger.$gameTemp.touchTarget()
      if (target) {
        const members = GlobalMananger.$gameParty.battleMembers()
        if (members.includes(target as any)) {
          this.select(members.indexOf(target as any))
          if (GlobalMananger.$gameTemp.touchState() === 'click') {
            this.processOk()
          }
        }
        GlobalMananger.$gameTemp.clearTouchState()
      }
    }
  }
}
