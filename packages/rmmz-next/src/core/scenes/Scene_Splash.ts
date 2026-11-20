import { GlobalMananger } from '../managers/GlobalManager'
import { ImageManager } from '../managers/ImageManager'
import { SceneManager } from '../managers/SceneManager'
import { Input } from '../primitives/Input'
import { Sprite } from '../primitives/Sprite'
import { TouchInput } from '../primitives/TouchInput'
import { Scene_Base } from './Scene_Base'
import { Scene_Title } from './Scene_Title'

/*
 /* Scene_Splash
 /*
 /* The scene class of the splash screen.
 */
export class Scene_Splash extends Scene_Base {
  _backSprite!: Sprite
  _waitCount!: number

  constructor() {
    super()
    this.initWaitCount()
  }

  create(): void {
    super.create()
    if (this.isEnabled()) {
      this.createBackground()
    }
  }

  start(): void {
    super.start()
    if (this.isEnabled()) {
      this.adjustBackground()
      this.startFadeIn(this.fadeSpeed(), false)
    }
  }

  update(): void {
    super.update()
    if (this.isActive()) {
      if (!this.updateWaitCount()) {
        this.gotoTitle()
      }
      this.checkSkip()
    }
  }

  stop(): void {
    super.stop()
    if (this.isEnabled()) {
      this.startFadeOut(this.fadeSpeed())
    }
  }

  createBackground(): void {
    this._backSprite = new Sprite()
    this._backSprite.bitmap = ImageManager.loadSystem('Splash')
    this.addChild(this._backSprite)
  }

  adjustBackground(): void {
    this.scaleSprite(this._backSprite)
    this.centerSprite(this._backSprite)
  }

  isEnabled(): boolean {
    return GlobalMananger.$dataSystem.optSplashScreen
  }

  initWaitCount(): void {
    if (this.isEnabled()) {
      this._waitCount = 120
    }
    else {
      this._waitCount = 0
    }
  }

  updateWaitCount(): boolean {
    if (this._waitCount > 0) {
      this._waitCount--
      return true
    }
    return false
  }

  checkSkip(): void {
    if (Input.isTriggered('ok') || TouchInput.isTriggered()) {
      this._waitCount = 0
    }
  }

  gotoTitle(): void {
    SceneManager.goto(Scene_Title)
  }
}
