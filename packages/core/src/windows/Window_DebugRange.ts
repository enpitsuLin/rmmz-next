import type { Rectangle } from '../core'
import type { Window_DebugEdit } from './Window_DebugEdit'
import { Input } from '../core'
import { GlobalMananger } from '../managers'
import { Window_Selectable } from './Window_Selectable'

/**
 * Window_DebugRange
 *
 * The window for selecting a block of switches/variables on the debug screen.
 */
export class Window_DebugRange extends Window_Selectable {
  static lastTopRow: number = 0
  static lastIndex: number = 0

  _maxSwitches: number
  _maxVariables: number
  _editWindow: Window_DebugEdit | null

  constructor(rect: Rectangle.Shape) {
    super(rect)
    this._editWindow = null
    this._maxSwitches = Math.ceil((GlobalMananger.$dataSystem.switches.length - 1) / 10)
    this._maxVariables = Math.ceil((GlobalMananger.$dataSystem.variables.length - 1) / 10)
    this.refresh()
    this.setTopRow(Window_DebugRange.lastTopRow)
    this.select(Window_DebugRange.lastIndex)
    this.activate()
  }

  maxItems(): number {
    return this._maxSwitches + this._maxVariables
  }

  update(): void {
    super.update()
    if (this._editWindow) {
      const index = this.index()
      this._editWindow.setMode(this.mode(index))
      this._editWindow.setTopId(this.topId(index))
    }
  }

  mode(index?: number): 'switch' | 'variable' {
    return this.isSwitchMode(index) ? 'switch' : 'variable'
  }

  topId(index: number): number {
    if (this.isSwitchMode(index)) {
      return index * 10 + 1
    }
    else {
      return (index - this._maxSwitches) * 10 + 1
    }
  }

  isSwitchMode(index?: number): boolean {
    return (index ?? this.index()) < this._maxSwitches
  }

  drawItem(index: number): void {
    const rect = this.itemLineRect(index)
    const c = this.isSwitchMode(index) ? 'S' : 'V'
    const start = this.topId(index)
    const end = start + 9
    const text = `${c} [${start.padZero(4)}-${end.padZero(4)}]`
    this.drawText(text, rect.x, rect.y, rect.width)
  }

  isCancelTriggered(): boolean {
    return (
      super.isCancelTriggered() || Input.isTriggered('debug')
    )
  }

  processCancel(): void {
    super.processCancel()
    Window_DebugRange.lastTopRow = this.topRow()
    Window_DebugRange.lastIndex = this.index()
  }

  setEditWindow(editWindow: Window_DebugEdit): void {
    this._editWindow = editWindow
  }
}
