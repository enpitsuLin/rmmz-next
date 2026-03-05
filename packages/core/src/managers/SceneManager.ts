import type { Scene_Base } from '../scenes/Scene_Base'
import { Bitmap, Graphics, Input, TouchInput, Utils, Video, WebAudio } from '../core'
import { AudioManager } from './AudioManager'
import { EffectManager } from './EffectManager'
import { ImageManager } from './ImageManager'
import { PluginManager } from './PluginManager'

type SceneConstructor = new (...args: unknown[]) => Scene_Base

/**
 * SceneManager
 *
 * The static class that manages scene transitions.
 */
export class SceneManager {
  constructor() {
    throw new Error('This is a static class')
  }

  static _scene: Scene_Base | null = null
  static _nextScene: Scene_Base | null = null
  static _stack: SceneConstructor[] = []
  static _exiting = false
  static _previousScene: Scene_Base | null = null
  static _previousClass: SceneConstructor | null = null
  static _backgroundBitmap: Bitmap | null = null
  static _smoothDeltaTime = 1
  static _elapsedTime = 0

  static run(sceneClass: SceneConstructor): void {
    try {
      this.initialize()
      this.goto(sceneClass)
      Graphics.startGameLoop()
    }
    catch (e) {
      this.catchException(e)
    }
  }

  static initialize(): void {
    this.checkBrowser()
    this.checkPluginErrors()
    this.initGraphics()
    this.initAudio()
    this.initVideo()
    this.initInput()
    this.setupEventHandlers()
  }

  static checkBrowser(): void {
    if (!Utils.canUseWebGL())
      throw new Error('Your browser does not support WebGL.')
    if (!Utils.canUseWebAudioAPI())
      throw new Error('Your browser does not support Web Audio API.')
    if (!Utils.canUseCssFontLoading())
      throw new Error('Your browser does not support CSS Font Loading.')
    if (!Utils.canUseIndexedDB())
      throw new Error('Your browser does not support IndexedDB.')
  }

  static checkPluginErrors(): void {
    PluginManager.checkErrors()
  }

  static initGraphics(): void {
    if (!Graphics.initialize())
      throw new Error('Failed to initialize graphics.')
    Graphics.setTickHandler(this.update.bind(this))
  }

  static initAudio(): void {
    WebAudio.initialize()
  }

  static initVideo(): void {
    Video.initialize(Graphics.width, Graphics.height)
  }

  static initInput(): void {
    Input.initialize()
    TouchInput.initialize()
  }

  static setupEventHandlers(): void {
    window.addEventListener('error', this.onError.bind(this))
    window.addEventListener('unhandledrejection', this.onReject.bind(this))
    window.addEventListener('unload', this.onUnload.bind(this))
    document.addEventListener('keydown', this.onKeyDown.bind(this))
  }

  static update(deltaTime: number): void {
    try {
      const n = this.determineRepeatNumber(deltaTime)
      for (let i = 0; i < n; i++) this.updateMain()
    }
    catch (e) {
      this.catchException(e)
    }
  }

  static determineRepeatNumber(deltaTime: number): number {
    this._smoothDeltaTime *= 0.8
    this._smoothDeltaTime += 0.2 * Math.min(deltaTime, 2)
    if (this._smoothDeltaTime >= 0.9) {
      this._elapsedTime = 0
      return Math.round(this._smoothDeltaTime)
    }
    else {
      this._elapsedTime += deltaTime
      return this._elapsedTime >= 1 ? (this._elapsedTime -= 1, 1) : 0
    }
  }

  static terminate(): void {
    if (Utils.isNwjs())
      nw.App.quit()
  }

  static onError(e: ErrorEvent): void {
    console.error(e.message)
    console.error(e.filename, e.lineno)
    try {
      this.stop()
      Graphics.printError('Error', e.message, e.error as Error | null)
      AudioManager.stopAll()
    }
    catch (e) {
      console.error(e)
    }
  }

  static onReject(e: PromiseRejectionEvent): void {
    const message = typeof e.reason === 'string' ? e.reason : String(e.reason)
    console.error(message)
    try {
      this.stop()
      Graphics.printError('Error', message)
      AudioManager.stopAll()
    }
    catch (e) {
      console.error(e)
    }
  }

  static onUnload(): void {
    ImageManager.clear()
    EffectManager.clear()
    AudioManager.stopAll()
  }

  static onKeyDown(e: KeyboardEvent): void {
    if (!e.ctrlKey && !e.altKey) {
      switch (e.keyCode) {
        case 116:
          this.reloadGame()
          break
        case 119:
          this.showDevTools()
          break
      }
    }
  }

  static reloadGame(): void {
    if (Utils.isNwjs()) {
      // NW.js exposes chrome.runtime API
      ;(globalThis as unknown as Record<string, { runtime: { reload: () => void } }>).chrome.runtime.reload()
    }
  }

  static showDevTools(): void {
    if (Utils.isNwjs() && Utils.isOptionValid('test'))
      nw.Window.get().showDevTools()
  }

  static catchException(e: unknown): void {
    if (e instanceof Error) {
      this.catchNormalError(e)
    }
    else if (Array.isArray(e) && e[0] === 'LoadError') {
      this.catchLoadError(e)
    }
    else {
      this.catchUnknownError(e)
    }
    this.stop()
  }

  static catchNormalError(e: Error): void {
    Graphics.printError(e.name, e.message, e)
    AudioManager.stopAll()
    console.error(e.stack)
  }

  static catchLoadError(e: unknown[]): void {
    const n = e[1] as string
    const t = e[2] as (() => void) | undefined
    Graphics.printError('Failed to load', n)
    if (t) {
      Graphics.showRetryButton(() => {
        t()
        SceneManager.resume()
      })
    }
    else {
      AudioManager.stopAll()
    }
  }

  static catchUnknownError(e: unknown): void {
    Graphics.printError('UnknownError', String(e))
    AudioManager.stopAll()
  }

  static updateMain(): void {
    this.updateFrameCount()
    this.updateInputData()
    this.updateEffekseer()
    this.changeScene()
    this.updateScene()
  }

  static updateFrameCount(): void {
    Graphics.frameCount++
  }

  static updateInputData(): void {
    Input.update()
    TouchInput.update()
  }

  static updateEffekseer(): void {
    if (Graphics.effekseer && this.isGameActive())
      Graphics.effekseer.update()
  }

  static changeScene(): void {
    if (this.isSceneChanging() && !this.isCurrentSceneBusy()) {
      if (this._scene) {
        this._scene.terminate()
        this.onSceneTerminate()
      }
      this._scene = this._nextScene
      this._nextScene = null
      if (this._scene) {
        this._scene.create()
        this.onSceneCreate()
      }
      if (this._exiting)
        this.terminate()
    }
  }

  static updateScene(): void {
    if (this._scene) {
      if (this._scene.isStarted()) {
        if (this.isGameActive())
          this._scene.update()
      }
      else if (this._scene.isReady()) {
        this.onBeforeSceneStart()
        this._scene.start()
        this.onSceneStart()
      }
    }
  }

  static isGameActive(): boolean {
    try {
      return window.top!.document.hasFocus()
    }
    catch (e) {
      console.error(e)
      return true
    }
  }

  static onSceneTerminate(): void {
    this._previousScene = this._scene
    this._previousClass = this._scene!.constructor as SceneConstructor
    Graphics.setStage(null!)
  }

  static onSceneCreate(): void {
    Graphics.startLoading()
  }

  static onBeforeSceneStart(): void {
    if (this._previousScene) {
      this._previousScene.destroy()
      this._previousScene = null
    }
    if (Graphics.effekseer)
      Graphics.effekseer.stopAll()
  }

  static onSceneStart(): void {
    Graphics.endLoading()
    Graphics.setStage(this._scene!)
  }

  static isSceneChanging(): boolean {
    return this._exiting || !!this._nextScene
  }

  static isCurrentSceneBusy(): boolean {
    return !!this._scene && this._scene.isBusy()
  }

  static isNextScene(sceneClass: SceneConstructor): boolean {
    return !!this._nextScene && this._nextScene.constructor === sceneClass
  }

  static isPreviousScene(sceneClass: SceneConstructor): boolean {
    return this._previousClass === sceneClass
  }

  static goto(SceneClass: SceneConstructor | null): void {
    if (SceneClass) {
      this._nextScene = new SceneClass()
    }
    if (this._scene) {
      this._scene.stop()
    }
  }

  static push(sceneClass: SceneConstructor): void {
    this._stack.push(this._scene!.constructor as SceneConstructor)
    this.goto(sceneClass)
  }

  static pop(): void {
    if (this._stack.length > 0) {
      this.goto(this._stack.pop()!)
    }
    else {
      this.exit()
    }
  }

  static exit(): void {
    this.goto(null)
    this._exiting = true
  }

  static clearStack(): void {
    this._stack = []
  }

  static stop(): void {
    Graphics.stopGameLoop()
  }

  static prepareNextScene(...args: unknown[]): void {
    (this._nextScene as Scene_Base & { prepare: (...args: unknown[]) => void }).prepare(...args)
  }

  static snap(): Bitmap {
    return Bitmap.snap(this._scene!)
  }

  static snapForBackground(): void {
    if (this._backgroundBitmap)
      this._backgroundBitmap.destroy()
    this._backgroundBitmap = this.snap()
  }

  static backgroundBitmap(): Bitmap | null {
    return this._backgroundBitmap
  }

  static resume(): void {
    TouchInput.update()
    Graphics.startGameLoop()
  }
}
