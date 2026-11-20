declare module 'virtual:rmmz-project' {
  export interface RmmzPluginConfig {
    name: string
    status: boolean
    description: string
    parameters: Record<string, string>
  }

  /**
   * `js/plugins.js` 中的插件配置
   */
  export const $plugins: RmmzPluginConfig[]

  /**
   * 依次加载已启用的插件模块
   */
  export function loadPlugins(): Promise<void>
}
