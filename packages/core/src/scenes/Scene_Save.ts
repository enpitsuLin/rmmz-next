import { DataManager } from '../managers/DataManager'
import { SoundManager } from '../managers/SoundManager'
import { TextManager } from '../managers/TextManager'
import { Scene_File } from './Scene_File'

/*
 /* Scene_Save
 /*
 /* The scene class of the save screen.
 */
export class Scene_Save extends Scene_File {
  constructor() {
    super()
  }

  mode() {
    return 'save'
  }

  helpWindowText() {
    return TextManager.saveMessage
  }

  firstSavefileId() {
    return $gameSystem.savefileId()
  }

  onSavefileOk() {
    super.onSavefileOk()
    const savefileId = this.savefileId()
    if (this.isSavefileEnabled(savefileId)) {
      this.executeSave(savefileId)
    }
    else {
      this.onSaveFailure()
    }
  }

  executeSave(savefileId) {
    $gameSystem.setSavefileId(savefileId)
    $gameSystem.onBeforeSave()
    DataManager.saveGame(savefileId)
      .then(() => this.onSaveSuccess())
      .catch(() => this.onSaveFailure())
  }

  onSaveSuccess() {
    SoundManager.playSave()
    this.popScene()
  }

  onSaveFailure() {
    SoundManager.playBuzzer()
    this.activateListWindow()
  }
}
