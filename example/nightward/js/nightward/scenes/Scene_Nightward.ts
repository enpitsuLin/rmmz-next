import type { Game_NightwardRun } from '../objects/Game_NightwardRun'
import type { PauseAction } from '../windows/Window_NightwardPause'
import { Container } from 'pixi.js'
import { AudioManager, GlobalMananger as globals, Input, SceneManager, SoundManager, TouchInput } from 'rmmz-next'
import { NightwardAssetManager } from '../managers/NightwardAssetManager'
import { NightwardManager } from '../managers/NightwardManager'
import { NightwardRecordManager } from '../managers/NightwardRecordManager'
import { NightwardAudio } from '../patches/AudioManager'
import { NightwardConfig } from '../patches/ConfigManager'
import { FRAME_DT, out, phase, reducedMotion } from '../primitives/ui'
import { Sprite_NightwardHud } from '../sprites/Sprite_NightwardHud'
import { Spriteset_Nightward } from '../sprites/Spriteset_Nightward'
import { Window_NightwardConfirm } from '../windows/Window_NightwardConfirm'
import { Window_NightwardPause } from '../windows/Window_NightwardPause'
import { Window_NightwardResults } from '../windows/Window_NightwardResults'
import { Window_NightwardReward } from '../windows/Window_NightwardReward'
import { Scene_NightwardBase } from './Scene_NightwardBase'
import { Scene_NightwardHowTo } from './Scene_NightwardHowTo'
import { Scene_NightwardOptions } from './Scene_NightwardOptions'
import { Scene_NightwardTitle } from './Scene_NightwardTitle'

/**
 * The active Nightward gameplay scene.
 * Coordinates the 3D spriteset, HUD, and modal windows inside WindowLayer,
 * while delegating Options and How To Play via SceneManager.push().
 */
export class Scene_Nightward extends Scene_NightwardBase {
  private _run!: Game_NightwardRun
  private _spriteset: Spriteset_Nightward | null = null
  private _hud: Sprite_NightwardHud | null = null
  private _flightRoot = new Container({ eventMode: 'none' })
  private _pauseWindow?: Window_NightwardPause
  private _confirmWindow?: Window_NightwardConfirm
  private _confirmAction?: 'restart' | 'title'
  private _rewardWindow?: Window_NightwardReward
  private _resultsWindow?: Window_NightwardResults
  private _handingOff = false
  private _resultHandled = false
  private _disposed = false
  private _busy = false
  private _letterboxAge = -1
  private _introPending = false
  private _chestWait = -1
  private _victoryAt = -1

  private onBlur = (): void => {
    if (this._run?.state === 'running' && !this._pauseWindow && !this._rewardWindow && !this._resultsWindow && !this._busy)
      this.requestPause()
  }

  private onVisibility = (): void => {
    if (document.hidden)
      this.onBlur()
  }

  get run(): Game_NightwardRun {
    return this._run
  }

  override start(): void {
    super.start()
    const returning = NightwardManager.hasRetainedSpriteset() && NightwardManager.hasRun(false)
    if (returning) {
      this._run = NightwardManager.requireRun()
      this._spriteset = NightwardManager.takeRetainedSpriteset()!
      this._hud = NightwardManager.takeRetainedHud()
      if (this._hud)
        this._hud.setPauseHandler(() => this.requestPause())
      else
        this._hud = new Sprite_NightwardHud(this._run, this._spriteset, () => this.requestPause())
      this._flightRoot.addChild(this._hud.flights)
      this.drawLetterbox(0)
      this.addChild(this._spriteset, this._letterbox, this._hud)
      this.createWindowLayer()
      this.addChild(this._flightRoot, this._wipe)
      if (this._run.state === 'paused')
        this.openPauseWindow(false)
    }
    else {
      const fromTitle = NightwardManager.consumeFromTitle()
      const wipeReveal = NightwardManager.consumeWipeReveal()
      this._run = NightwardManager.setup(false)
      this._spriteset = new Spriteset_Nightward(this._run, NightwardAssetManager.assets())
      this._spriteset.beginIntro(fromTitle)
      this._hud = new Sprite_NightwardHud(this._run, this._spriteset, () => this.requestPause())
      this._flightRoot.addChild(this._hud.flights)
      this._letterboxAge = fromTitle ? 0 : -1
      this.drawLetterbox(fromTitle ? 1 : 0)
      this.addChild(this._spriteset, this._letterbox, this._hud)
      this.createWindowLayer()
      this.addChild(this._flightRoot, this._wipe)

      AudioManager.stopMe()
      NightwardAudio.setBgmDuck(false)
      if (!globals.$dataMap.autoplayBgs)
        AudioManager.stopBgs()
      if (!globals.$dataMap.autoplayBgm)
        AudioManager.stopBgm()
      globals.$gameMap.autoplay()

      if (wipeReveal) {
        this._hud.setShown(false, 0)
        this._busy = true
        this._introPending = true
        this._wipe.play(false, 0.4)
      }
      else {
        this.beginRunIntro(fromTitle)
      }
    }
    this.clearInput()
    window.addEventListener('blur', this.onBlur)
    document.addEventListener('visibilitychange', this.onVisibility)
  }

  private beginRunIntro(fromTitle: boolean): void {
    this._busy = false
    this._run.resume()
    this._hud!.setShown(true, reducedMotion() ? 0.15 : 0.4, 0.15)
    this._hud!.showMoveHint(!NightwardConfig.nightwardSeenMoveHint)
    this._run.commonEvents.queue('start')
    if (fromTitle)
      this._letterboxAge = 0
  }

  override showNotice(message: string): void {
    this._hud?.showNotice(message)
  }

  override showBanner(title: string, subtitle: string, style: number, hold: number, slam: boolean): void {
    this._hud?.showBanner(title, subtitle, style, hold, slam)
  }

  override setTimerWarning(enabled: boolean): void {
    this._hud?.setTimerWarning(enabled)
  }

  override requestPause(): void {
    if (this._busy || this._pauseWindow || this._rewardWindow || this._resultsWindow || this._run.state !== 'running')
      return
    this._run.pause()
    this._hud!.blockPointer()
    this._hud!.setShown(false, 0.2)
    NightwardAudio.setBgmDuck(true)
    this.openPauseWindow(true)
    this.clearInput()
  }

  private openPauseWindow(playOpenSe: boolean): void {
    this._pauseWindow = new Window_NightwardPause(this._run, playOpenSe)
    this._pauseWindow.setHandler('resume', () => this.onPauseAction('resume'))
    this._pauseWindow.setHandler('options', () => this.onPauseAction('options'))
    this._pauseWindow.setHandler('howto', () => this.onPauseAction('howto'))
    this._pauseWindow.setHandler('restart', () => this.openConfirm('restart'))
    this._pauseWindow.setHandler('title', () => this.openConfirm('title'))
    this._pauseWindow.setHandler('cancel', () => this.onPauseAction('resume'))
    this.addWindow(this._pauseWindow)

    this._confirmWindow = new Window_NightwardConfirm()
    const anchor = this._pauseWindow.confirmAnchor()
    this._confirmWindow.placeAt(anchor.x, anchor.y)
    this._confirmWindow.setHandler('yes', () => {
      if (this._confirmAction)
        this.onPauseAction(this._confirmAction)
    })
    this._confirmWindow.setHandler('no', () => this.cancelConfirm())
    this._confirmWindow.setHandler('cancel', () => this.cancelConfirm())
    this.addWindow(this._confirmWindow)
  }

  private openConfirm(action: 'restart' | 'title'): void {
    if (!this._pauseWindow || !this._confirmWindow)
      return
    this._confirmAction = action
    this._pauseWindow.enterConfirm()
    this._confirmWindow.openPrompt()
    this.clearInput()
  }

  private cancelConfirm(): void {
    if (!this._pauseWindow || !this._confirmWindow || !this._confirmAction)
      return
    SoundManager.playCancel()
    const previous = this._confirmAction
    this._confirmAction = undefined
    this._confirmWindow.closePrompt()
    this._pauseWindow.leaveConfirm(previous)
    this.clearInput()
  }

  private onPauseAction(action: PauseAction): void {
    if (action === 'options' || action === 'howto') {
      if (!this._spriteset || this._busy)
        return
      this._handingOff = true
      NightwardManager.retainForPush(this._spriteset, this._hud)
      this._spriteset = null
      this._hud = null
      SceneManager.push(action === 'options' ? Scene_NightwardOptions : Scene_NightwardHowTo)
      return
    }
    if (action === 'restart' || action === 'title') {
      this.wipeTo(action === 'title')
      return
    }
    const screen = this._pauseWindow
    if (!screen || this._busy)
      return
    this._busy = true
    SoundManager.playCancel()
    screen.closeWithAnimation(() => {
      this.destroyPauseWindows()
      this._run.resume()
      this._hud!.setShown(true, 0.2)
      this._busy = false
      NightwardAudio.setBgmDuck(false)
      this.clearInput()
    }, 0.3)
  }

  private destroyPauseWindows(): void {
    this._pauseWindow?.removeFromParent()
    this._pauseWindow?.destroy({ children: true })
    this._pauseWindow = undefined
    this._confirmWindow?.removeFromParent()
    this._confirmWindow?.destroy({ children: true })
    this._confirmWindow = undefined
    this._confirmAction = undefined
  }

  private openReward(treasure: boolean): void {
    const rewards = [...(treasure ? this._run.chestRewards : this._run.choices)]
    this._hud!.setModal(true)
    NightwardAudio.setBgmDuck(true)
    this.clearInput()
    this._rewardWindow = new Window_NightwardReward(rewards, treasure, this._hud!.bandBottom, {
      pick: (index) => {
        this._hud!.hold(rewards[index]!)
        this._run.select(index)
      },
      fly: (reward, from) => this._hud!.fly(reward, from),
      done: () => {
        this._rewardWindow?.removeFromParent()
        this._rewardWindow?.destroy({ children: true })
        this._rewardWindow = undefined
        if (treasure)
          this._run.closeChest()
        this._hud!.setModal(false)
        NightwardAudio.setBgmDuck(false)
        this.clearInput()
      },
    })
    this.addWindow(this._rewardWindow)
  }

  private openResults(): void {
    this._resultHandled = true
    this._hud!.blockPointer()
    this._rewardWindow?.removeFromParent()
    this._rewardWindow?.destroy({ children: true })
    this._rewardWindow = undefined
    const before = { ...NightwardRecordManager.records() }
    const result = this._run.result!
    NightwardAudio.setBgmDuck(false)
    AudioManager.stopBgm()
    if (result.won) {
      this._victoryAt = 0
      this._spriteset?.beginDawn()
    }
    else {
      AudioManager.playMe(globals.$dataSystem.defeatMe)
      this._hud!.setShown(false, 0.6)
    }
    const screen = new Window_NightwardResults(result, before, this._run.content)
    screen.setHandler('retry', () => this.wipeTo(false))
    screen.setHandler('title', () => this.wipeTo(true))
    this._resultsWindow = screen
    this.addWindow(screen)
    void NightwardRecordManager.saveResult(result).then(() => {
      if (!this._disposed && !screen.destroyed)
        screen.setSaved()
    }).catch((error) => {
      console.error(error)
      if (!this._disposed && !screen.destroyed)
        screen.setSaved(true)
    })
    this.clearInput()
  }

  private wipeTo(toTitle: boolean): void {
    if (this._busy || this._wipe.busy)
      return
    this._busy = true
    if (this._pauseWindow)
      this._pauseWindow.live = false
    if (this._confirmWindow)
      this._confirmWindow.live = false
    if (this._resultsWindow)
      this._resultsWindow.live = false
    this._hud?.blockPointer()
    this._run.pause()
    this._wipe.play(true, 0.4, () => {
      NightwardManager.setWipeReveal(true)
      SceneManager.goto(toTitle ? Scene_NightwardTitle : Scene_Nightward)
    })
  }

  override update(): void {
    if (!this._run) {
      super.update()
      return
    }
    const dt = FRAME_DT
    this.updateGlobalHotkeys()
    const hasModal = !!(this._pauseWindow || this._rewardWindow || this._resultsWindow)
    if (!hasModal && !this._busy && this._run.state === 'running' && (Input.isTriggered('escape') || Input.isTriggered('pause') || TouchInput.isCancelled()))
      this.requestPause()

    const movement = !hasModal && !this._busy && this._run.state === 'running' ? this._hud!.movement() : { x: 0, z: 0 }
    const advancing = !this._busy && this._run.state === 'running'
    if (advancing)
      this._run.update(movement)

    if (this._run.state === 'results' && !this._resultHandled) {
      this.openResults()
    }
    else if (!hasModal && !this._busy) {
      if (this._run.state === 'choosing') {
        this.openReward(false)
      }
      else if (this._run.state === 'chest' && this._chestWait < 0) {
        if (this._run.chestGold) {
          this._run.closeChest()
        }
        else {
          for (const reward of this._run.chestRewards)
            this._hud!.hold(reward)
          this._chestWait = 0.6
        }
      }
    }

    if (this._chestWait >= 0) {
      this._chestWait -= dt
      if (this._chestWait <= 0) {
        this._chestWait = -1
        this.openReward(true)
      }
    }

    const frozen = this._run.state === 'paused' || this._run.state === 'choosing' || this._run.state === 'chest' || this._busy
    NightwardManager.setSimulationFrozen(frozen)

    for (const screen of [this._pauseWindow, this._confirmWindow, this._rewardWindow, this._resultsWindow]) {
      if (screen)
        screen.inputBlocked = this._busy || this._wipe.busy
    }

    // Standard RMMZ updateChildren() drives Spriteset_Nightward, Sprite_NightwardHud, WindowLayer, and Sprite_NightwardWipe.
    super.update()

    if (this._letterboxAge >= 0) {
      this._letterboxAge += dt
      this.drawLetterbox(1 - out(phase(this._letterboxAge, 0, reducedMotion() ? 0.15 : 1)))
      if (this._letterboxAge >= 1)
        this._letterboxAge = -1
    }
    if (this._victoryAt >= 0) {
      const before = this._victoryAt
      this._victoryAt += dt
      if (before < 1.4 && this._victoryAt >= 1.4)
        this._hud!.setShown(false, 0.6)
      if (this._victoryAt >= 1.8) {
        this._run.commonEvents.queue('victory')
        AudioManager.playMe(globals.$dataSystem.victoryMe)
        this._victoryAt = -1
      }
    }
    if (this._introPending && !this._wipe.busy) {
      this._introPending = false
      this.beginRunIntro(false)
    }
  }

  protected override clearInput(): void {
    super.clearInput()
    this._hud?.blockPointer()
  }

  override terminate(): void {
    super.terminate()
    window.removeEventListener('blur', this.onBlur)
    document.removeEventListener('visibilitychange', this.onVisibility)
    if (!this._handingOff)
      NightwardAudio.setBgmDuck(false)
  }

  override destroy(): void {
    this._disposed = true
    this.destroyPauseWindows()
    this._rewardWindow?.removeFromParent()
    this._rewardWindow?.destroy({ children: true })
    this._rewardWindow = undefined
    this._resultsWindow?.removeFromParent()
    this._resultsWindow?.destroy({ children: true })
    this._resultsWindow = undefined
    if (!this._handingOff) {
      this._hud?.destroy()
      this._hud = null
      this._spriteset?.destroy()
      this._spriteset = null
    }
    this._flightRoot.removeFromParent()
    this._flightRoot.destroy({ children: !this._handingOff })
    super.destroy()
  }
}
