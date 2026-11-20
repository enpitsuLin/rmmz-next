/**
 * The static class that handles video playback.
 *
 * @namespace
 */
export class Video {
  static _element: HTMLVideoElement | null = null
  static _loading: boolean = false
  static _volume: number = 1
  static _visibilityHandler: ((visible: boolean) => void) | null = null

  constructor() {
    throw new Error('This is a static class')
  }

  /**
   * Initializes the video system.
   *
   * @param {number} width - The width of the video.
   * @param {number} height - The height of the video.
   * @param onVisibilityChange - Called with true when the video covers the
   *   screen and false when it stops covering it. Defaults to the handler
   *   registered by `Graphics`.
   */
  static initialize(width: number, height: number, onVisibilityChange?: (visible: boolean) => void): void {
    this._element = null
    this._loading = false
    this._volume = 1
    if (onVisibilityChange) {
      this._visibilityHandler = onVisibilityChange
    }
    this._createElement()
    this._setupEventHandlers()
    this.resize(width, height)
  }

  /**
   * Sets the handler used when `initialize` is called without one, so that
   * `Video.initialize(width, height)` keeps covering the game canvas.
   */
  static setVisibilityHandler(handler: ((visible: boolean) => void) | null): void {
    this._visibilityHandler = handler
  }

  /**
   * Changes the display size of the video.
   *
   * @param {number} width - The width of the video.
   * @param {number} height - The height of the video.
   */
  static resize(width: number, height: number): void {
    if (this._element) {
      this._element.style.width = `${width}px`
      this._element.style.height = `${height}px`
    }
  }

  /**
   * Starts playback of a video.
   *
   * @param {string} src - The url of the video.
   */
  static play(src: string): void {
    this._element!.src = src
    this._element!.onloadeddata = this._onLoad.bind(this)
    this._element!.onerror = this._onError.bind(this)
    this._element!.onended = this._onEnd.bind(this)
    this._element!.load()
    this._loading = true
  }

  /**
   * Checks whether the video is playing.
   *
   * @returns {boolean} True if the video is playing.
   */
  static isPlaying(): boolean {
    return this._loading || this._isVisible()
  }

  /**
   * Sets the volume for videos.
   *
   * @param {number} volume - The volume for videos (0 to 1).
   */
  static setVolume(volume: number): void {
    this._volume = volume
    if (this._element) {
      this._element.volume = this._volume
    }
  }

  static _createElement(): void {
    this._element = document.createElement('video')
    this._element.id = 'gameVideo'
    this._element.style.position = 'absolute'
    this._element.style.margin = 'auto'
    this._element.style.top = '0px'
    this._element.style.left = '0px'
    this._element.style.right = '0px'
    this._element.style.bottom = '0px'
    this._element.style.opacity = '0'
    this._element.style.zIndex = '2'
    this._element.setAttribute('playsinline', '')
    this._element.oncontextmenu = () => false
    document.body.appendChild(this._element)
  }

  static _onLoad(): void {
    this._element!.volume = this._volume
    this._element!.play()
    this._updateVisibility(true)
    this._loading = false
  }

  static _onError(): never {
    this._updateVisibility(false)
    const retry = (): void => {
      this._element!.load()
    }
    // TODO fix this
    // eslint-disable-next-line no-throw-literal
    throw ['LoadError', this._element!.src, retry]
  }

  static _onEnd(): void {
    this._updateVisibility(false)
  }

  static _updateVisibility(videoVisible: boolean): void {
    this._visibilityHandler?.(videoVisible)
    this._element!.style.opacity = videoVisible ? '1' : '0'
  }

  static _isVisible(): boolean {
    return Number(this._element!.style.opacity) > 0
  }

  static _setupEventHandlers(): void {
    const onUserGesture = this._onUserGesture.bind(this)
    document.addEventListener('keydown', onUserGesture)
    document.addEventListener('mousedown', onUserGesture)
    document.addEventListener('touchend', onUserGesture)
  }

  static _onUserGesture(): void {
    if (!this._element!.src && this._element!.paused) {
      this._element!.play().catch(() => 0)
    }
  }
}
