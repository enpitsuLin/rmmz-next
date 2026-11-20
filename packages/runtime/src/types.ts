import type { PluginManager } from '@rmmz-lib/core'

export interface RmmzRuntimeOptions {
  /**
   * Enabled plugins from `js/plugins.js`.
   * Parameters are registered before the plugin modules are evaluated.
   */
  plugins?: PluginManager.PluginConfig[]
  /**
   * Evaluates the plugin modules. Called after `PluginManager.setup`.
   */
  loadPlugins?: () => Promise<void>
}
