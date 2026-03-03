import { Game_Actor } from "./Game_Actor";

/**
 * The wrapper class for an actor array.
 */
class Game_Actors {
  private _data: Game_Actor[] = [];

  /**
   * @param { Game_Actors } [gameActors]
   */
  constructor(gameActors: Game_Actors) {
    this._data = [];

    if (gameActors) {
      gameActors._data.forEach((actor) => {
        if (actor?._actorId) this.actor(actor._actorId);
      });
    }
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
