import type { SceneName } from '../scenes/builtInScenes'
import type { Scene_Base } from '../scenes/Scene_Base'
import { Bitmap } from '../primitives/Bitmap'
import { Graphics } from '../primitives/Graphics'
import { Input } from '../primitives/Input'
import { TouchInput } from '../primitives/TouchInput'
import { Utils } from '../primitives/Utils'
import { Video } from '../primitives/Video'
import { WebAudio } from '../primitives/WebAudio'
import { AudioManager } from './AudioManager'
import { EffectManager } from './EffectManager'
import { ImageManager } from './ImageManager'

/**
 * SceneManager
 *
 * The static class that manages scene transitions.
 *
 * Scenes are addressed by name instead of by class, so code that only
 * transitions to a scene never imports it. The name -> constructor table lives
 * in `scenes/builtInScenes.ts` and is handed over by {@link SceneManager.run}.
 *
 * Every transition API also accepts a scene class, so plugins can pass their own
 * `Scene_*` constructors without touching the built-in table.
 */
export class SceneManager {
  constructor() {
    throw new Error('This is a static class')
  }

  static _scenes = new Map<SceneName, SceneManager.SceneConstructor>()

  static _scene: Scene_Base | null = null
  static _sceneConstructor: SceneManager.SceneConstructor | null = null
  static _nextScene: Scene_Base | null = null
  static _nextSceneConstructor: SceneManager.SceneConstructor | null = null
  static _stack: SceneManager.SceneConstructor[] = []
  static _exiting = false
  static _previousScene: Scene_Base | null = null
  static _previousClass: SceneManager.SceneConstructor | null = null
  static _backgroundBitmap: Bitmap | null = null
  static _smoothDeltaTime = 1
  static _elapsedTime = 0

  static _getConstructor(sceneName: SceneName): SceneManager.SceneConstructor {
    const constructor = this._scenes.get(sceneName)
    if (!constructor) {
      throw new Error(`Scene is not registered: ${sceneName}`)
    }
    return constructor
  }

  static _resolveScene(scene: SceneManager.SceneTarget): SceneManager.SceneConstructor {
    return typeof scene === 'string' ? this._getConstructor(scene) : scene
  }

  static run(scene: SceneManager.SceneTarget, scenes?: Record<SceneName, SceneManager.SceneConstructor>): void {
    if (scenes) {
      for (const name of Object.keys(scenes) as SceneName[]) {
        this._scenes.set(name, scenes[name])
      }
    }
    try {
      this.initialize()
      this.goto(scene)
      Graphics.startGameLoop()
    }
    catch (e) {
      this.catchException(e)
    }
  }

  static initialize(): void {
    this.checkBrowser()
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

  static initGraphics(): void {
    if (!Graphics.initialize())
      throw new Error('Failed to initialize graphics.')
    Graphics.setTickHandler(this.update.bind(this))
  }

  static initAudio(): void {
    WebAudio.initialize()
  }

  static initVideo(): void {
    Video.initialize(Graphics.width, Graphics.height, (visible) => {
      if (visible) {
        Graphics.hideScreen()
      }
      else {
        Graphics.showScreen()
      }
    })
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
      this._sceneConstructor = this._nextSceneConstructor
      this._nextScene = null
      this._nextSceneConstructor = null
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
    this._previousClass = this._sceneConstructor
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

  static isNextScene(scene: SceneManager.SceneTarget): boolean {
    return this._nextSceneConstructor === this._resolveScene(scene)
  }

  static isPreviousScene(scene: SceneManager.SceneTarget): boolean {
    return this._previousClass === this._resolveScene(scene)
  }

  static goto(scene: SceneManager.SceneTarget | null): void {
    if (scene) {
      const constructor = this._resolveScene(scene)
      this._nextScene = new constructor()
      this._nextSceneConstructor = constructor
    }
    if (this._scene) {
      this._scene.stop()
    }
  }

  static push(scene: SceneManager.SceneTarget): void {
    this._stack.push(this._sceneConstructor!)
    this.goto(scene)
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

export namespace SceneManager {
  export type SceneConstructor = new (...args: unknown[]) => Scene_Base

  /**
   * A built-in scene name, or any scene class. Plugins pass their own
   * `Scene_*` constructors directly instead of registering them.
   */
  export type SceneTarget = SceneName | SceneConstructor
}
