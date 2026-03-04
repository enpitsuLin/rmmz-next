import { Window_BattleStatus } from './Window_BattleStatus'

/**
 * Window_BattleActor
 *
 * The window for selecting a target actor on the battle screen.
 */
export class Window_BattleActor extends Window_BattleStatus {
  constructor(rect) {
    super(rect)
    this.openness = 255
    this.hide()
  }

  show() {
    this.forceSelect(0)
    $gameTemp.clearTouchState()
    super.show()
  }

  hide() {
    super.hide()
    $gameParty.select(null)
  }

  select(index) {
    super.select(index)
    $gameParty.select(this.actor(index))
  }

  processTouch() {
    super.processTouch()
    if (this.isOpenAndActive()) {
      const target = $gameTemp.touchTarget()
      if (target) {
        const members = $gameParty.battleMembers()
        if (members.includes(target)) {
          this.select(members.indexOf(target))
          if ($gameTemp.touchState() === 'click') {
            this.processOk()
          }
        }
        $gameTemp.clearTouchState()
      }
    }
  }
}
