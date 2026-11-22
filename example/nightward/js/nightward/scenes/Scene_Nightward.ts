import type { Sprite } from 'pixi.js'
import type { RunEvent } from '../objects/Game_NightwardRun'
import type { PauseAction } from '../windows/PauseScreen'
import type { UiScreen } from '../windows/UiScreen'
import { Container, Graphics as Draw } from 'pixi.js'
import { AudioManager, ConfigManager, DataManager, GlobalMananger as globals, Graphics, Input, Scene_Base, SoundManager, TouchInput } from 'rmmz-next'
import { assetsReady, getAssets, requestAssets } from '../managers/NightwardAssetManager'
import { duckMusic, sound } from '../managers/NightwardAudioManager'
import { settings, toggleMute } from '../managers/NightwardConfigManager'
import { readContent } from '../managers/NightwardDataManager'
import { getPropScene, propSceneReady, propSceneUrl } from '../managers/NightwardPropSceneManager'
import { loadRecords, records, saveResult } from '../managers/NightwardRecordManager'
import { Game_NightwardRun } from '../objects/Game_NightwardRun'
import { colors, consumeInput, fullscreen, out, phase, reducedMotion, uiLayout } from '../primitives/ui'
import { Sprite_NightwardHud } from '../sprites/Sprite_NightwardHud'
import { Sprite_NightwardWipe } from '../sprites/Sprite_NightwardWipe'
import { Spriteset_Nightward } from '../sprites/Spriteset_Nightward'
import { groundBitmaps } from '../sprites/Spriteset_NightwardGround'
import { box } from '../sprites/uiSprites'
import { HowToScreen } from '../windows/HowToScreen'
import { OptionsScreen } from '../windows/OptionsScreen'
import { PauseScreen } from '../windows/PauseScreen'
import { ResultsScreen } from '../windows/ResultsScreen'
import { RewardScreen } from '../windows/RewardScreen'
import { TitleScreen } from '../windows/TitleScreen'

export class Scene_Nightward extends Scene_Base {
  protected demo = false
  run!: Game_NightwardRun
  private worldView!: Spriteset_Nightward
  private hud?: Sprite_NightwardHud
  private worldRoot = new Container()
  private uiRoot = new Container()
  private flightRoot = new Container({ eventMode: 'none' })
  private letterbox = new Draw()
  private wipe = new Sprite_NightwardWipe()
  private sheetShade!: Sprite
  private base?: UiScreen
  private sheet?: UiScreen
  private reward?: RewardScreen
  private readyRecords = false
  private resultHandled = false
  private disposed = false
  private busy = false
  private letterboxAge = -1
  private introPending = false
  private chestWait = -1
  private victoryAt = -1
  private panelDim = 0
  private panelTarget = 0
  private onBlur = (): void => {
    if (!this.demo && this.run?.state === 'running' && !this.base && !this.reward && !this.busy)
      this.pause()
  }

  private onVisibility = (): void => {
    if (document.hidden)
      this.onBlur()
  }

  override create(): void {
    super.create()
    requestAssets()
    DataManager.loadMapData(globals.$dataSystem.startMapId)
    void loadRecords().then(() => {
      this.readyRecords = true
    })
  }

  override isReady(): boolean {
    if (!DataManager.isMapLoaded())
      return false
    groundBitmaps(globals.$dataTilesets[globals.$dataMap.tilesetId]!)
    return super.isReady() && assetsReady() && propSceneReady(propSceneUrl(globals.$dataMap.note)) && this.readyRecords
  }

  override start(): void {
    super.start()
    this.sheetShade = box(Graphics.width, Graphics.height, colors.night, 0)
    this.uiRoot.addChild(this.sheetShade)
    this.addChild(this.worldRoot, this.uiRoot, this.flightRoot, this.wipe)
    this.resetWorld(this.demo, false)
    if (!this.demo)
      this.beginRunIntro(false)
    window.addEventListener('blur', this.onBlur)
    document.addEventListener('visibilitychange', this.onVisibility)
  }

  private resetWorld(demo: boolean, fromTitle: boolean): void {
    this.clearScreens()
    this.hud?.destroy()
    this.hud = undefined
    this.worldView?.destroy()
    this.run?.dispose()
    this.letterbox.removeFromParent()
    this.demo = demo
    this.resultHandled = false
    this.chestWait = this.victoryAt = -1
    this.introPending = false
    this.run = new Game_NightwardRun(readContent(), getPropScene(propSceneUrl(globals.$dataMap.note)), demo)
    this.worldView = new Spriteset_Nightward(this.run, getAssets())
    this.worldView.beginIntro(fromTitle)
    this.worldRoot.addChild(this.worldView.view, this.worldView.overlay, this.letterbox)
    if (demo) {
      this.base = new TitleScreen(() => {
        this.resetWorld(false, true)
        this.beginRunIntro(true)
      }, kind => this.openSheet(kind))
      this.uiRoot.addChildAt(this.base, 0)
      this.letterboxAge = -1
      this.drawLetterbox(1)
    }
    else {
      this.hud = new Sprite_NightwardHud(this.run, () => this.pause())
      this.worldRoot.addChild(this.hud)
      this.flightRoot.addChild(this.hud.flights)
      this.letterboxAge = fromTitle ? 0 : -1
      this.drawLetterbox(fromTitle ? 1 : 0)
    }
    AudioManager.stopMe()
    duckMusic(false)
    if (demo || !globals.$dataMap.autoplayBgs)
      AudioManager.stopBgs()
    if (demo) {
      AudioManager.playBgm(globals.$dataSystem.titleBgm)
    }
    else {
      if (!globals.$dataMap.autoplayBgm)
        AudioManager.stopBgm()
      globals.$gameMap.autoplay()
    }
    this.clearInput()
    if (demo)
      this.startPhases()
  }

  private beginRunIntro(fromTitle: boolean): void {
    this.busy = false
    this.run.resume()
    this.hud!.setShown(true, reducedMotion() ? 0.15 : 0.4, 0.15)
    this.hud!.showMoveHint(!settings.seenMoveHint)
    this.startPhases()
    if (fromTitle)
      this.letterboxAge = 0
  }

  private startPhases(): void {
    this.run.commonEvents.queue('start')
  }

  showNotice(message: string): void {
    this.hud?.showNotice(message)
  }

  showBanner(title: string, subtitle: string, style: number, hold: number, slam: boolean): void {
    this.hud?.showBanner(title, subtitle, style, hold, slam)
  }

  setTimerWarning(enabled: boolean): void {
    this.hud?.setTimerWarning(enabled)
  }

  override update(): void {
    super.update()
    if (!this.run)
      return
    const dt = 1 / 60
    if (Input.isTriggered('mute'))
      toggleMute()
    if (Input.isTriggered('fullscreen'))
      fullscreen()
    if (!this.demo && !this.base && !this.reward && !this.busy && this.run.state === 'running' && (Input.isTriggered('escape') || Input.isTriggered('pause') || TouchInput.isCancelled()))
      this.pause()
    const movement = !this.demo && !this.base && !this.reward && !this.busy && this.run.state === 'running' ? this.hud!.movement() : { x: 0, z: 0 }
    const advancing = (!this.busy || this.demo) && this.run.state === 'running'
    if (advancing)
      this.run.update(movement)
    const events = this.run.events.splice(0)
    this.consumeAudio(events)
    if (!this.demo) {
      if (this.run.state === 'results' && !this.resultHandled) {
        this.finish()
      }
      else if (!this.reward && !this.base && !this.busy) {
        if (this.run.state === 'choosing') {
          this.openReward(false)
        }
        else if (this.run.state === 'chest' && this.chestWait < 0) {
          if (this.run.chestGold) {
            this.run.closeChest()
          }
          else {
            for (const reward of this.run.chestRewards) this.hud!.hold(reward)
            this.chestWait = 0.6
          }
        }
      }
    }
    if (this.chestWait >= 0) {
      this.chestWait -= dt
      if (this.chestWait <= 0) {
        this.chestWait = -1
        this.openReward(true)
      }
    }
    const frozen = this.run.state === 'paused' || this.run.state === 'choosing' || this.run.state === 'chest' || (this.busy && !this.demo)
    this.worldView.update(events, frozen ? 0 : dt)
    this.hud?.tick(events, this.worldView, dt)
    if (this.letterboxAge >= 0) {
      this.letterboxAge += dt
      this.drawLetterbox(1 - out(phase(this.letterboxAge, 0, reducedMotion() ? 0.15 : 1)))
      if (this.letterboxAge >= 1)
        this.letterboxAge = -1
    }
    this.panelDim += (this.panelTarget - this.panelDim) * Math.min(1, dt * 20)
    this.sheetShade.alpha = this.panelDim
    for (const screen of [this.base, this.sheet, this.reward]) {
      if (screen)
        screen.inputBlocked = this.busy || this.wipe.busy
    }
    this.base?.tick(dt)
    this.sheet?.tick(dt)
    this.reward?.tick(dt)
    this.wipe.tick(dt)
    if (this.victoryAt >= 0) {
      const before = this.victoryAt
      this.victoryAt += dt
      if (before < 1.4 && this.victoryAt >= 1.4)
        this.hud!.setShown(false, 0.6)
      if (this.victoryAt >= 1.8) {
        this.run.commonEvents.queue('victory')
        AudioManager.playMe(globals.$dataSystem.victoryMe)
        this.victoryAt = -1
      }
    }
    if (this.introPending && !this.wipe.busy) {
      this.introPending = false
      this.beginRunIntro(false)
    }
  }

  private drawLetterbox(amount: number): void {
    const l = uiLayout()
    const band = Math.round(l.h * (l.portrait ? 0.05 : 0.06) * amount) * l.unit
    this.letterbox.clear()
    if (band > 0)
      this.letterbox.rect(0, 0, Graphics.width, band).rect(0, Graphics.height - band, Graphics.width, band).fill(0)
  }

  private consumeAudio(events: RunEvent[]): void {
    const kinds = new Set(events.map(event => event.kind))
    const se = this.run.content.config.sounds
    if (kinds.has('lash'))
      sound(se.lash, 25)
    if (kinds.has('wand'))
      sound(se.wand, 22)
    if (kinds.has('tomes'))
      sound(se.tomes, 25)
    if (kinds.has('ward'))
      sound(se.ward, 20)
    if (kinds.has('hurt'))
      SoundManager.playActorDamage()
    else if (kinds.has('lightning'))
      sound(se.lightning, 30)
    else if (kinds.has('hit'))
      SoundManager.playEnemyDamage()
    if (kinds.has('pickup'))
      SoundManager.playUseItem()
    if (kinds.has('relic'))
      sound(se.relic, 70)
    if (kinds.has('flask'))
      sound(se.flask, 23)
  }

  pause(): void {
    if (this.demo || this.busy || this.base || this.reward || this.run.state !== 'running')
      return
    this.run.pause()
    this.hud!.blockPointer()
    this.hud!.setShown(false, 0.2)
    duckMusic(true)
    this.base = new PauseScreen(this.run, action => this.pauseAction(action))
    this.uiRoot.addChildAt(this.base, 0)
    this.clearInput()
  }

  private pauseAction(action: PauseAction): void {
    if (action === 'options' || action === 'howto') {
      this.openSheet(action)
    }
    else if (action === 'restart' || action === 'title') {
      this.wipeTo(action === 'title')
    }
    else {
      const screen = this.base
      if (!screen || this.busy)
        return
      this.busy = true
      SoundManager.playCancel()
      screen.close(() => {
        screen.destroy({ children: true })
        this.base = undefined
        this.run.resume()
        this.hud!.setShown(true, 0.2)
        this.busy = false
        duckMusic(false)
        this.clearInput()
      }, 0.3)
    }
    if (action !== 'resume')
      duckMusic(true)
  }

  private openSheet(kind: 'options' | 'howto'): void {
    if (this.sheet || this.busy)
      return
    this.base!.live = false
    this.base!.dimmed = true
    this.panelTarget = this.demo ? 0.5 : 0
    const back = (): void => this.closeSheet()
    this.sheet = kind === 'options' ? new OptionsScreen(back) : new HowToScreen(back, this.run.content)
    this.uiRoot.addChild(this.sheet)
    this.clearInput()
  }

  private closeSheet(): void {
    const sheet = this.sheet
    if (!sheet || this.busy)
      return
    this.busy = true
    SoundManager.playCancel()
    ConfigManager.save()
    sheet.close(() => {
      sheet.destroy({ children: true })
      this.sheet = undefined
      this.base!.dimmed = false
      this.base!.live = true
      this.panelTarget = 0
      this.busy = false
      this.clearInput()
    })
  }

  private openReward(treasure: boolean): void {
    const rewards = [...(treasure ? this.run.chestRewards : this.run.choices)]
    this.hud!.setModal(true)
    duckMusic(true)
    this.clearInput()
    this.reward = new RewardScreen(rewards, treasure, this.hud!.bandBottom, {
      pick: (index) => {
        this.hud!.hold(rewards[index]!)
        this.run.select(index)
      },
      fly: (reward, from) => this.hud!.fly(reward, from),
      done: () => {
        this.reward!.destroy({ children: true })
        this.reward = undefined
        if (treasure)
          this.run.closeChest()
        this.hud!.setModal(false)
        duckMusic(false)
        this.clearInput()
      },
    })
    this.uiRoot.addChild(this.reward)
  }

  private finish(): void {
    this.resultHandled = true
    this.hud!.blockPointer()
    this.reward?.destroy({ children: true })
    this.reward = undefined
    const before = { ...records }
    const result = this.run.result!
    duckMusic(false)
    AudioManager.stopBgm()
    if (result.won) {
      this.victoryAt = 0
      this.worldView.beginDawn()
    }
    else {
      AudioManager.playMe(globals.$dataSystem.defeatMe)
      this.hud!.setShown(false, 0.6)
    }
    const screen = new ResultsScreen(result, before, this.run.content, () => this.wipeTo(false), () => this.wipeTo(true))
    this.base = screen
    this.uiRoot.addChildAt(screen, 0)
    void saveResult(result).then(() => {
      if (!this.disposed && !screen.destroyed)
        screen.setSaved()
    }).catch((error) => {
      console.error(error)
      if (!this.disposed && !screen.destroyed)
        screen.setSaved(true)
    })
    this.clearInput()
  }

  private wipeTo(demo: boolean): void {
    if (this.busy || this.wipe.busy)
      return
    this.busy = true
    if (this.base)
      this.base.live = false
    this.hud?.blockPointer()
    this.run.pause()
    this.wipe.play(true, 0.4, () => {
      this.resetWorld(demo, false)
      if (demo) {
        this.busy = false
        this.wipe.play(false, 0.45)
        return
      }
      this.hud!.setShown(false, 0)
      this.busy = true
      this.introPending = true
      this.wipe.play(false, 0.4)
    })
  }

  private clearInput(): void {
    consumeInput()
    this.hud?.blockPointer()
  }

  private clearScreens(): void {
    for (const screen of [this.base, this.sheet, this.reward]) screen?.destroy({ children: true })
    this.base = this.sheet = this.reward = undefined
    this.panelDim = this.panelTarget = 0
    if (this.sheetShade)
      this.sheetShade.alpha = 0
  }

  override terminate(): void {
    super.terminate()
    window.removeEventListener('blur', this.onBlur)
    document.removeEventListener('visibilitychange', this.onVisibility)
    duckMusic(false)
  }

  override destroy(): void {
    this.disposed = true
    this.clearScreens()
    this.hud?.destroy()
    this.worldView?.destroy()
    this.run?.dispose()
    for (const node of [this.worldRoot, this.uiRoot, this.flightRoot, this.wipe]) {
      node.removeFromParent()
      node.destroy({ children: true })
    }
    super.destroy()
  }
}
