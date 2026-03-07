import type { Rectangle } from '../core'
import { Input } from '../core'
import { Window_Selectable } from './Window_Selectable'
import { GlobalMananger } from '../managers'

/**
 * The window for displaying switches and variables on the debug screen.
 */
export class Window_DebugEdit extends Window_Selectable {
  _mode: 'switch' | 'variable'
  _topId: number

  constructor(rect: Rectangle.Shape) {
    super(rect)
    this._mode = 'switch'
    this._topId = 1
    this.refresh()
  }

  maxItems(): number {
    return 10
  }

  drawItem(index: number): void {
    const dataId = this._topId + index
    const idText = `${dataId.padZero(4)}:`
    const idWidth = this.textWidth(idText)
    const statusWidth = this.textWidth('-00000000')
    const name = this.itemName(dataId)
    const status = this.itemStatus(dataId)
    const rect = this.itemLineRect(index)
    this.resetTextColor()
    this.drawText(idText, rect.x, rect.y, rect.width)
    rect.x += idWidth
    rect.width -= idWidth + statusWidth
    this.drawText(name, rect.x, rect.y, rect.width)
    this.drawText(status, rect.x + rect.width, rect.y, statusWidth, 'right')
  }

  itemName(dataId: number): string {
    return this._mode === 'switch' ? GlobalMananger.$dataSystem.switches[dataId] : GlobalMananger.$dataSystem.variables[dataId]
  }

  itemStatus(dataId: number): string {
    return this._mode === 'switch' ? (GlobalMananger.$gameSwitches.value(dataId) ? '[ON]' : '[OFF]') : String(GlobalMananger.$gameVariables.value(dataId))
  }

  setMode(mode: 'switch' | 'variable'): void {
    if (this._mode !== mode) {
      this._mode = mode
      this.refresh()
    }
  }

  setTopId(id: number): void {
    if (this._topId !== id) {
      this._topId = id
      this.refresh()
    }
  }

  currentId(): number {
    return this._topId + this.index()
  }

  update(): void {
    super.update()
    if (this.active) {
      if (this._mode === 'switch') {
        this.updateSwitch()
      }
      else {
        this.updateVariable()
      }
    }
  }

  updateSwitch(): void {
    if (Input.isRepeated('ok')) {
      const switchId = this.currentId()
      this.playCursorSound()
      GlobalMananger.$gameSwitches.setValue(switchId, !GlobalMananger.$gameSwitches.value(switchId))
      this.redrawCurrentItem()
    }
  }

  updateVariable(): void {
    const variableId = this.currentId()
    const value = GlobalMananger.$gameVariables.value(variableId)
    if (typeof value === 'number') {
      const newValue = value + this.deltaForVariable()
      if (value !== newValue) {
        GlobalMananger.$gameVariables.setValue(variableId, newValue)
        this.playCursorSound()
        this.redrawCurrentItem()
      }
    }
  }

  deltaForVariable(): number {
    if (Input.isRepeated('right')) {
      return 1
    }
    else if (Input.isRepeated('left')) {
      return -1
    }
    else if (Input.isRepeated('pagedown')) {
      return 10
    }
    else if (Input.isRepeated('pageup')) {
      return -10
    }
    return 0
  }
}
