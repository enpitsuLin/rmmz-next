declare module 'virtual:rmmz-project' {
  export interface RmmzPluginConfig {
    name: string
    status: boolean
    description: string
    parameters: Record<string, string>
  }

  export interface RmmzRuntimeConfig {
    /**
     * `js/plugins.js` 中的插件配置
     */
    plugins: RmmzPluginConfig[]

    /**
     * 依次加载已启用的插件模块
     */
    loadPlugins: () => Promise<void>
  }

  /**
   * `js/plugins.js` 中的插件配置
   */
  export const plugins: RmmzPluginConfig[]

  /**
   * 依次加载已启用的插件模块
   */
  export function loadPlugins(): Promise<void>

  /**
   * 打包好的启动配置，可直接传给 `startRmmz`
   */
  export const runtime: RmmzRuntimeConfig
}
