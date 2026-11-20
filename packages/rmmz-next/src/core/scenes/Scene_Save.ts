import { GlobalMananger } from '../managers'
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

  mode(): 'save' {
    return 'save'
  }

  helpWindowText(): string {
    return TextManager.saveMessage
  }

  firstSavefileId(): number {
    return GlobalMananger.$gameSystem.savefileId()
  }

  onSavefileOk(): void {
    super.onSavefileOk()
    const savefileId = this.savefileId()
    if (this.isSavefileEnabled(savefileId)) {
      this.executeSave(savefileId)
    }
    else {
      this.onSaveFailure()
    }
  }

  executeSave(savefileId: number): void {
    GlobalMananger.$gameSystem.setSavefileId(savefileId)
    GlobalMananger.$gameSystem.onBeforeSave()
    DataManager.saveGame(savefileId)
      .then(() => this.onSaveSuccess())
      .catch(() => this.onSaveFailure())
  }

  onSaveSuccess(): void {
    SoundManager.playSave()
    this.popScene()
  }

  onSaveFailure(): void {
    SoundManager.playBuzzer()
    this.activateListWindow()
  }
}
