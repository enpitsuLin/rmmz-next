import * as PIXI from 'pixi.js'
import { Graphics } from './Graphics'
import { Rectangle } from './Rectangle'
import { Utils } from './Utils'

/**
 * The basic object that represents an image.
 */
export class Bitmap {
  /**
   * The face name of the font.
   */
  fontFace = 'sans-serif'

  /**
   * The size of the font in pixels.
   */
  fontSize = 16

  /**
   * Whether the font is bold.
   */
  fontBold = false

  /**
   * Whether the font is italic.
   */
  fontItalic = false

  /**
   * The color of the text in CSS format.
   */
  textColor = '#ffffff'

  /**
   * The color of the outline of the text in CSS format.
   */
  outlineColor = 'rgba(0, 0, 0, 0.5)'

  /**
   * The width of the outline of the text.
   */
  outlineWidth = 3

  _canvas: HTMLCanvasElement | null = null
  _context: CanvasRenderingContext2D | null = null
  _baseTexture: PIXI.TextureSource | null = null
  _image: HTMLImageElement | null = null
  _url: string = ''
  _paintOpacity: number = 255
  _smooth: boolean = true
  _loadListeners: ((bitmap: Bitmap) => void)[] = []
  _loadingState: 'none' | 'loading' | 'loaded' | 'error' = 'none'

  /**
   * @param {number} width - The width of the bitmap.
   * @param {number} height - The height of the bitmap.
   */
  constructor(width?: number, height?: number) {
    if (width && width > 0 && height && height > 0) {
      this._createCanvas(width, height)
    }
  }

  /**
   * Loads a image file.
   *
   * @param {string} url - The image url of the texture.
   * @returns {Bitmap} The new bitmap object.
   */
  static load(url: string): Bitmap {
    const bitmap = new Bitmap()
    bitmap._url = url
    bitmap._startLoading()
    return bitmap
  }

  /**
   * Takes a snapshot of the game screen.
   *
   * @param {Stage} stage - The stage object.
   * @returns {Bitmap} The new bitmap object.
   */
  static snap(stage: PIXI.Container): Bitmap {
    const width = Graphics.width
    const height = Graphics.height
    const bitmap = new Bitmap(width, height)
    const renderTexture = PIXI.RenderTexture.create({ width, height })
    if (stage) {
      const renderer = Graphics.app.renderer
      renderer.render({ container: stage, target: renderTexture })
      const canvas = renderer.extract.canvas(renderTexture)
      bitmap.context.drawImage(canvas as HTMLCanvasElement, 0, 0)
      canvas.width = 0
      canvas.height = 0
    }
    renderTexture.destroy(true)
    bitmap.baseTexture.update()
    return bitmap
  }

  /**
   * Checks whether the bitmap is ready to render.
   *
   * @returns {boolean} True if the bitmap is ready to render.
   */
  isReady(): boolean {
    return this._loadingState === 'loaded' || this._loadingState === 'none'
  }

  /**
   * Checks whether a loading error has occurred.
   *
   * @returns {boolean} True if a loading error has occurred.
   */
  isError(): boolean {
    return this._loadingState === 'error'
  }

  /**
   * The url of the image file.
   *
   * @readonly
   * @type string
   */
  get url(): string {
    return this._url!
  }

  /**
   * The base texture that holds the image.
   *
   * @readonly
   * @type PIXI.TextureSource
   */
  get baseTexture(): PIXI.TextureSource {
    return this._baseTexture!
  }

  /**
   * The bitmap image.
   *
   * @readonly
   * @type HTMLImageElement
   */
  get image(): HTMLImageElement {
    return this._image!
  }

  /**
   * The bitmap canvas.
   *
   * @readonly
   * @type HTMLCanvasElement
   */
  get canvas(): HTMLCanvasElement {
    this._ensureCanvas()
    return this._canvas!
  }

  /**
   * The 2d context of the bitmap canvas.
   */
  get context(): CanvasRenderingContext2D {
    this._ensureCanvas()
    return this._context!
  }

  /**
   * The width of the bitmap.
   *
   * @readonly
   * @type number
   */
  get width(): number {
    const image = this._canvas || this._image
    return image ? image.width : 0
  }

  /**
   * The height of the bitmap.
   *
   * @readonly
   * @type number
   */
  get height(): number {
    const image = this._canvas || this._image
    return image ? image.height : 0
  }

  /**
   * The rectangle of the bitmap.
   *
   * @readonly
   * @type Rectangle
   */
  get rect(): Rectangle {
    return new Rectangle(0, 0, this.width, this.height)
  }

  /**
   * Whether the smooth scaling is applied.
   *
   * @type boolean
   */
  get smooth(): boolean {
    return this._smooth
  }

  set smooth(value) {
    if (this._smooth !== value) {
      this._smooth = value
      this._updateScaleMode()
    }
  }

  /**
   * The opacity of the drawing object in the range (0, 255).
   *
   * @type number
   */
  get paintOpacity(): number {
    return this._paintOpacity
  }

  set paintOpacity(value) {
    if (this._paintOpacity !== value) {
      this._paintOpacity = value
      this.context.globalAlpha = this._paintOpacity / 255
    }
  }

  /**
   * Destroys the bitmap.
   */
  destroy(): void {
    if (this._baseTexture) {
      this._baseTexture.destroy()
      this._baseTexture = null
    }
    this._destroyCanvas()
  }

  /**
   * Resizes the bitmap.
   *
   * @param {number} width - The new width of the bitmap.
   * @param {number} height - The new height of the bitmap.
   */
  resize(width: number, height: number): void {
    width = Math.max(width || 0, 1)
    height = Math.max(height || 0, 1)
    this.canvas.width = width
    this.canvas.height = height
    this.baseTexture.resize(width, height)
  }

  /**
   * Performs a block transfer.
   *
   * @param {Bitmap} source - The bitmap to draw.
   * @param {number} sx - The x coordinate in the source.
   * @param {number} sy - The y coordinate in the source.
   * @param {number} sw - The width of the source image.
   * @param {number} sh - The height of the source image.
   * @param {number} dx - The x coordinate in the destination.
   * @param {number} dy - The y coordinate in the destination.
   * @param {number} [dw] The width to draw the image in the destination.
   * @param {number} [dh] The height to draw the image in the destination.
   */
  blt(source: Bitmap, sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, dw?: number, dh?: number): void {
    dw = dw || sw
    dh = dh || sh
    try {
      const image = source._canvas || source._image
      if (image) {
        this.context!.globalCompositeOperation = 'source-over'
        this.context!.drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh)
        this._baseTexture!.update()
      }
    }
    catch (e) {
      console.error(e)
      // Handle error
    }
  }

  /**
   * Returns pixel color at the specified point.
   *
   * @param {number} x - The x coordinate of the pixel in the bitmap.
   * @param {number} y - The y coordinate of the pixel in the bitmap.
   * @returns {string} The pixel color (hex format).
   */
  getPixel(x: number, y: number): string {
    const data = this.context.getImageData(x, y, 1, 1).data
    let result = '#'
    for (let i = 0; i < 3; i++) {
      result += data[i].toString(16).padStart(2, '0')
    }
    return result
  }

  /**
   * Returns alpha pixel value at the specified point.
   *
   * @param {number} x - The x coordinate of the pixel in the bitmap.
   * @param {number} y - The y coordinate of the pixel in the bitmap.
   * @returns {number} The alpha value.
   */
  getAlphaPixel(x: number, y: number): number {
    const data = this.context.getImageData(x, y, 1, 1).data
    return data[3]
  }

  /**
   * Clears the specified rectangle.
   *
   * @param {number} x - The x coordinate for the upper-left corner.
   * @param {number} y - The y coordinate for the upper-left corner.
   * @param {number} width - The width of the rectangle to clear.
   * @param {number} height - The height of the rectangle to clear.
   */
  clearRect(x: number, y: number, width: number, height: number): void {
    this.context.clearRect(x, y, width, height)
    this._baseTexture!.update()
  }

  /**
   * Clears the entire bitmap.
   */
  clear(): void {
    this.clearRect(0, 0, this.width, this.height)
  }

  /**
   * Fills the specified rectangle.
   *
   * @param {number} x - The x coordinate for the upper-left corner.
   * @param {number} y - The y coordinate for the upper-left corner.
   * @param {number} width - The width of the rectangle to fill.
   * @param {number} height - The height of the rectangle to fill.
   * @param {string} color - The color of the rectangle in CSS format.
   */
  fillRect(x: number, y: number, width: number, height: number, color: string): void {
    const context = this.context
    context.save()
    context.fillStyle = color
    context.fillRect(x, y, width, height)
    context.restore()
    this._baseTexture!.update()
  }

  /**
   * Fills the entire bitmap.
   *
   * @param {string} color - The color of the rectangle in CSS format.
   */
  fillAll(color: string): void {
    this.fillRect(0, 0, this.width, this.height, color)
  }

  /**
   * Draws the specified rectangular frame.
   *
   * @param {number} x - The x coordinate for the upper-left corner.
   * @param {number} y - The y coordinate for the upper-left corner.
   * @param {number} width - The width of the rectangle to stroke.
   * @param {number} height - The height of the rectangle to stroke.
   * @param {string} color - The color of the rectangle in CSS format.
   */
  strokeRect(x: number, y: number, width: number, height: number, color: string): void {
    const context = this.context
    context.save()
    context.strokeStyle = color
    context.strokeRect(x, y, width, height)
    context.restore()
    this._baseTexture!.update()
  }

  /**
   * Draws the rectangle with a gradient.
   *
   * @param {number} x - The x coordinate for the upper-left corner.
   * @param {number} y - The y coordinate for the upper-left corner.
   * @param {number} width - The width of the rectangle to fill.
   * @param {number} height - The height of the rectangle to fill.
   * @param {string} color1 - The gradient starting color.
   * @param {string} color2 - The gradient ending color.
   * @param {boolean} vertical - True for a vertical gradient, false for horizontal.
   */
  gradientFillRect(x: number, y: number, width: number, height: number, color1: string, color2: string, vertical = false): void {
    const context = this.context
    const x1 = vertical ? x : x + width
    const y1 = vertical ? y + height : y
    const grad = context.createLinearGradient(x, y, x1, y1)
    grad.addColorStop(0, color1)
    grad.addColorStop(1, color2)
    context.save()
    context.fillStyle = grad
    context.fillRect(x, y, width, height)
    context.restore()
    this._baseTexture!.update()
  }

  /**
   * Draws a filled circle.
   *
   * @param {number} x - The x coordinate of the circle center.
   * @param {number} y - The y coordinate of the circle center.
   * @param {number} radius - The radius of the circle.
   * @param {string} color - The color of the circle in CSS format.
   */
  drawCircle(x: number, y: number, radius: number, color: string): void {
    const context = this.context
    context.save()
    context.fillStyle = color
    context.beginPath()
    context.arc(x, y, radius, 0, Math.PI * 2, false)
    context.fill()
    context.restore()
    this._baseTexture!.update()
  }

  /**
   * Draws text with an outline to the bitmap.
   *
   * @param {string} text - The text to draw.
   * @param {number} x - The x coordinate for the text.
   * @param {number} y - The y coordinate for the text.
   * @param {number} maxWidth - The maximum width of the text.
   * @param {number} lineHeight - The line height of the text.
   * @param {string} align - The alignment of the text ('left', 'center', 'right').
   */
  drawText(text: string, x: number, y: number, maxWidth: number, lineHeight: number, align?: CanvasTextAlign): void {
    // [Note] Different browser makes different rendering with
    //   textBaseline == 'top'. So we use 'alphabetic' here.
    const context = this.context
    const alpha = context.globalAlpha
    maxWidth = maxWidth || 0xFFFFFFFF
    let tx = x
    const ty = Math.round(y + lineHeight / 2 + this.fontSize * 0.35)
    if (align === 'center') {
      tx += maxWidth / 2
    }
    else if (align === 'right') {
      tx += maxWidth
    }
    context.save()
    context.font = this._makeFontNameText()
    if (align)
      context.textAlign = align
    context.textBaseline = 'alphabetic'
    context.globalAlpha = 1
    this._drawTextOutline(text, tx, ty, maxWidth)
    context.globalAlpha = alpha
    this._drawTextBody(text, tx, ty, maxWidth)
    context.restore()
    this._baseTexture!.update()
  }

  /**
   * Returns the width of the specified text.
   *
   * @param {string} text - The text to measure.
   * @returns {number} The width of the text in pixels.
   */
  measureTextWidth(text: string): number {
    const context = this.context
    context.save()
    context.font = this._makeFontNameText()
    const width = context.measureText(text).width
    context.restore()
    return width
  }

  /**
   * Adds a callback function that will be called when the bitmap is loaded.
   *
   * @param {function} listener - The callback function.
   */
  addLoadListener(listener: (bitmap: Bitmap) => void): void {
    if (!this.isReady()) {
      this._loadListeners.push(listener)
    }
    else {
      listener(this)
    }
  }

  /**
   * Tries to load the image again.
   */
  retry(): void {
    this._startLoading()
  }

  _makeFontNameText(): string {
    const italic = this.fontItalic ? 'Italic ' : ''
    const bold = this.fontBold ? 'Bold ' : ''
    return `${italic}${bold}${this.fontSize}px ${this.fontFace}`
  }

  _drawTextOutline(text: string, tx: number, ty: number, maxWidth: number): void {
    const context = this.context
    context.strokeStyle = this.outlineColor
    context.lineWidth = this.outlineWidth
    context.lineJoin = 'round'
    context.strokeText(text, tx, ty, maxWidth)
  }

  _drawTextBody(text: string, tx: number, ty: number, maxWidth: number): void {
    const context = this.context
    context.fillStyle = this.textColor
    context.fillText(text, tx, ty, maxWidth)
  }

  _createCanvas(width: number, height: number): void {
    this._canvas = document.createElement('canvas')
    this._context = this._canvas.getContext('2d')
    this._canvas.width = width
    this._canvas.height = height
    this._createBaseTexture(this._canvas)
  }

  _ensureCanvas(): void {
    if (!this._canvas) {
      if (this._image) {
        this._createCanvas(this._image.width, this._image.height)
        this._context!.drawImage(this._image, 0, 0)
      }
      else {
        this._createCanvas(0, 0)
      }
    }
  }

  _destroyCanvas(): void {
    if (this._canvas) {
      this._canvas.width = 0
      this._canvas.height = 0
      this._canvas = null
    }
  }

  _createBaseTexture(source: HTMLCanvasElement | HTMLImageElement): void {
    this._baseTexture = source instanceof HTMLCanvasElement
      ? new PIXI.CanvasSource({ resource: source })
      : new PIXI.ImageSource({ resource: source })
    this._updateScaleMode()
  }

  _updateScaleMode(): void {
    if (this._baseTexture) {
      this._baseTexture.scaleMode = this._smooth
        ? 'linear'
        : 'nearest'
    }
  }

  _startLoading(): void {
    this._image = new Image()
    this._image.onload = this._onLoad.bind(this)
    this._image.onerror = this._onError.bind(this)
    this._destroyCanvas()
    this._loadingState = 'loading'
    if (Utils.hasEncryptedImages()) {
      this._startDecrypting()
    }
    else {
      this._image.src = this._url
      if (this._image.width > 0) {
        this._image.onload = null
        this._onLoad()
      }
    }
  }

  _startDecrypting(): void {
    const xhr = new XMLHttpRequest()
    xhr.open('GET', `${this._url}_`)
    xhr.responseType = 'arraybuffer'
    xhr.onload = () => this._onXhrLoad(xhr)
    xhr.onerror = this._onError.bind(this)
    xhr.send()
  }

  _onXhrLoad(xhr: XMLHttpRequest): void {
    if (xhr.status < 400) {
      const arrayBuffer = Utils.decryptArrayBuffer(xhr.response)
      const blob = new Blob([arrayBuffer])
      this._image!.src = URL.createObjectURL(blob)
    }
    else {
      this._onError()
    }
  }

  _onLoad(): void {
    if (Utils.hasEncryptedImages()) {
      URL.revokeObjectURL(this._image!.src)
    }
    this._loadingState = 'loaded'
    this._createBaseTexture(this._image!)
    this._callLoadListeners()
  }

  _callLoadListeners(): void {
    while (this._loadListeners.length > 0) {
      this._loadListeners.shift()!(this)
    }
  }

  _onError(): void {
    this._loadingState = 'error'
  }
}
