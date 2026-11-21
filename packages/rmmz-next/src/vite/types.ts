export interface RMMZPluginOptions {
  /**
   * Whether to log build steps.
   * @default false
   */
  debug?: boolean
  /**
   * Additional resource directories, relative to the game project root.
   * Copied into the build output with the same relative paths.
   * Standard RPG Maker resource directories are always included.
   * @default []
   */
  extraAssetDirs?: string[]
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
