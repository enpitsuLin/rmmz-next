/*
 /* Scene_Load
 /*
 /* The scene class of the load screen.
 */
export class Scene_Load extends Scene_File {
  constructor() {
    super()
    this._loadSuccess = false
  }

  terminate() {
    super.terminate()
    if (this._loadSuccess) {
      $gameSystem.onAfterLoad()
    }
  }

  mode() {
    return 'load'
  }

  helpWindowText() {
    return TextManager.loadMessage
  }

  firstSavefileId() {
    return DataManager.latestSavefileId()
  }

  onSavefileOk() {
    super.onSavefileOk()
    const savefileId = this.savefileId()
    if (this.isSavefileEnabled(savefileId)) {
      this.executeLoad(savefileId)
    }
    else {
      this.onLoadFailure()
    }
  }

  executeLoad(savefileId) {
    DataManager.loadGame(savefileId)
      .then(() => this.onLoadSuccess())
      .catch(() => this.onLoadFailure())
  }

  onLoadSuccess() {
    SoundManager.playLoad()
    this.fadeOutAll()
    this.reloadMapIfUpdated()
    SceneManager.goto(Scene_Map)
    this._loadSuccess = true
  }

  onLoadFailure() {
    SoundManager.playBuzzer()
    this.activateListWindow()
  }

  reloadMapIfUpdated() {
    if ($gameSystem.versionId() !== $dataSystem.versionId) {
      const mapId = $gameMap.mapId()
      const x = $gamePlayer.x
      const y = $gamePlayer.y
      const d = $gamePlayer.direction()
      $gamePlayer.reserveTransfer(mapId, x, y, d, 0)
      $gamePlayer.requestMapReload()
    }
  }
}
