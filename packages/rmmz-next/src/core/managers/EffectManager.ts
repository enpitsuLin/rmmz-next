import { Graphics } from '../primitives/Graphics'
import { Utils } from '../primitives/Utils'

/**
 * EffectManager
 *
 * The static class that loads Effekseer effects.
 */
export class EffectManager {
  constructor() {
    throw new Error('This is a static class')
  }

  static _cache: Record<string, effekseer.EffekseerEffect> = {}
  static _errorUrls: string[] = []

  static load(filename: string): effekseer.EffekseerEffect | null {
    if (filename) {
      const url = this.makeUrl(filename)
      const cache = this._cache
      if (!cache[url] && Graphics.effekseer) {
        this.startLoading(url)
      }
      return cache[url] || null
    }
    else {
      return null
    }
  }

  static startLoading(url: string): effekseer.EffekseerEffect {
    const onLoad = (): void => this.onLoad()
    const onError = (_message: string, errorUrl: string): void => this.onError(errorUrl)
    const effect = Graphics.effekseer.loadEffect(url, 1, onLoad, onError)
    this._cache[url] = effect
    return effect
  }

  static clear(): void {
    for (const url in this._cache) {
      const effect = this._cache[url]
      Graphics.effekseer.releaseEffect(effect)
    }
    this._cache = {}
  }

  static onLoad(): void {
    //
  }

  static onError(url: string): void {
    this._errorUrls.push(url)
  }

  static makeUrl(filename: string): string {
    return `effects/${Utils.encodeURI(filename)}.efkefc`
  }

  static checkErrors(): void {
    const url = this._errorUrls.shift()
    if (url) {
      this.throwLoadError(url)
    }
  }

  static throwLoadError(url: string): never {
    const retry = (): effekseer.EffekseerEffect => this.startLoading(url)
    // TODO fix this
    // eslint-disable-next-line no-throw-literal
    throw ['LoadError', url, retry]
  }

  static isReady(): boolean {
    this.checkErrors()
    for (const url in this._cache) {
      const effect = this._cache[url]
      if (!effect.isLoaded) {
        return false
      }
    }
    return true
  }
}
