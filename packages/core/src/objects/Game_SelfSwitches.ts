/**
 * The game object class for self switches.
 */
class Game_SelfSwitches {
  _data!: Record<string, true>

  constructor() {
    this.clear()
  }

  clear() {
    this._data = {}
  }

  value(key: string) {
    return !!this._data[key]
  }

  setValue(key: string, value: boolean) {
    if (value) {
      this._data[key] = true
    }
    else {
      delete this._data[key]
    }
    this.onChange()
  }

  onChange() {
    $gameMap.requestRefresh()
  }
}

export { Game_SelfSwitches }
