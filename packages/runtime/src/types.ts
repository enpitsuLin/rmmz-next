import type { PluginManager } from '@rmmz-lib/core'

export interface MainOptions {
  /**
   * Enabled plugins, usually `$plugins` from `virtual:rmmz-project`.
   * Parameters are registered before the plugin modules are evaluated.
   */
  plugins?: PluginManager.PluginConfig[]
  /**
   * Evaluates the plugin modules. Called after `PluginManager.setup`.
   * Usually `loadPlugins` from `virtual:rmmz-project`.
   */
  loadPlugins?: () => Promise<void>
}
