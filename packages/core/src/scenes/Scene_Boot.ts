import { Graphics, Utils } from '../core'
import { StorageManager } from '../managers'
import { ColorManager } from '../managers/ColorManager'
import { ConfigManager } from '../managers/ConfigManager'
import { DataManager } from '../managers/DataManager'
import { FontManager } from '../managers/FontManager'
import { ImageManager } from '../managers/ImageManager'
import { SceneManager } from '../managers/SceneManager'
import { SoundManager } from '../managers/SoundManager'
import { Window_TitleCommand } from '../windows'
import { Scene_Base } from './Scene_Base'
import { Scene_Battle } from './Scene_Battle'
import { Scene_Map } from './Scene_Map'
import { Scene_Splash } from './Scene_Splash'

/*
 /* Scene_Boot
 /*
 /* The scene class for initializing the entire game.
 */
export class Scene_Boot extends Scene_Base {
  _databaseLoaded: boolean

  constructor() {
    super()
    this._databaseLoaded = false
  }

  create(): void {
    super.create()
    DataManager.loadDatabase()
    StorageManager.updateForageKeys()
  }

  isReady(): boolean {
    if (!this._databaseLoaded) {
      if (
        DataManager.isDatabaseLoaded()
        && StorageManager.forageKeysUpdated()
      ) {
        this._databaseLoaded = true
        this.onDatabaseLoaded()
      }
      return false
    }
    return super.isReady() && this.isPlayerDataLoaded()
  }

  onDatabaseLoaded(): void {
    this.setEncryptionInfo()
    this.loadSystemImages()
    this.loadPlayerData()
    this.loadGameFonts()
  }

  setEncryptionInfo(): void {
    const hasImages = $dataSystem.hasEncryptedImages
    const hasAudio = $dataSystem.hasEncryptedAudio
    const key = $dataSystem.encryptionKey
    Utils.setEncryptionInfo(hasImages, hasAudio, key)
  }

  loadSystemImages(): void {
    ColorManager.loadWindowskin()
    ImageManager.loadSystem('IconSet')
  }

  loadPlayerData(): void {
    DataManager.loadGlobalInfo()
    ConfigManager.load()
  }

  loadGameFonts(): void {
    const advanced = $dataSystem.advanced
    FontManager.load('rmmz-mainfont', advanced.mainFontFilename)
    FontManager.load('rmmz-numberfont', advanced.numberFontFilename)
  }

  isPlayerDataLoaded(): boolean {
    return DataManager.isGlobalInfoLoaded() && ConfigManager.isLoaded()
  }

  start(): void {
    super.start()
    SoundManager.preloadImportantSounds()
    if (DataManager.isBattleTest()) {
      DataManager.setupBattleTest()
      SceneManager.goto(Scene_Battle)
    }
    else if (DataManager.isEventTest()) {
      DataManager.setupEventTest()
      SceneManager.goto(Scene_Map)
    }
    else if (DataManager.isTitleSkip()) {
      this.checkPlayerLocation()
      DataManager.setupNewGame()
      SceneManager.goto(Scene_Map)
    }
    else {
      this.startNormalGame()
    }
    this.resizeScreen()
    this.updateDocumentTitle()
  }

  startNormalGame(): void {
    this.checkPlayerLocation()
    DataManager.setupNewGame()
    Window_TitleCommand.initCommandPosition()
    SceneManager.goto(Scene_Splash)
  }

  resizeScreen(): void {
    const screenWidth = $dataSystem.advanced.screenWidth
    const screenHeight = $dataSystem.advanced.screenHeight
    Graphics.resize(screenWidth, screenHeight)
    Graphics.defaultScale = this.screenScale()
    this.adjustBoxSize()
    this.adjustWindow()
  }

  adjustBoxSize(): void {
    const uiAreaWidth = $dataSystem.advanced.uiAreaWidth
    const uiAreaHeight = $dataSystem.advanced.uiAreaHeight
    const boxMargin = 4
    Graphics.boxWidth = uiAreaWidth - boxMargin * 2
    Graphics.boxHeight = uiAreaHeight - boxMargin * 2
  }

  adjustWindow(): void {
    if (Utils.isNwjs()) {
      const scale = this.screenScale()
      const xDelta = Graphics.width * scale - window.innerWidth
      const yDelta = Graphics.height * scale - window.innerHeight
      window.moveBy(-xDelta / 2, -yDelta / 2)
      window.resizeBy(xDelta, yDelta)
    }
  }

  screenScale(): number {
    if ('screenScale' in $dataSystem.advanced) {
      return $dataSystem.advanced.screenScale!
    }
    else {
      return 1
    }
  }

  updateDocumentTitle(): void {
    document.title = $dataSystem.gameTitle
  }

  checkPlayerLocation(): void {
    if ($dataSystem.startMapId === 0) {
      throw new Error('Player\'s starting position is not set')
    }
  }
}
