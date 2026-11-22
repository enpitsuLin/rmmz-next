import type { Game_NightwardRun } from '../objects/Game_NightwardRun'
import { AudioManager, GlobalMananger as globals, SceneManager } from 'rmmz-next'
import { NightwardAssetManager } from '../managers/NightwardAssetManager'
import { NightwardManager } from '../managers/NightwardManager'
import { NightwardAudio } from '../patches/AudioManager'
import { Spriteset_Nightward } from '../sprites/Spriteset_Nightward'
import { Window_NightwardTitle } from '../windows/Window_NightwardTitle'
import { Scene_Nightward } from './Scene_Nightward'
import { Scene_NightwardBase } from './Scene_NightwardBase'
import { Scene_NightwardHowTo } from './Scene_NightwardHowTo'
import { Scene_NightwardOptions } from './Scene_NightwardOptions'

/**
 * The Nightward title scene with a live 3D graveyard battle demo.
 */
export class Scene_NightwardTitle extends Scene_NightwardBase {
  private _run!: Game_NightwardRun
  private _spriteset: Spriteset_Nightward | null = null
  private _titleWindow!: Window_NightwardTitle
  private _handingOff = false

  override start(): void {
    super.start()
    const returning = NightwardManager.hasRetainedSpriteset() && NightwardManager.hasRun(true)
    if (returning) {
      this._run = NightwardManager.requireRun()
      this._spriteset = NightwardManager.takeRetainedSpriteset()!
    }
    else {
      this._run = NightwardManager.setup(true)
      this._spriteset = new Spriteset_Nightward(this._run, NightwardAssetManager.assets())
      AudioManager.stopMe()
      NightwardAudio.setBgmDuck(false)
      AudioManager.stopBgs()
      AudioManager.playBgm(globals.$dataSystem.titleBgm)
      this._run.commonEvents.queue('start')
    }
    this.drawLetterbox(1)
    this.addChild(this._spriteset, this._letterbox)
    this.createWindowLayer()
    this.createTitleWindow(!returning, returning)
    this.addChild(this._wipe)
    if (NightwardManager.consumeWipeReveal())
      this._wipe.play(false, 0.45)
    this.clearInput()
  }

  private createTitleWindow(playTitleSe: boolean, skipIntro: boolean): void {
    this._titleWindow = new Window_NightwardTitle(playTitleSe, skipIntro)
    this._titleWindow.setHandler('play', () => this.commandPlay())
    this._titleWindow.setHandler('howto', () => this.commandHowTo())
    this._titleWindow.setHandler('options', () => this.commandOptions())
    this.addWindow(this._titleWindow)
  }

  private commandPlay(): void {
    NightwardManager.setFromTitle(true)
    SceneManager.goto(Scene_Nightward)
  }

  private commandHowTo(): void {
    if (!this._spriteset || this._wipe.busy)
      return
    this._handingOff = true
    NightwardManager.retainForPush(this._spriteset)
    this._spriteset = null
    SceneManager.push(Scene_NightwardHowTo)
  }

  private commandOptions(): void {
    if (!this._spriteset || this._wipe.busy)
      return
    this._handingOff = true
    NightwardManager.retainForPush(this._spriteset)
    this._spriteset = null
    SceneManager.push(Scene_NightwardOptions)
  }

  override update(): void {
    this.updateGlobalHotkeys()
    if (!SceneManager.isSceneChanging() && this._run && this._run.state === 'running')
      this._run.update({ x: 0, z: 0 })
    NightwardManager.setSimulationFrozen(false)
    this._titleWindow.inputBlocked = this._wipe.busy
    super.update()
  }

  override destroy(): void {
    if (!this._handingOff) {
      this._spriteset?.destroy()
      this._spriteset = null
    }
    super.destroy()
  }
}
