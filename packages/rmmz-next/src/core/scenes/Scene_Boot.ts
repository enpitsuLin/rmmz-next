import { ColorManager } from '../managers/ColorManager'
import { ConfigManager } from '../managers/ConfigManager'
import { Database } from '../managers/Database'
import { DataManager } from '../managers/DataManager'
import { FontManager } from '../managers/FontManager'
import { GlobalMananger } from '../managers/GlobalManager'
import { ImageManager } from '../managers/ImageManager'
import { SavefileManager } from '../managers/SavefileManager'
import { SceneManager } from '../managers/SceneManager'
import { SoundManager } from '../managers/SoundManager'
import { StorageManager } from '../managers/StorageManager'
import { Graphics } from '../primitives/Graphics'
import { Utils } from '../primitives/Utils'
import { Window_TitleCommand } from '../windows/Window_TitleCommand'
import { Scene_Base } from './Scene_Base'

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
    const hasImages = GlobalMananger.$dataSystem.hasEncryptedImages
    const hasAudio = GlobalMananger.$dataSystem.hasEncryptedAudio
    const key = GlobalMananger.$dataSystem.encryptionKey
    Utils.setEncryptionInfo(hasImages, hasAudio, key)
  }

  loadSystemImages(): void {
    ColorManager.loadWindowskin()
    ImageManager.loadSystem('IconSet')
  }

  loadPlayerData(): void {
    SavefileManager.loadGlobalInfo()
    ConfigManager.load()
  }

  loadGameFonts(): void {
    const advanced = GlobalMananger.$dataSystem.advanced
    FontManager.load('rmmz-mainfont', advanced.mainFontFilename)
    FontManager.load('rmmz-numberfont', advanced.numberFontFilename)
  }

  isPlayerDataLoaded(): boolean {
    return SavefileManager.isGlobalInfoLoaded() && ConfigManager.isLoaded()
  }

  start(): void {
    super.start()
    SoundManager.preloadImportantSounds()
    if (Database.isBattleTest()) {
      DataManager.setupBattleTest()
      SceneManager.goto('Battle')
    }
    else if (Database.isEventTest()) {
      DataManager.setupEventTest()
      SceneManager.goto('Map')
    }
    else if (Database.isTitleSkip()) {
      this.checkPlayerLocation()
      DataManager.setupNewGame()
      SceneManager.goto('Map')
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
    SceneManager.goto('Splash')
  }

  resizeScreen(): void {
    const screenWidth = GlobalMananger.$dataSystem.advanced.screenWidth
    const screenHeight = GlobalMananger.$dataSystem.advanced.screenHeight
    Graphics.resize(screenWidth, screenHeight)
    Graphics.defaultScale = this.screenScale()
    this.adjustBoxSize()
    this.adjustWindow()
  }

  adjustBoxSize(): void {
    const uiAreaWidth = GlobalMananger.$dataSystem.advanced.uiAreaWidth
    const uiAreaHeight = GlobalMananger.$dataSystem.advanced.uiAreaHeight
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
    if ('screenScale' in GlobalMananger.$dataSystem.advanced) {
      return GlobalMananger.$dataSystem.advanced.screenScale!
    }
    else {
      return 1
    }
  }

  updateDocumentTitle(): void {
    document.title = GlobalMananger.$dataSystem.gameTitle
  }

  checkPlayerLocation(): void {
    if (GlobalMananger.$dataSystem.startMapId === 0) {
      throw new Error('Player\'s starting position is not set')
    }
  }
}
