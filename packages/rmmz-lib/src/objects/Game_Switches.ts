/**
 * The game object class for switches.
 */
class Game_Switches {
  /**
   * @param { Game_Switches } [gameSwitches]
   */
  constructor(gameSwitches) {
    if (gameSwitches) {
      this._data = gameSwitches._data.clone();
    } else {
      this.clear();
    }
  }

  clear() {
    this._data = [];
  }

  value(switchId) {
    return !!this._data[switchId];
  }

  setValue(switchId, value) {
    if (switchId > 0 && switchId < $dataSystem.switches.length) {
      this._data[switchId] = value;
      this.onChange();
    }
  }

  onChange() {
    $gameMap.requestRefresh();
  }
}
