import { GlobalMananger } from '../managers/GlobalManager'
import { SavefileManager } from '../managers/SavefileManager'
import { SceneManager } from '../managers/SceneManager'
import { SoundManager } from '../managers/SoundManager'
import { TextManager } from '../managers/TextManager'
import { Scene_File } from './Scene_File'

/*
 /* Scene_Load
 /*
 /* The scene class of the load screen.
 */
export class Scene_Load extends Scene_File {
  _loadSuccess: boolean

  constructor() {
    super()
    this._loadSuccess = false
  }

  terminate(): void {
    super.terminate()
    if (this._loadSuccess) {
      GlobalMananger.$gameSystem.onAfterLoad()
    }
  }

  mode(): 'load' {
    return 'load'
  }

  helpWindowText(): string {
    return TextManager.loadMessage
  }

  firstSavefileId(): number {
    return SavefileManager.latestSavefileId()
  }

  onSavefileOk(): void {
    super.onSavefileOk()
    const savefileId = this.savefileId()
    if (this.isSavefileEnabled(savefileId)) {
      this.executeLoad(savefileId)
    }
    else {
      this.onLoadFailure()
    }
  }

  executeLoad(savefileId: number): void {
    SavefileManager.loadGame(savefileId)
      .then(() => this.onLoadSuccess())
      .catch(() => this.onLoadFailure())
  }

  onLoadSuccess(): void {
    SoundManager.playLoad()
    this.fadeOutAll()
    this.reloadMapIfUpdated()
    SceneManager.goto('Map')
    this._loadSuccess = true
  }

  onLoadFailure(): void {
    SoundManager.playBuzzer()
    this.activateListWindow()
  }

  reloadMapIfUpdated(): void {
    if (GlobalMananger.$gameSystem.versionId() !== GlobalMananger.$dataSystem.versionId) {
      const mapId = GlobalMananger.$gameMap.mapId()
      const x = GlobalMananger.$gamePlayer.x
      const y = GlobalMananger.$gamePlayer.y
      const d = GlobalMananger.$gamePlayer.direction()
      GlobalMananger.$gamePlayer.reserveTransfer(mapId, x, y, d, 0)
      GlobalMananger.$gamePlayer.requestMapReload()
    }
  }
}
