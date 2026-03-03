/**
 * The game object class for self switches.
 */
class Game_SelfSwitches {

  /**
   * @param { Game_SelfSwitches } [gameSelfSwitches]
   */
  constructor(gameSelfSwitches) {
    if (gameSelfSwitches) {
      this._data = {
        ...gameSelfSwitches._data
      };
    } else {
      this.clear();
    }
  }

  clear() {
    this._data = {};
  }

  value(key) {
    return !!this._data[key];
  }

  setValue(key, value) {
    if (value) {
      this._data[key] = true;
    } else {
      delete this._data[key];
    }
    this.onChange();
  }

  onChange() {
    $gameMap.requestRefresh();
  }
}
