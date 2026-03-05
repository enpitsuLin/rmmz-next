import type { Plugin } from 'vite'
import type { RMMZPluginOptions } from './types'
import { defu } from 'defu'
import { virtualModule } from './virtual-module.ts'

export function rmmz(options: RMMZPluginOptions = {}): Plugin[] {
  const opts = defu<RMMZPluginOptions, [RMMZPluginOptions]>(options, {
    apiPath: '/__rmmz__',
    debug: false,
    outputDir: 'project',
  })
  return [
    virtualModule(opts),
  ]
}

export type { RMMZPluginOptions } from './types'
