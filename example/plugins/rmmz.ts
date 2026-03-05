import { join, extname } from 'node:path'
import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import type { Plugin } from 'vite'

const VIRTUAL_MODULE_ID = 'virtual:rmmz-project'
const RESOLVED_VIRTUAL_MODULE_ID = `\0${VIRTUAL_MODULE_ID}`

// MIME 类型映射
const MIME_TYPES: Record<string, string> = {
  '.json': 'application/json',
  '.js': 'application/javascript',
  '.ts': 'application/typescript',
  '.txt': 'text/plain',
  '.md': 'text/markdown',
  '.html': 'text/html',
  '.css': 'text/css',
  '.xml': 'application/xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.bmp': 'image/bmp',
  '.ico': 'image/x-icon',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.eot': 'application/vnd.ms-fontobject',
  '.wasm': 'application/wasm',
}

function getMimeType(filePath: string): string {
  const ext = extname(filePath).toLowerCase()
  return MIME_TYPES[ext] || 'text/plain'
}

function isBinaryFile(filePath: string): boolean {
  const ext = extname(filePath).toLowerCase()
  const binaryExtensions = [
    '.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.ico',
    '.wav', '.mp3', '.ogg',
    '.woff', '.woff2', '.ttf', '.otf', '.eot',
    '.wasm'
  ]
  return binaryExtensions.includes(ext)
}

export interface RMMZPluginOptions {
  projectRoot?: string
  apiPath?: string
}

export function rmmz(options: RMMZPluginOptions = {}): Plugin[] {
  return [
    projectRoot(options),
    virtualModule(options),
  ]
}

function projectRoot(options: RMMZPluginOptions = {}): Plugin {
  let projectRoot: string
  return {
    name: "rmmz:project-root",
    configResolved(config) {
      projectRoot = options.projectRoot ?? join(config.publicDir, 'project')
    },
  }
}

function virtualModule(options: RMMZPluginOptions = {}): Plugin {
  let projectRoot: string
  // 确保 apiPath 以 / 开头
  const apiPath = options.apiPath
    ? (options.apiPath.startsWith('/') ? options.apiPath : `/${options.apiPath}`)
    : '/__rmmz_load_file'

  return {
    name: 'rmmz:virtual-module',
    configResolved(config) {
      projectRoot = options.projectRoot ?? join(config.publicDir, 'project')
    },
    resolveId(id) {
      if (id === VIRTUAL_MODULE_ID) {
        return RESOLVED_VIRTUAL_MODULE_ID
      }
    },
    load(id) {
      if (id === RESOLVED_VIRTUAL_MODULE_ID) {
        return `
export async function loadFile(filePath) {
  try {
    const response = await fetch('${apiPath}?path=' + encodeURIComponent(filePath));
    if (!response.ok) {
      throw new Error(\`Failed to load file: \${response.statusText}\`);
    }
    return await response.text();
  } catch (error) {
    throw new Error(\`Error loading file "\${filePath}": \${error.message}\`);
  }
}

export function fileurl(filePath) {
  return '${apiPath}?path=' + encodeURIComponent(filePath);
}

export const projectRoot = ${JSON.stringify(projectRoot)};
`
      }
    },
    configureServer(server) {
      server.middlewares.use(apiPath, async (req, res, next) => {
        const url = new URL(req.url!, `http://${req.headers.host}`)
        const filePath = url.searchParams.get('path')

        if (!filePath) {
          res.statusCode = 400
          res.end('Missing path parameter')
          return
        }

        const fullPath = join(projectRoot, filePath)

        // 安全检查：确保文件在 projectRoot 内
        if (!fullPath.startsWith(projectRoot)) {
          res.statusCode = 403
          res.end('Access denied: path outside project root')
          return
        }

        try {
          if (!existsSync(fullPath)) {
            res.statusCode = 404
            res.end(`File not found: ${filePath}`)
            return
          }

          const isBinary = isBinaryFile(filePath)
          const content = await readFile(fullPath, isBinary ? undefined : 'utf-8')
          const mimeType = getMimeType(filePath)

          if (isBinary) {
            res.setHeader('Content-Type', mimeType)
          } else {
            res.setHeader('Content-Type', `${mimeType}; charset=utf-8`)
          }

          res.end(content)
        } catch (error) {
          res.statusCode = 500
          res.end(`Error reading file: ${error.message}`)
        }
      })
    }
  }
}
