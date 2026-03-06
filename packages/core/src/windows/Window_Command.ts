import type { Rectangle } from '../core'
import { Window_Selectable } from './Window_Selectable'

/**
 * Window_Command
 *
 * The superclass of windows for selecting a command.
 */
export class Window_Command extends Window_Selectable {
  _list!: Window_Command.CommandItem[]

  constructor(rect: Rectangle.Shape) {
    super(rect)
    this.refresh()
    this.select(0)
    this.activate()
  }

  maxItems(): number {
    return this._list.length
  }

  clearCommandList(): void {
    this._list = []
  }

  makeCommandList(): void {
    //
  }

  addCommand(name: string, symbol: string, enabled: boolean = true, ext: number | null = null): void {
    this._list.push({ name, symbol, enabled, ext })
  }

  commandName(index: number): string {
    return this._list[index].name
  }

  commandSymbol(index: number): string {
    return this._list[index].symbol
  }

  isCommandEnabled(index: number): boolean {
    return this._list[index].enabled
  }

  currentData(): Window_Command.CommandItem | null {
    return this.index() >= 0 ? this._list[this.index()] : null
  }

  isCurrentItemEnabled(): boolean {
    const data = this.currentData()
    return data ? data.enabled : false
  }

  currentSymbol(): string | null {
    const data = this.currentData()
    return data ? data.symbol : null
  }

  currentExt(): number | null {
    const data = this.currentData()
    return data ? data.ext : null
  }

  findSymbol(symbol: string): number {
    return this._list.findIndex(item => item.symbol === symbol)
  }

  selectSymbol(symbol: string): void {
    const index = this.findSymbol(symbol)
    if (index >= 0) {
      this.forceSelect(index)
    }
    else {
      this.forceSelect(0)
    }
  }

  findExt(ext: number): number {
    return this._list.findIndex(item => item.ext === ext)
  }

  selectExt(ext: number): void {
    const index = this.findExt(ext)
    if (index >= 0) {
      this.forceSelect(index)
    }
    else {
      this.forceSelect(0)
    }
  }

  drawItem(index: number): void {
    const rect = this.itemLineRect(index)
    const align = this.itemTextAlign()
    this.resetTextColor()
    this.changePaintOpacity(this.isCommandEnabled(index))
    this.drawText(this.commandName(index), rect.x, rect.y, rect.width, align)
  }

  itemTextAlign(): CanvasTextAlign {
    return 'center'
  }

  isOkEnabled(): boolean {
    return true
  }

  callOkHandler(): void {
    const symbol = this.currentSymbol()
    if (symbol !== null && this.isHandled(symbol)) {
      this.callHandler(symbol)
    }
    else if (this.isHandled('ok')) {
      super.callOkHandler()
    }
    else {
      this.activate()
    }
  }

  refresh(): void {
    this.clearCommandList()
    this.makeCommandList()
    super.refresh()
  }
}

export namespace Window_Command {
  export interface CommandItem {
    name: string
    symbol: string
    enabled: boolean
    ext: number | null
  }
}
