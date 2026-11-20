import type { Plugin } from 'vite'
import type { RMMZPluginOptions } from './types'
import { virtualModule } from './virtual-module.ts'

export function rmmz(options: RMMZPluginOptions = {}): Plugin[] {
  return [
    virtualModule(options),
  ]
}

export type { RMMZPluginOptions } from './types'
