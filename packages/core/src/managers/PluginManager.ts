import { Utils } from '../core'

/**
 * PluginManager
 *
 * The static class that manages the plugins.
 */
export class PluginManager {
  constructor() {
    throw new Error('This is a static class')
  }

  static _scripts: string[] = []
  static _errorUrls: string[] = []
  static _parameters: Record<string, Record<string, string>> = {}
  static _commands: Record<string, (args: Record<string, string>) => void> = {}

  static setup(plugins: PluginManager.PluginConfig[]): void {
    for (const plugin of plugins) {
      const pluginName = Utils.extractFileName(plugin.name)
      if (pluginName && plugin.status && !this._scripts.includes(pluginName)) {
        this.setParameters(pluginName, plugin.parameters)
        this.loadScript(plugin.name)
        this._scripts.push(pluginName)
      }
    }
  }

  static parameters(name: string): Record<string, string> {
    return this._parameters[name.toLowerCase()] || {}
  }

  static setParameters(name: string, parameters: Record<string, string>): void {
    this._parameters[name.toLowerCase()] = parameters
  }

  static loadScript(filename: string): void {
    const url = this.makeUrl(filename)
    const script = document.createElement('script')
    script.type = 'text/javascript'
    script.src = url
    script.async = false
    script.defer = true
    // @ts-expect-error to fix this
    script.onerror = this.onError.bind(this)
    script._url = url
    document.body.appendChild(script)
  }

  static onError(e: Event): void {
    this._errorUrls.push((e.target as HTMLScriptElement)._url!)
  }

  static makeUrl(filename: string): string {
    return `js/plugins/${Utils.encodeURI(filename)}.js`
  }

  static checkErrors(): void {
    const url = this._errorUrls.shift()
    if (url) {
      this.throwLoadError(url)
    }
  }

  static throwLoadError(url: string): void {
    throw new Error(`Failed to load: ${url}`)
  }

  static registerCommand(
    pluginName: string,
    commandName: string,
    func: (args: Record<string, string>) => void,
  ): void {
    const key = `${pluginName}:${commandName}`
    this._commands[key] = func
  }

  static callCommand(
    thisArg: any,
    pluginName: string,
    commandName: string,
    args: Record<string, string>,
  ): void {
    const key = `${pluginName}:${commandName}`
    const func = this._commands[key]
    if (typeof func === 'function') {
      func.bind(thisArg)(args)
    }
  }
}

export namespace PluginManager {
  export interface PluginConfig {
    name: string
    status: boolean
    description: string
    parameters: Record<string, string>
  }
}
