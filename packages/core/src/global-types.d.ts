/// <reference types="nw.js" />
/* eslint-disable ts/no-redeclare */
/* eslint-disable no-var */
/* eslint-disable vars-on-top */

interface HTMLScriptElement {
  _url?: string
}

interface Window {
  /** Vendor-prefixed AudioContext for older WebKit browsers */
  webkitAudioContext?: typeof AudioContext
  /** Vendor-prefixed IndexedDB for older Firefox browsers */
  mozIndexedDB?: IDBFactory
  /** Vendor-prefixed IndexedDB for older WebKit browsers */
  webkitIndexedDB?: IDBFactory
}
interface Array<T> {
  /**
   * Makes a shallow copy of the array.
   *
   * @returns {Array} A shallow copy of the array.
   */
  clone: () => Array<T>
  /**
   * Checks whether the array contains a given element.
   *
   * @param {any} element - The element to search for.
   * @returns {boolean} True if the array contains a given element.
   * @deprecated includes() should be used instead.
   */
  contains: (element: any) => boolean
  /**
   * Checks whether the two arrays are the same.
   *
   * @param {Array} array - The array to compare to.
   * @returns {boolean} True if the two arrays are the same.
   */
  equals: (array: Array<any>) => boolean
  /**
   * Removes a given element from the array (in place).
   *
   * @param {any} element - The element to remove.
   * @returns {Array} The array after remove.
   */
  remove: (element: any) => Array<T>
}

interface Math {
  /**
   * Generates a random integer in the range (0, max-1).
   *
   * @memberof JsExtensions
   * @param {number} max - The upper boundary (excluded).
   * @returns {number} A random integer.
   */
  randomInt: (max: number) => number
}

interface Number {
  /**
   * Returns a modulo value which is always positive.
   *
   * @memberof JsExtensions
   * @param {number} n - The divisor.
   * @returns {number} A modulo value.
   */
  mod: (n: number) => number
  /**
   * Returns a number whose value is limited to the given range.
   *
   * @memberof JsExtensions
   * @param {number} min - The lower boundary.
   * @param {number} max - The upper boundary.
   * @returns {number} A number in the range (min, max).
   */
  clamp: (min: number, max: number) => number
  /**
   * Makes a number string with leading zeros.
   *
   * @memberof JsExtensions
   * @param {number} length - The length of the output string.
   * @returns {string} A string with leading zeros.
   */
  padZero: (length: number) => string
}

interface String {
  /**
   * Checks whether the string contains a given string.
   *
   * @memberof JsExtensions
   * @param {string} string - The string to search for.
   * @returns {boolean} True if the string contains a given string.
   * @deprecated includes() should be used instead.
   */
  contains: (string: string) => boolean
  /**
   * Replaces %1, %2 and so on in the string to the arguments.
   *
   * @memberof JsExtensions
   * @param {any} ...args The objects to format.
   * @returns {string} A formatted string.
   */
  format: (...args: any[]) => string
  /**
   * Makes a number string with leading zeros.
   *
   * @memberof JsExtensions
   * @param {number} length - The length of the output string.
   * @returns {string} A string with leading zeros.
   */
  padZero: (length: number) => string
}

interface Object {
  /**
   * Copy the values of all of the enumerable own properties recursively from one or more source objects to a target object.
   * It also works for nested objects.
   *
   * @memberof JsExtensions
   * @param {object} target - The target object to copy to.
   * @param {object} source - The source object from which to copy properties.
   * @returns {object} The target object.
   */
  deepAssign: (target: object, source: object) => object
}

declare namespace effekseer {
  export function initRuntime(path: string, onload: () => void, onerror: () => void): void

  export function createContext(): EffekseerContext

  type MatrixArray = [
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
  ]

  export class EffekseerContext {
    init(webglContext: WebGLRenderingContext, settings?: object): void
    beginDraw(): void
    endDraw(): void
    drawHandle(handle: EffekseerHandle): void
    setProjectionMatrix(matrixArray: MatrixArray): void
    setCameraMatrix(matrixArray: MatrixArray): void
    setRestorationOfStatesFlag(flag: boolean): void

    loadEffect(
      path: string,
      scale?: number,
      onload?: () => void,
      onerror?: (reason: string, path: string) => void,
      redirect?: (path: string) => string
    ): EffekseerEffect
    releaseEffect(effect: EffekseerEffect): void

    update(): void
    play(effect: EffekseerEffect, x?: number, y?: number, z?: number): EffekseerHandle
    stopAll(): void
  }

  export class EffekseerEffect {
    constructor()
    isLoaded: boolean
  }

  export class EffekseerHandle {
    isLoaded: boolean
    stop(): void
    readonly exists: boolean

    setLocation(x: number, y: number, z: number): void
    setRotation(x: number, y: number, z: number): void
    setScale(x: number, y: number, z: number): void
    setSpeed(speed: number): void
  }
}

interface Window {
  effekseer: typeof effekseer
}

interface VorbisDecoder {
  destroy: () => void
  send: (arrayBuffer: ArrayBufferLike, loaded: boolean) => void
}

interface VorbisDecoderConstructor {
  new(
    context: AudioContext | null,
    onDecode: (buffer: AudioBuffer) => void,
    onError: (buffer: unknown) => void
  ): VorbisDecoder
}

declare var VorbisDecoder: VorbisDecoderConstructor

declare namespace GlobalMixins {

  interface IRendererPlugins {
    rpgtilemap: import('.').TilemapRenderer
  }

  interface Sprite {
    // eslint-disable-next-line ts/method-signature-style
    update(): void
    ax?: number
    ay?: number
  }
}
