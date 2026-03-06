import { PIXI } from '../pixi'
import { FPSCounter } from './FPSCounter'
import { Utils } from './Utils'
import { Video } from './Video'

/**
 * The static class that carries out graphics processing.
 *
 * @namespace
 */
export class Graphics {
  constructor() {
    throw new Error('This is a static class')
  }

  static _width = 0
  static _height = 0
  static _defaultScale = 1
  static _realScale = 1
  static _errorPrinter: HTMLDivElement | null = null
  static _tickHandler: ((deltaTime: number) => void) | null = null
  static _canvas: HTMLCanvasElement | null = null
  static _fpsCounter: FPSCounter | null = null
  static _loadingSpinner: HTMLDivElement | null = null
  static _stretchEnabled = false
  static _app: PIXI.Application | null = null
  static _effekseer: ReturnType<typeof effekseer.createContext> = null
  static _wasLoading = false
  /**
   * The total frame count of the game screen.
   */
  static frameCount = 0

  /**
   * The width of the window display area.
   */
  static boxWidth = 0
  /**
   * The height of the window display area.
   */
  static boxHeight = 0

  /**
   * The PIXI.Application object.
   */
  static get app(): PIXI.Application {
    return this._app!
  }

  /**
   * The context object of Effekseer.
   */
  static get effekseer(): Effekseer {
    return this._effekseer!
  }

  static get width(): number {
    return this._width
  }

  static set width(value: number) {
    if (this._width !== value) {
      this._width = value
      this._updateAllElements()
    }
  }

  static get height(): number {
    return this._height
  }

  static set height(value: number) {
    if (this._height !== value) {
      this._height = value
      this._updateAllElements()
    }
  }

  static get defaultScale(): number {
    return this._defaultScale
  }

  static set defaultScale(value: number) {
    if (this._defaultScale !== value) {
      this._defaultScale = value
      this._updateAllElements()
    }
  }

  /**
   * Initializes the graphics system.
   *
   * @returns True if the graphics system is available.
   */
  static initialize(): boolean {
    this._width = 0
    this._height = 0
    this._defaultScale = 1
    this._realScale = 1
    this._errorPrinter = null
    this._tickHandler = null
    this._canvas = null
    this._fpsCounter = null
    this._loadingSpinner = null
    this._stretchEnabled = this._defaultStretchMode()
    this._app = null
    this._effekseer = null
    this._wasLoading = false

    this.frameCount = 0
    this.boxWidth = this._width
    this.boxHeight = this._height

    this._updateRealScale()
    this._createAllElements()
    this._disableContextMenu()
    this._setupEventHandlers()
    this._createPixiApp()
    this._createEffekseerContext()

    return !!this._app
  }

  static setTickHandler(handler: (deltaTime: number) => void): void {
    this._tickHandler = handler
  }

  static startGameLoop(): void {
    if (this._app) {
      this._app.start()
    }
  }

  static stopGameLoop(): void {
    if (this._app) {
      this._app.stop()
    }
  }

  static setStage(stage: PIXI.Container): void {
    if (this._app) {
      this._app.stage = stage
    }
  }

  static startLoading(): void {
    if (!document.getElementById('loadingSpinner')) {
      document.body.appendChild(this._loadingSpinner!)
    }
  }

  static endLoading(): boolean {
    if (document.getElementById('loadingSpinner')) {
      document.body.removeChild(this._loadingSpinner!)
      return true
    }
    else {
      return false
    }
  }

  static printError(name: string, message: string, error: Error | null = null): void {
    if (!this._errorPrinter) {
      this._createErrorPrinter()
    }
    this._errorPrinter!.innerHTML = this._makeErrorHtml(name, message, error)
    this._wasLoading = this.endLoading()
    this._applyCanvasFilter()
  }

  static showRetryButton(retry: () => void): void {
    const button = document.createElement('button')
    button.id = 'retryButton'
    button.innerHTML = 'Retry'
    // [Note] stopPropagation() is required for iOS Safari.
    button.ontouchstart = e => e.stopPropagation()
    button.onclick = () => {
      this.eraseError()
      retry()
    }
    this._errorPrinter!.appendChild(button)
    button.focus()
  }

  static eraseError(): void {
    if (this._errorPrinter) {
      this._errorPrinter.innerHTML = this._makeErrorHtml()
      if (this._wasLoading) {
        this.startLoading()
      }
    }
    this._clearCanvasFilter()
  }

  static pageToCanvasX(x: number): number {
    if (this._canvas) {
      const left = this._canvas.offsetLeft
      return Math.round((x - left) / this._realScale)
    }
    else {
      return 0
    }
  }

  static pageToCanvasY(y: number): number {
    if (this._canvas) {
      const top = this._canvas.offsetTop
      return Math.round((y - top) / this._realScale)
    }
    else {
      return 0
    }
  }

  static isInsideCanvas(x: number, y: number): boolean {
    return x >= 0 && x < this._width && y >= 0 && y < this._height
  }

  static showScreen(): void {
    this._canvas!.style.opacity = '1'
  }

  static hideScreen(): void {
    this._canvas!.style.opacity = '0'
  }

  static resize(width: number, height: number): void {
    this._width = width
    this._height = height
    this._app!.renderer.resize(width, height)
    this._updateAllElements()
  }

  // methods

  static _createAllElements(): void {
    this._createErrorPrinter()
    this._createCanvas()
    this._createLoadingSpinner()
    this._createFPSCounter()
  }

  static _updateAllElements(): void {
    this._updateRealScale()
    this._updateErrorPrinter()
    this._updateCanvas()
    this._updateVideo()
  }

  static _onTick(deltaTime: number): void {
    this._fpsCounter!.startTick()
    if (this._tickHandler) {
      this._tickHandler(deltaTime)
    }
    if (this._canRender()) {
      this._app!.render()
    }
    this._fpsCounter!.endTick()
  }

  static _canRender(): boolean {
    return !!this._app!.stage
  }

  static _updateRealScale(): void {
    if (this._stretchEnabled && this._width > 0 && this._height > 0) {
      const h = this._stretchWidth() / this._width
      const v = this._stretchHeight() / this._height
      this._realScale = Math.min(h, v)
      window.scrollTo(0, 0)
    }
    else {
      this._realScale = this._defaultScale
    }
  }

  static _stretchWidth(): number {
    if (Utils.isMobileDevice()) {
      return document.documentElement.clientWidth
    }
    else {
      return window.innerWidth
    }
  }

  static _stretchHeight(): number {
    if (Utils.isMobileDevice()) {
      // [Note] Mobile browsers often have special operations at the top and
      //   bottom of the screen.
      const rate = Utils.isLocal() ? 1.0 : 0.9
      return document.documentElement.clientHeight * rate
    }
    else {
      return window.innerHeight
    }
  }

  static _makeErrorHtml(
    name?: string,
    message?: string,
    _error?: Error | null,
  ): string {
    const nameDiv = document.createElement('div')
    const messageDiv = document.createElement('div')
    nameDiv.id = 'errorName'
    messageDiv.id = 'errorMessage'
    nameDiv.innerHTML = Utils.escapeHtml(name || '')
    messageDiv.innerHTML = Utils.escapeHtml(message || '')
    return nameDiv.outerHTML + messageDiv.outerHTML
  }

  static _defaultStretchMode(): boolean {
    return Utils.isNwjs() || Utils.isMobileDevice()
  }

  static _createErrorPrinter(): void {
    this._errorPrinter = document.createElement('div')
    this._errorPrinter.id = 'errorPrinter'
    this._errorPrinter.innerHTML = this._makeErrorHtml()
    document.body.appendChild(this._errorPrinter)
  }

  static _updateErrorPrinter(): void {
    const width = this._width * 0.8 * this._realScale
    const height = 100 * this._realScale
    this._errorPrinter!.style.width = `${width}px`
    this._errorPrinter!.style.height = `${height}px`
  }

  static _createCanvas(): void {
    this._canvas = document.createElement('canvas')
    this._canvas.id = 'gameCanvas'
    this._updateCanvas()
    document.body.appendChild(this._canvas)
  }

  static _updateCanvas(): void {
    this._canvas!.width = this._width
    this._canvas!.height = this._height
    this._canvas!.style.zIndex = '1'
    this._centerElement(this._canvas!)
  }

  static _updateVideo(): void {
    const width = this._width * this._realScale
    const height = this._height * this._realScale
    Video.resize(width, height)
  }

  static _createLoadingSpinner(): void {
    const loadingSpinner = document.createElement('div')
    const loadingSpinnerImage = document.createElement('div')
    loadingSpinner.id = 'loadingSpinner'
    loadingSpinnerImage.id = 'loadingSpinnerImage'
    loadingSpinner.appendChild(loadingSpinnerImage)
    this._loadingSpinner = loadingSpinner
  }

  static _createFPSCounter(): void {
    this._fpsCounter = new FPSCounter()
  }

  static _centerElement(element: HTMLCanvasElement): void {
    const width = element.width * this._realScale
    const height = element.height * this._realScale
    element.style.position = 'absolute'
    element.style.margin = 'auto'
    element.style.top = '0'
    element.style.left = '0'
    element.style.right = '0'
    element.style.bottom = '0'
    element.style.width = `${width}px`
    element.style.height = `${height}px`
  }

  static _disableContextMenu(): void {
    const elements = document.body.getElementsByTagName('*')
    const oncontextmenu = (): boolean => false
    for (const element of elements) {
      (element as HTMLElement).oncontextmenu = oncontextmenu
    }
  }

  static _applyCanvasFilter(): void {
    if (this._canvas) {
      this._canvas.style.opacity = '0.5'
      this._canvas.style.filter = 'blur(8px)'
      this._canvas.style.webkitFilter = 'blur(8px)'
    }
  }

  static _clearCanvasFilter(): void {
    if (this._canvas) {
      this._canvas.style.opacity = '1'
      this._canvas.style.filter = ''
      this._canvas.style.webkitFilter = ''
    }
  }

  static _setupEventHandlers(): void {
    window.addEventListener('resize', this._onWindowResize.bind(this))
    document.addEventListener('keydown', this._onKeyDown.bind(this))
  }

  static _onWindowResize(): void {
    this._updateAllElements()
  }

  static _onKeyDown(event: KeyboardEvent): void {
    if (!event.ctrlKey && !event.altKey) {
      switch (event.keyCode) {
        case 113: // F2
          event.preventDefault()
          this._switchFPSCounter()
          break
        case 114: // F3
          event.preventDefault()
          this._switchStretchMode()
          break
        case 115: // F4
          event.preventDefault()
          this._switchFullScreen()
          break
      }
    }
  }

  static _switchFPSCounter(): void {
    this._fpsCounter!.switchMode()
  }

  static _switchStretchMode(): void {
    this._stretchEnabled = !this._stretchEnabled
    this._updateAllElements()
  }

  static _switchFullScreen(): void {
    if (this._isFullScreen()) {
      this._cancelFullScreen()
    }
    else {
      this._requestFullScreen()
    }
  }

  static _isFullScreen(): boolean {
    return !!(
      (document as any).fullScreenElement
      || (document as any).mozFullScreen
      || (document as any).webkitFullscreenElement
    )
  }

  static _requestFullScreen(): void {
    const element = document.body as any
    if (element.requestFullScreen) {
      element.requestFullScreen()
    }
    else if (element.mozRequestFullScreen) {
      element.mozRequestFullScreen()
    }
    else if (element.webkitRequestFullScreen) {
      element.webkitRequestFullScreen((Element as any).ALLOW_KEYBOARD_INPUT)
    }
  }

  static _cancelFullScreen(): void {
    if ((document as any).cancelFullScreen) {
      (document as any).cancelFullScreen()
    }
    else if ((document as any).mozCancelFullScreen) {
      (document as any).mozCancelFullScreen()
    }
    else if ((document as any).webkitCancelFullScreen) {
      (document as any).webkitCancelFullScreen()
    }
  }

  static _createPixiApp(): void {
    try {
      this._setupPixi()
      this._app = new PIXI.Application({
        view: this._canvas!,
        autoStart: false,
      })
      this._app.ticker.remove(this._app.render, this._app)
      this._app.ticker.add(this._onTick, this)
    }
    catch (e) {
      console.error(e)
      this._app = null
    }
  }

  static _setupPixi(): void {
    PIXI.utils.skipHello()
    PIXI.TextureGCSystem.defaultMaxIdle = 600
  }

  static _createEffekseerContext(): void {
    if (this._app && window.effekseer) {
      try {
        this._effekseer = effekseer.createContext()
        if (this._effekseer) {
          this._effekseer.init((this._app.renderer as any).gl)
          this._effekseer.setRestorationOfStatesFlag(false)
        }
      }
      catch (e) {
        console.error(e)
        this._app = null
      }
    }
  }
}
