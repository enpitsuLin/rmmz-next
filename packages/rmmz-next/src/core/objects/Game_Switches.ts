import { GlobalMananger } from '../managers/GlobalManager'
/**
 * The game object class for switches.
 */
class Game_Switches {
  _data!: boolean[]

  constructor() {
    this.clear()
  }

  clear(): void {
    this._data = []
  }

  value(switchId: number): boolean {
    return !!this._data[switchId]
  }

  setValue(switchId: number, value: boolean): void {
    if (switchId > 0 && switchId < GlobalMananger.$dataSystem.switches.length) {
      this._data[switchId] = value
      this.onChange()
    }
  }

  onChange(): void {
    GlobalMananger.$gameMap.requestRefresh()
  }
}

export { Game_Switches }
