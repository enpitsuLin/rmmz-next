import { GlobalMananger } from '../managers/GlobalManager'
/**
 * The game object class for variables.
 */
export class Game_Variables {
  _data!: number[]

  constructor() {
    this.clear()
  }

  clear(): void {
    this._data = []
  }

  value(variableId: number): number {
    return this._data[variableId] || 0
  }

  setValue(variableId: number, value: number): void {
    if (variableId > 0 && variableId < GlobalMananger.$dataSystem.variables.length) {
      if (typeof value === 'number') {
        value = Math.floor(value)
      }
      this._data[variableId] = value
      this.onChange()
    }
  }

  onChange(): void {
    GlobalMananger.$gameMap.requestRefresh()
  }
}
