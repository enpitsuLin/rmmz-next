/**
 * The wrapper class for an actor array.
 */
class Game_Actors {

  /**
   * @param { Game_Actors } [gameActors]
   */
  constructor(gameActors) {
    this._data = [];

    if (gameActors) {
      gameActors._data.forEach((actor) => {
        if (actor?._actorId) this.actor(actor._actorId);
      });
    }
  }

  actor(actorId) {
    if ($dataActors[actorId]) {
      if (!this._data[actorId]) {
        this._data[actorId] = new Game_Actor(actorId);
      }
      return this._data[actorId];
    }
    return null;
  }
}
