/**
 * The game object class for variables.
 */
class Game_Variables {
  /**
   * @param { Game_Variables } [gameVariables]
   */
  constructor(gameVariables) {
    if (gameVariables) {
      this._data = gameVariables._data.clone();
    } else {
      this.clear();
    }
  }

  clear() {
    this._data = [];
  }

  value(variableId) {
    return this._data[variableId] || 0;
  }

  setValue(variableId, value) {
    if (variableId > 0 && variableId < $dataSystem.variables.length) {
      if (typeof value === "number") {
        value = Math.floor(value);
      }
      this._data[variableId] = value;
      this.onChange();
    }
  }

  onChange() {
    $gameMap.requestRefresh();
  }
}
