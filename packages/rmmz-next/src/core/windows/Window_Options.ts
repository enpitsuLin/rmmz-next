import type { Rectangle } from '../primitives'
import { ConfigManager } from '../managers/ConfigManager'
import { TextManager } from '../managers/TextManager'
import { Window_Command } from './Window_Command'

/**
 * Window_Options
 *
 * The window for changing various settings on the options screen.
 */
export class Window_Options extends Window_Command {
  constructor(rect: Rectangle.Shape) {
    super(rect)
  }

  makeCommandList(): void {
    this.addGeneralOptions()
    this.addVolumeOptions()
  }

  addGeneralOptions(): void {
    this.addCommand(TextManager.alwaysDash, 'alwaysDash')
    this.addCommand(TextManager.commandRemember, 'commandRemember')
    this.addCommand(TextManager.touchUI, 'touchUI')
  }

  addVolumeOptions(): void {
    this.addCommand(TextManager.bgmVolume, 'bgmVolume')
    this.addCommand(TextManager.bgsVolume, 'bgsVolume')
    this.addCommand(TextManager.meVolume, 'meVolume')
    this.addCommand(TextManager.seVolume, 'seVolume')
  }

  drawItem(index: number): void {
    const title = this.commandName(index)
    const status = this.statusText(index)
    const rect = this.itemLineRect(index)
    const statusWidth = this.statusWidth()
    const titleWidth = rect.width - statusWidth
    this.resetTextColor()
    this.changePaintOpacity(this.isCommandEnabled(index))
    this.drawText(title, rect.x, rect.y, titleWidth, 'left')
    this.drawText(status, rect.x + titleWidth, rect.y, statusWidth, 'right')
  }

  statusWidth(): number {
    return 120
  }

  statusText(index: number): string {
    const symbol = this.commandSymbol(index) as Window_Options.OptionSymbol
    const value = this.getConfigValue(symbol)
    if (this.isVolumeSymbol(symbol)) {
      return this.volumeStatusText(value as number)
    }
    else {
      return this.booleanStatusText(value as boolean)
    }
  }

  isVolumeSymbol(symbol: string): symbol is Window_Options.VolumeSymbol {
    return symbol.includes('Volume')
  }

  booleanStatusText(value: boolean): string {
    return value ? 'ON' : 'OFF'
  }

  volumeStatusText(value: number): string {
    return `${value}%`
  }

  processOk(): void {
    const index = this.index()
    const symbol = this.commandSymbol(index) as Window_Options.OptionSymbol
    if (this.isVolumeSymbol(symbol)) {
      this.changeVolume(symbol, true, true)
    }
    else {
      this.changeValue(symbol, !this.getConfigValue(symbol))
    }
  }

  cursorRight(): void {
    const index = this.index()
    const symbol = this.commandSymbol(index) as Window_Options.OptionSymbol
    if (this.isVolumeSymbol(symbol)) {
      this.changeVolume(symbol, true, false)
    }
    else {
      this.changeValue(symbol, true)
    }
  }

  cursorLeft(): void {
    const index = this.index()
    const symbol = this.commandSymbol(index) as Window_Options.OptionSymbol
    if (this.isVolumeSymbol(symbol)) {
      this.changeVolume(symbol, false, false)
    }
    else {
      this.changeValue(symbol, false)
    }
  }

  changeVolume(symbol: Window_Options.VolumeSymbol, forward: boolean, wrap: boolean): void {
    const lastValue = this.getConfigValue(symbol) as number
    const offset = this.volumeOffset()
    const value = lastValue + (forward ? offset : -offset)
    if (value > 100 && wrap) {
      this.changeValue(symbol, 0)
    }
    else {
      this.changeValue(symbol, value.clamp(0, 100))
    }
  }

  volumeOffset(): number {
    return 20
  }

  changeValue(symbol: Window_Options.OptionSymbol, value: boolean | number): void {
    const lastValue = this.getConfigValue(symbol)
    if (lastValue !== value) {
      this.setConfigValue(symbol, value)
      this.redrawItem(this.findSymbol(symbol))
      this.playCursorSound()
    }
  }

  getConfigValue(symbol: Window_Options.OptionSymbol): boolean | number {
    return ConfigManager[symbol]
  }

  setConfigValue(symbol: Window_Options.OptionSymbol, value: boolean | number): void {
    (ConfigManager as unknown as Record<string, boolean | number>)[symbol] = value
  }
}

export namespace Window_Options {
  export type VolumeSymbol = 'bgmVolume' | 'bgsVolume' | 'meVolume' | 'seVolume'
  export type BooleanSymbol = 'alwaysDash' | 'commandRemember' | 'touchUI'
  export type OptionSymbol = VolumeSymbol | BooleanSymbol
}
