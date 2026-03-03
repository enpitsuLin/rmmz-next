import { Game_Actor } from "./Game_Actor";

/**
 * The wrapper class for an actor array.
 */
class Game_Actors {
  private _data: Game_Actor[] = [];

  constructor() {
    this._data = [];
  }

  actor(actorId: number) {
    if ($dataActors[actorId]) {
      if (!this._data[actorId]) {
        this._data[actorId] = new Game_Actor(actorId);
      }
      return this._data[actorId];
    }
    return null;
  }
}

export { Game_Actors };
