import type { Plugin } from 'vite'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'

const VIRTUAL_MODULE_ID = 'virtual:rmmz-project'
const RESOLVED_VIRTUAL_MODULE_ID = `\0${VIRTUAL_MODULE_ID}`

interface RMMZPluginOptions {
  projectRoot?: string
}

function rmmzPluginResolver(options: RMMZPluginOptions = {}): Plugin {
  let pluginsFilePath: string

  return {
    name: 'rmmz',
    configResolved(config) {
      const root = options.projectRoot ?? config.publicDir
      pluginsFilePath = resolve(root, 'js/plugins.js')
    },
    resolveId(id) {
      if (id === VIRTUAL_MODULE_ID) {
        return RESOLVED_VIRTUAL_MODULE_ID
      }
    },
    load(id) {
      if (id === RESOLVED_VIRTUAL_MODULE_ID) {
        this.addWatchFile(pluginsFilePath)
        const content = readFileSync(pluginsFilePath, 'utf-8')
        return `${content}\nexport { $plugins }`
      }
    },
  }
}

export default defineConfig({
  plugins: [
    rmmzPluginResolver({ projectRoot: resolve(__dirname, 'project') }),
  ],
  esbuild: {
    target: 'es2021',
  },
  build: {
    target: 'es2021',
  },
})
