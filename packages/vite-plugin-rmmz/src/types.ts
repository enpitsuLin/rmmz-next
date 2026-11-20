export interface RMMZPluginOptions {
  /**
   * Whether to log build steps.
   * @default false
   */
  debug?: boolean
}

/**
 * One entry of `js/plugins.js`, same shape as `PluginManager.PluginConfig`.
 */
export interface RMMZPluginConfig {
  name: string
  status: boolean
  description: string
  parameters: Record<string, string>
}
