import { Window_Selectable } from './Window_Selectable'

/**
 * Window_BattleEnemy
 *
 * The window for selecting a target enemy on the battle screen.
 */
export class Window_BattleEnemy extends Window_Selectable {
  constructor(rect) {
    super(rect)
    this._enemies = []
    this.refresh()
    this.hide()
  }

  maxCols() {
    return 2
  }

  maxItems() {
    return this._enemies.length
  }

  enemy() {
    return this._enemies ? this._enemies[this.index()] : undefined
  }

  enemyIndex() {
    const enemy = this.enemy()
    return enemy ? enemy.index() : -1
  }

  drawItem(index) {
    this.resetTextColor()
    const name = this._enemies[index].name()
    const rect = this.itemLineRect(index)
    this.drawText(name, rect.x, rect.y, rect.width)
  }

  show() {
    this.refresh()
    this.forceSelect(0)
    $gameTemp.clearTouchState()
    super.show()
  }

  hide() {
    super.hide()
    $gameTroop.select(null)
  }

  refresh() {
    this._enemies = $gameTroop.aliveMembers()
    super.refresh()
  }

  select(index) {
    super.select(index)
    $gameTroop.select(this.enemy())
  }

  processTouch() {
    super.processTouch()
    if (this.isOpenAndActive()) {
      const target = $gameTemp.touchTarget()
      if (target) {
        if (this._enemies.includes(target)) {
          this.select(this._enemies.indexOf(target))
          if ($gameTemp.touchState() === 'click') {
            this.processOk()
          }
        }
        $gameTemp.clearTouchState()
      }
    }
  }
}
