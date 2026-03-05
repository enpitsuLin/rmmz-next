import { PluginManager } from "@rmmz-lib/core"

declare module 'virtual:rmmz-project' {
  export const $plugins: PluginManager.PluginConfig[]
}

export {}
