import { Input, Sprite, TouchInput } from '../core'
import { AudioManager, GlobalMananger, ImageManager, SceneManager } from '../managers'
import { Scene_Base } from './Scene_Base'
import { Scene_Title } from './Scene_Title'

/**
 * The scene class of the game over screen.
 */
export class Scene_Gameover extends Scene_Base {
  _backSprite!: Sprite

  create(): void {
    super.create()
    this.playGameoverMusic()
    this.createBackground()
  }

  start(): void {
    super.start()
    this.adjustBackground()
    this.startFadeIn(this.slowFadeSpeed(), false)
  }

  update(): void {
    if (this.isActive() && !this.isBusy() && this.isTriggered()) {
      this.gotoTitle()
    }
    super.update()
  }

  stop(): void {
    super.stop()
    this.fadeOutAll()
  }

  terminate(): void {
    super.terminate()
    AudioManager.stopAll()
  }

  playGameoverMusic(): void {
    AudioManager.stopBgm()
    AudioManager.stopBgs()
    AudioManager.playMe(GlobalMananger.$dataSystem.gameoverMe)
  }

  createBackground(): void {
    this._backSprite = new Sprite()
    this._backSprite.bitmap = ImageManager.loadSystem('GameOver')
    this.addChild(this._backSprite)
  }

  adjustBackground(): void {
    this.scaleSprite(this._backSprite)
    this.centerSprite(this._backSprite)
  }

  isTriggered(): boolean {
    return Input.isTriggered('ok') || TouchInput.isTriggered()
  }

  gotoTitle(): void {
    SceneManager.goto(Scene_Title)
  }
}
