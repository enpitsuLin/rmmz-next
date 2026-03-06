import type { Rectangle } from '../core'
import type { Game_Actor } from '../objects/Game_Actor'
import { ColorManager } from '../managers/ColorManager'
import { TextManager } from '../managers/TextManager'
import { Window_StatusBase } from './Window_StatusBase'

/**
 * Window_StatusParams
 *
 * The window for displaying parameters on the status screen.
 */
export class Window_StatusParams extends Window_StatusBase {
  _actor: Game_Actor | null

  constructor(rect: Rectangle.Shape) {
    super(rect)
    this._actor = null
  }

  setActor(actor: Game_Actor): void {
    if (this._actor !== actor) {
      this._actor = actor
      this.refresh()
    }
  }

  maxItems(): number {
    return 6
  }

  itemHeight(): number {
    return this.lineHeight()
  }

  drawItem(index: number): void {
    const rect = this.itemLineRect(index)
    const paramId = index + 2
    const name = TextManager.param(paramId)
    const value = this._actor!.param(paramId)
    this.changeTextColor(ColorManager.systemColor())
    this.drawText(name, rect.x, rect.y, 160)
    this.resetTextColor()
    this.drawText(String(value), rect.x + 160, rect.y, 60, 'right')
  }

  drawItemBackground(_index: number): void {
    // empty method body
  }
}
