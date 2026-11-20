import { Utils } from '../core'

/**
 * PluginManager
 *
 * The static class that keeps plugin parameters and plugin commands.
 *
 * It intentionally knows nothing about how plugin code is fetched: plugins are
 * shipped as ES modules by the host (the Vite virtual module in this repo), so
 * loading them is a bootstrap concern rather than a manager concern.
 */
export class PluginManager {
  constructor() {
    throw new Error('This is a static class')
  }

  static _scripts: string[] = []
  static _parameters: Record<string, Record<string, string>> = {}
  static _commands: Record<string, (args: Record<string, string>) => void> = {}

  /**
   * Registers the enabled plugins and their parameters.
   *
   * Call this before the plugin modules are evaluated so plugins can read their
   * parameters during module initialization.
   */
  static setup(plugins: PluginManager.PluginConfig[]): void {
    for (const plugin of plugins) {
      const pluginName = Utils.extractFileName(plugin.name)
      if (pluginName && plugin.status && !this._scripts.includes(pluginName)) {
        this.setParameters(pluginName, plugin.parameters)
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

  static registerCommand(
    pluginName: string,
    commandName: string,
    func: (args: Record<string, string>) => void,
  ): void {
    const key = `${pluginName}:${commandName}`
    this._commands[key] = func
  }

  static callCommand(
    thisArg: unknown,
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
