import { Graphics, Input, Rectangle, TouchInput } from '../core'
import { AudioManager } from '../managers/AudioManager'
import { BattleManager } from '../managers/BattleManager'
import { ConfigManager } from '../managers/ConfigManager'
import { DataManager } from '../managers/DataManager'
import { EffectManager } from '../managers/EffectManager'
import { ImageManager } from '../managers/ImageManager'
import { SceneManager } from '../managers/SceneManager'
import { SoundManager } from '../managers/SoundManager'
import { Sprite_Button, Spriteset_Map } from '../sprites'
import { Window_MapName, Window_MenuCommand } from '../windows'
import { Scene_Battle } from './Scene_Battle'
import { Scene_Debug } from './Scene_Debug'
import { Scene_Gameover } from './Scene_Gameover'
import { Scene_Load } from './Scene_Load'
import { Scene_Menu } from './Scene_Menu'
import { Scene_Message } from './Scene_Message'
import { Scene_Title } from './Scene_Title'

/*
 /* Scene_Map
 /*
 /* The scene class of the map screen.
 */
export class Scene_Map extends Scene_Message {
  constructor() {
    super()
    this._waitCount = 0
    this._encounterEffectDuration = 0
    this._mapLoaded = false
    this._touchCount = 0
    this._menuEnabled = false
  }

  create() {
    super.create()
    this._transfer = $gamePlayer.isTransferring()
    this._lastMapWasNull = !$dataMap
    if (this._transfer) {
      DataManager.loadMapData($gamePlayer.newMapId())
      this.onTransfer()
    }
    else {
      DataManager.loadMapData($gameMap.mapId())
    }
  }

  isReady() {
    if (!this._mapLoaded && DataManager.isMapLoaded()) {
      this.onMapLoaded()
      this._mapLoaded = true
    }
    return this._mapLoaded && super.isReady()
  }

  onMapLoaded() {
    if (this._transfer) {
      $gamePlayer.performTransfer()
    }
    this.createDisplayObjects()
  }

  onTransfer() {
    ImageManager.clear()
    EffectManager.clear()
  }

  start() {
    super.start()
    SceneManager.clearStack()
    if (this._transfer) {
      this.fadeInForTransfer()
      this.onTransferEnd()
    }
    else if (this.needsFadeIn()) {
      this.startFadeIn(this.fadeSpeed(), false)
    }
    this.menuCalling = false
  }

  onTransferEnd() {
    this._mapNameWindow.open()
    $gameMap.autoplay()
    if (this.shouldAutosave()) {
      this.requestAutosave()
    }
  }

  shouldAutosave() {
    return !this._lastMapWasNull
  }

  update() {
    super.update()
    this.updateDestination()
    this.updateMenuButton()
    this.updateMapNameWindow()
    this.updateMainMultiply()
    if (this.isSceneChangeOk()) {
      this.updateScene()
    }
    else if (SceneManager.isNextScene(Scene_Battle)) {
      this.updateEncounterEffect()
    }
    this.updateWaitCount()
  }

  updateMainMultiply() {
    if (this.isFastForward()) {
      this.cancelMessageWait()
      this.updateMain()
    }
    this.updateMain()
  }

  updateMain() {
    $gameMap.update(this.isActive())
    $gamePlayer.update(this.isPlayerActive())
    $gameTimer.update(this.isActive())
    $gameScreen.update()
  }

  isPlayerActive() {
    return this.isActive() && !this.isFading()
  }

  isFastForward() {
    return (
      $gameMap.isEventRunning()
      && !SceneManager.isSceneChanging()
      && (Input.isLongPressed('ok') || TouchInput.isLongPressed())
    )
  }

  stop() {
    super.stop()
    $gamePlayer.straighten()
    this._mapNameWindow.close()
    if (this.needsSlowFadeOut()) {
      this.startFadeOut(this.slowFadeSpeed(), false)
    }
    else if (SceneManager.isNextScene(Scene_Map)) {
      this.fadeOutForTransfer()
    }
    else if (SceneManager.isNextScene(Scene_Battle)) {
      this.launchBattle()
    }
  }

  isBusy() {
    return (
      this.isMessageWindowClosing()
      || this._waitCount > 0
      || this._encounterEffectDuration > 0
      || super.isBusy()
    )
  }

  terminate() {
    super.terminate()
    if (!SceneManager.isNextScene(Scene_Battle)) {
      this._spriteset.update()
      this._mapNameWindow.hide()
      this.hideMenuButton()
      SceneManager.snapForBackground()
    }
    $gameScreen.clearZoom()
  }

  needsFadeIn() {
    return (
      SceneManager.isPreviousScene(Scene_Battle)
      || SceneManager.isPreviousScene(Scene_Load)
    )
  }

  needsSlowFadeOut() {
    return (
      SceneManager.isNextScene(Scene_Title)
      || SceneManager.isNextScene(Scene_Gameover)
    )
  }

  updateWaitCount() {
    if (this._waitCount > 0) {
      this._waitCount--
      return true
    }
    return false
  }

  updateDestination() {
    if (this.isMapTouchOk()) {
      this.processMapTouch()
    }
    else {
      $gameTemp.clearDestination()
      this._touchCount = 0
    }
  }

  updateMenuButton() {
    if (this._menuButton) {
      const menuEnabled = this.isMenuEnabled()
      if (menuEnabled === this._menuEnabled) {
        this._menuButton.visible = this._menuEnabled
      }
      else {
        this._menuEnabled = menuEnabled
      }
    }
  }

  hideMenuButton() {
    if (this._menuButton) {
      this._menuButton.visible = false
      this._menuEnabled = false
    }
  }

  updateMapNameWindow() {
    if ($gameMessage.isBusy()) {
      this._mapNameWindow.close()
    }
  }

  isMenuEnabled() {
    return $gameSystem.isMenuEnabled() && !$gameMap.isEventRunning()
  }

  isMapTouchOk() {
    return this.isActive() && $gamePlayer.canMove()
  }

  processMapTouch() {
    if (TouchInput.isTriggered() || this._touchCount > 0) {
      if (TouchInput.isPressed() && !this.isAnyButtonPressed()) {
        if (this._touchCount === 0 || this._touchCount >= 15) {
          this.onMapTouch()
        }
        this._touchCount++
      }
      else {
        this._touchCount = 0
      }
    }
  }

  isAnyButtonPressed() {
    return this._menuButton && this._menuButton.isPressed()
  }

  onMapTouch() {
    const x = $gameMap.canvasToMapX(TouchInput.x)
    const y = $gameMap.canvasToMapY(TouchInput.y)
    $gameTemp.setDestination(x, y)
  }

  isSceneChangeOk() {
    return this.isActive() && !$gameMessage.isBusy()
  }

  updateScene() {
    this.checkGameover()
    if (!SceneManager.isSceneChanging()) {
      this.updateTransferPlayer()
    }
    if (!SceneManager.isSceneChanging()) {
      this.updateEncounter()
    }
    if (!SceneManager.isSceneChanging()) {
      this.updateCallMenu()
    }
    if (!SceneManager.isSceneChanging()) {
      this.updateCallDebug()
    }
  }

  createDisplayObjects() {
    this.createSpriteset()
    this.createWindowLayer()
    this.createAllWindows()
    this.createButtons()
  }

  createSpriteset() {
    this._spriteset = new Spriteset_Map()
    this.addChild(this._spriteset)
    this._spriteset.update()
  }

  createAllWindows() {
    this.createMapNameWindow()
    super.createAllWindows()
  }

  createMapNameWindow() {
    const rect = this.mapNameWindowRect()
    this._mapNameWindow = new Window_MapName(rect)
    this.addWindow(this._mapNameWindow)
  }

  mapNameWindowRect() {
    const wx = 0
    const wy = 0
    const ww = 360
    const wh = this.calcWindowHeight(1, false)
    return new Rectangle(wx, wy, ww, wh)
  }

  createButtons() {
    if (ConfigManager.touchUI) {
      this.createMenuButton()
    }
  }

  createMenuButton() {
    this._menuButton = new Sprite_Button('menu')
    this._menuButton.x = Graphics.boxWidth - this._menuButton.width - 4
    this._menuButton.y = this.buttonY()
    this._menuButton.visible = false
    this.addWindow(this._menuButton)
  }

  updateTransferPlayer() {
    if ($gamePlayer.isTransferring()) {
      SceneManager.goto(Scene_Map)
    }
  }

  updateEncounter() {
    if ($gamePlayer.executeEncounter()) {
      SceneManager.push(Scene_Battle)
    }
  }

  updateCallMenu() {
    if (this.isMenuEnabled()) {
      if (this.isMenuCalled()) {
        this.menuCalling = true
      }
      if (this.menuCalling && !$gamePlayer.isMoving()) {
        this.callMenu()
      }
    }
    else {
      this.menuCalling = false
    }
  }

  isMenuCalled() {
    return Input.isTriggered('menu') || TouchInput.isCancelled()
  }

  callMenu() {
    SoundManager.playOk()
    SceneManager.push(Scene_Menu)
    Window_MenuCommand.initCommandPosition()
    $gameTemp.clearDestination()
    this._mapNameWindow.hide()
    this._waitCount = 2
  }

  updateCallDebug() {
    if (this.isDebugCalled()) {
      SceneManager.push(Scene_Debug)
    }
  }

  isDebugCalled() {
    return Input.isTriggered('debug') && $gameTemp.isPlaytest()
  }

  fadeInForTransfer() {
    const fadeType = $gamePlayer.fadeType()
    switch (fadeType) {
      case 0:
      case 1:
        this.startFadeIn(this.fadeSpeed(), fadeType === 1)
        break
    }
  }

  fadeOutForTransfer() {
    const fadeType = $gamePlayer.fadeType()
    switch (fadeType) {
      case 0:
      case 1:
        this.startFadeOut(this.fadeSpeed(), fadeType === 1)
        break
    }
  }

  launchBattle() {
    BattleManager.saveBgmAndBgs()
    this.stopAudioOnBattleStart()
    SoundManager.playBattleStart()
    this.startEncounterEffect()
    this._mapNameWindow.hide()
  }

  stopAudioOnBattleStart() {
    if (!AudioManager.isCurrentBgm($gameSystem.battleBgm())) {
      AudioManager.stopBgm()
    }
    AudioManager.stopBgs()
    AudioManager.stopMe()
    AudioManager.stopSe()
  }

  startEncounterEffect() {
    this._spriteset.hideCharacters()
    this._encounterEffectDuration = this.encounterEffectSpeed()
  }

  updateEncounterEffect() {
    if (this._encounterEffectDuration > 0) {
      this._encounterEffectDuration--
      const speed = this.encounterEffectSpeed()
      const n = speed - this._encounterEffectDuration
      const p = n / speed
      const q = ((p - 1) * 20 * p + 5) * p + 1
      const zoomX = $gamePlayer.screenX()
      const zoomY = $gamePlayer.screenY() - 24
      if (n === 2) {
        $gameScreen.setZoom(zoomX, zoomY, 1)
        this.snapForBattleBackground()
        this.startFlashForEncounter(speed / 2)
      }
      $gameScreen.setZoom(zoomX, zoomY, q)
      if (n === Math.floor(speed / 6)) {
        this.startFlashForEncounter(speed / 2)
      }
      if (n === Math.floor(speed / 2)) {
        BattleManager.playBattleBgm()
        this.startFadeOut(this.fadeSpeed())
      }
    }
  }

  snapForBattleBackground() {
    this._windowLayer.visible = false
    SceneManager.snapForBackground()
    this._windowLayer.visible = true
  }

  startFlashForEncounter(duration) {
    const color = [255, 255, 255, 255]
    $gameScreen.startFlash(color, duration)
  }

  encounterEffectSpeed() {
    return 60
  }
}
