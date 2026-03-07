import { GlobalMananger } from '../managers'
/**
 * The game object class for self switches.
 */
export class Game_SelfSwitches {
  _data!: Record<string, true>

  constructor() {
    this.clear()
  }

  clear(): void {
    this._data = {}
  }

  value(key: string): boolean {
    return !!this._data[key]
  }

  setValue(key: string, value: boolean): void {
    if (value) {
      this._data[key] = true
    }
    else {
      delete this._data[key]
    }
    this.onChange()
  }

  onChange(): void {
    GlobalMananger.$gameMap.requestRefresh()
  }
}
