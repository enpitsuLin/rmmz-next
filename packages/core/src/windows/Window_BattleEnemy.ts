import type { Rectangle } from '../core'
import type { Game_Enemy } from '../objects/Game_Enemy'
import { Window_Selectable } from './Window_Selectable'
import { GlobalMananger } from '../managers'

/**
 * Window_BattleEnemy
 *
 * The window for selecting a target enemy on the battle screen.
 */
export class Window_BattleEnemy extends Window_Selectable {
  _enemies: Game_Enemy[]

  constructor(rect: Rectangle.Shape) {
    super(rect)
    this._enemies = []
    this.refresh()
    this.hide()
  }

  maxCols(): number {
    return 2
  }

  maxItems(): number {
    return this._enemies.length
  }

  enemy(): Game_Enemy | undefined {
    return this._enemies ? this._enemies[this.index()] : undefined
  }

  enemyIndex(): number {
    const enemy = this.enemy()
    return enemy ? enemy.index() : -1
  }

  drawItem(index: number): void {
    this.resetTextColor()
    const name = this._enemies[index].name()
    const rect = this.itemLineRect(index)
    this.drawText(name, rect.x, rect.y, rect.width)
  }

  show(): void {
    this.refresh()
    this.forceSelect(0)
    GlobalMananger.$gameTemp.clearTouchState()
    super.show()
  }

  hide(): void {
    super.hide()
    GlobalMananger.$gameTroop.select(null as any)
  }

  refresh(): void {
    this._enemies = GlobalMananger.$gameTroop.aliveMembers()
    super.refresh()
  }

  select(index: number): void {
    super.select(index)
    GlobalMananger.$gameTroop.select(this.enemy() as any ?? null)
  }

  processTouch(): void {
    super.processTouch()
    if (this.isOpenAndActive()) {
      const target = GlobalMananger.$gameTemp.touchTarget()
      if (target) {
        if (this._enemies.includes(target as Game_Enemy)) {
          this.select(this._enemies.indexOf(target as Game_Enemy))
          if (GlobalMananger.$gameTemp.touchState() === 'click') {
            this.processOk()
          }
        }
        GlobalMananger.$gameTemp.clearTouchState()
      }
    }
  }
}
