import type { Plugin } from 'vite'
import type { RMMZPluginOptions } from './types.ts'
import { devServerInfo, stripDevRedirect } from './dev-redirect.ts'
import { virtualModule } from './virtual-module.ts'

export function rmmz(options: RMMZPluginOptions = {}): Plugin[] {
  return [
    virtualModule(options),
    devServerInfo(),
    stripDevRedirect(),
  ]
}

export type { RMMZPluginOptions } from './types.ts'
