import type { RMMZPluginConfig } from './types'
import { copyFile, mkdir, readdir } from 'node:fs/promises'
import { join } from 'node:path'

// 递归复制目录
export async function copyDirectory(src: string, dest: string): Promise<void> {
  await mkdir(dest, { recursive: true })
  const entries = await readdir(src, { withFileTypes: true })

  for (const entry of entries) {
    const srcPath = join(src, entry.name)
    const destPath = join(dest, entry.name)

    if (entry.isDirectory()) {
      await copyDirectory(srcPath, destPath)
    }
    else {
      await copyFile(srcPath, destPath)
    }
  }
}

/**
 * `js/plugins.js` is generated as `var $plugins = [...];`.
 * Strip the wrapper and parse the JSON array.
 */
export function parsePluginsFile(source: string): RMMZPluginConfig[] {
  const match = /var\s+\$plugins\s*=\s*([\s\S]*)/.exec(source)
  if (!match) {
    return []
  }
  return JSON.parse(match[1].trim().replace(/;$/, '')) as RMMZPluginConfig[]
}
