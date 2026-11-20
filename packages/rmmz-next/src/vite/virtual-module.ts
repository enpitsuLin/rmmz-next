import type { Plugin, ResolvedConfig, Rollup } from 'vite'
import type { RMMZPluginConfig, RMMZPluginOptions } from './types'
import { copyFile, readFile, stat } from 'node:fs/promises'
import { join, resolve, sep } from 'node:path'
import {
  ASSET_DIRS,
  PLUGIN_VIRTUAL_PREFIX,
  PLUGINS_DIR,
  PLUGINS_FILE,
  RESOLVED_VIRTUAL_MODULE_ID,
  ROOT_FILES,
  VIRTUAL_MODULE_ID,
} from './constants.ts'
import { copyDirectory, parsePluginsFile } from './utils.ts'

async function isDirectory(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isDirectory()
  }
  catch {
    return false
  }
}

export function virtualModule(options: RMMZPluginOptions = {}): Plugin {
  let projectRoot: string
  let pluginsDir: string

  function log(...args: unknown[]): void {
    if (options.debug) {
      // eslint-disable-next-line no-console
      console.log('[rmmz-plugin]', ...args)
    }
  }

  async function readPlugins(): Promise<RMMZPluginConfig[]> {
    try {
      const source = await readFile(join(projectRoot, PLUGINS_FILE), 'utf-8')
      return parsePluginsFile(source)
    }
    catch (error) {
      if ((error as { code?: string }).code === 'ENOENT') {
        return []
      }
      throw error
    }
  }

  /**
   * Builds the client module. Plugin discovery lives here so the game entry
   * stays free of bundler-specific knowledge.
   */
  function generateClientModule(plugins: RMMZPluginConfig[]): string {
    const pluginImports = plugins
      .filter(plugin => plugin.status)
      .map(plugin => `  [${JSON.stringify(plugin.name)}, () => import(${JSON.stringify(PLUGIN_VIRTUAL_PREFIX + plugin.name)})],`)
      .join('\n')

    return `
export const $plugins = ${JSON.stringify(plugins, null, 2)}

const pluginModules = [
${pluginImports}
]

export async function loadPlugins() {
  for (const [name, load] of pluginModules) {
    try {
      await load()
    }
    catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      throw new Error('[rmmz] Failed to load plugin "' + name + '": ' + reason)
    }
  }
}
`
  }

  return {
    name: 'rmmz:virtual-module',
    configResolved(config: ResolvedConfig) {
      projectRoot = config.root
      pluginsDir = resolve(projectRoot, PLUGINS_DIR)
      log('项目根目录:', projectRoot)
    },
    resolveId(id) {
      if (id === VIRTUAL_MODULE_ID) {
        return RESOLVED_VIRTUAL_MODULE_ID
      }
      if (id.startsWith(PLUGIN_VIRTUAL_PREFIX)) {
        const name = id.slice(PLUGIN_VIRTUAL_PREFIX.length)
        const filePath = resolve(pluginsDir, `${name}.js`)
        if (!filePath.startsWith(pluginsDir + sep)) {
          this.error(`[rmmz] Plugin path escapes the plugins directory: ${name}`)
        }
        return filePath
      }
    },
    async load(id) {
      if (id === RESOLVED_VIRTUAL_MODULE_ID) {
        return generateClientModule(await readPlugins())
      }
    },
    configureServer(server) {
      const pluginsFile = join(projectRoot, PLUGINS_FILE)
      server.watcher.add(pluginsFile)
      server.watcher.on('change', (file) => {
        if (file !== pluginsFile) {
          return
        }
        const moduleGraph = server.environments.client.moduleGraph
        const module = moduleGraph.getModuleById(RESOLVED_VIRTUAL_MODULE_ID)
        if (module) {
          moduleGraph.invalidateModule(module)
        }
        server.ws.send({ type: 'full-reload' })
      })
    },
    // 生产构建：把游戏资源复制到输出目录，与生成的 index.html 同级
    async writeBundle(options: Rollup.OutputOptions) {
      if (!options.dir) {
        return
      }

      for (const dir of ASSET_DIRS) {
        const source = join(projectRoot, dir)
        if (!(await isDirectory(source))) {
          continue
        }
        await copyDirectory(source, join(options.dir, dir))
      }

      for (const file of ROOT_FILES) {
        try {
          await copyFile(join(projectRoot, file), join(options.dir, file))
        }
        catch (error) {
          if ((error as { code?: string }).code !== 'ENOENT') {
            throw error
          }
        }
      }

      log(`已复制游戏资源到: ${options.dir}`)
    },
  }
}
