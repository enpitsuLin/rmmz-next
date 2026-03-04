/*
 /* Scene_Boot
 /*
 /* The scene class for initializing the entire game.
 */
export class Scene_Boot extends Scene_Base {
  constructor() {
    super()
    this._databaseLoaded = false
  }

  create() {
    super.create()
    DataManager.loadDatabase()
    StorageManager.updateForageKeys()
  }

  isReady() {
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

  onDatabaseLoaded() {
    this.setEncryptionInfo()
    this.loadSystemImages()
    this.loadPlayerData()
    this.loadGameFonts()
  }

  setEncryptionInfo() {
    const hasImages = $dataSystem.hasEncryptedImages
    const hasAudio = $dataSystem.hasEncryptedAudio
    const key = $dataSystem.encryptionKey
    Utils.setEncryptionInfo(hasImages, hasAudio, key)
  }

  loadSystemImages() {
    ColorManager.loadWindowskin()
    ImageManager.loadSystem('IconSet')
  }

  loadPlayerData() {
    DataManager.loadGlobalInfo()
    ConfigManager.load()
  }

  loadGameFonts() {
    const advanced = $dataSystem.advanced
    FontManager.load('rmmz-mainfont', advanced.mainFontFilename)
    FontManager.load('rmmz-numberfont', advanced.numberFontFilename)
  }

  isPlayerDataLoaded() {
    return DataManager.isGlobalInfoLoaded() && ConfigManager.isLoaded()
  }

  start() {
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

  startNormalGame() {
    this.checkPlayerLocation()
    DataManager.setupNewGame()
    Window_TitleCommand.initCommandPosition()
    SceneManager.goto(Scene_Splash)
  }

  resizeScreen() {
    const screenWidth = $dataSystem.advanced.screenWidth
    const screenHeight = $dataSystem.advanced.screenHeight
    Graphics.resize(screenWidth, screenHeight)
    Graphics.defaultScale = this.screenScale()
    this.adjustBoxSize()
    this.adjustWindow()
  }

  adjustBoxSize() {
    const uiAreaWidth = $dataSystem.advanced.uiAreaWidth
    const uiAreaHeight = $dataSystem.advanced.uiAreaHeight
    const boxMargin = 4
    Graphics.boxWidth = uiAreaWidth - boxMargin * 2
    Graphics.boxHeight = uiAreaHeight - boxMargin * 2
  }

  adjustWindow() {
    if (Utils.isNwjs()) {
      const scale = this.screenScale()
      const xDelta = Graphics.width * scale - window.innerWidth
      const yDelta = Graphics.height * scale - window.innerHeight
      window.moveBy(-xDelta / 2, -yDelta / 2)
      window.resizeBy(xDelta, yDelta)
    }
  }

  screenScale() {
    if ('screenScale' in $dataSystem.advanced) {
      return $dataSystem.advanced.screenScale
    }
    else {
      return 1
    }
  }

  updateDocumentTitle() {
    document.title = $dataSystem.gameTitle
  }

  checkPlayerLocation() {
    if ($dataSystem.startMapId === 0) {
      throw new Error('Player\'s starting position is not set')
    }
  }
}
