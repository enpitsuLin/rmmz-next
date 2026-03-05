import { join, extname, resolve, relative } from 'node:path'
import { readFile, stat } from 'node:fs/promises'
import type { Plugin, ResolvedConfig } from 'vite'

const VIRTUAL_MODULE_ID = 'virtual:rmmz-project'
const RESOLVED_VIRTUAL_MODULE_ID = `\0${VIRTUAL_MODULE_ID}`

// MIME 类型映射 - 优化为 Map 以提升性能
const MIME_TYPES = new Map([
  ['.json', 'application/json'],
  ['.js', 'application/javascript'],
  ['.ts', 'application/typescript'],
  ['.txt', 'text/plain'],
  ['.md', 'text/markdown'],
  ['.html', 'text/html'],
  ['.css', 'text/css'],
  ['.xml', 'application/xml'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.gif', 'image/gif'],
  ['.svg', 'image/svg+xml'],
  ['.webp', 'image/webp'],
  ['.bmp', 'image/bmp'],
  ['.ico', 'image/x-icon'],
  ['.wav', 'audio/wav'],
  ['.mp3', 'audio/mpeg'],
  ['.ogg', 'audio/ogg'],
  ['.woff', 'font/woff'],
  ['.woff2', 'font/woff2'],
  ['.ttf', 'font/ttf'],
  ['.otf', 'font/otf'],
  ['.eot', 'application/vnd.ms-fontobject'],
  ['.wasm', 'application/wasm'],
])

// 二进制文件扩展名集合 - 使用 Set 提升查找性能
const BINARY_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.ico',
  '.wav', '.mp3', '.ogg',
  '.woff', '.woff2', '.ttf', '.otf', '.eot',
  '.wasm'
])

function getMimeType(filePath: string): string {
  const ext = extname(filePath).toLowerCase()
  return MIME_TYPES.get(ext) ?? 'text/plain'
}

function isBinaryFile(filePath: string): boolean {
  const ext = extname(filePath).toLowerCase()
  return BINARY_EXTENSIONS.has(ext)
}

export interface RMMZPluginOptions {
  /** 项目根目录路径，默认为 public/project */
  projectRoot?: string
  /** API 路径，默认为 /__rmmz_load_file */
  apiPath?: string
  /** 是否启用开发模式日志 */
  debug?: boolean
}

export function rmmz(options: RMMZPluginOptions = {}): Plugin[] {
  return [
    virtualModule(options),
  ]
}

function virtualModule(options: RMMZPluginOptions = {}): Plugin {
  let config: ResolvedConfig
  let resolvedProjectRoot: string

  // 确保 apiPath 以 / 开头且格式正确
  const apiPath = options.apiPath?.startsWith('/')
    ? options.apiPath
    : `/${options.apiPath ?? '__rmmz_load_file'}`

  const debug = options.debug && process.env.NODE_ENV === 'development'

  function log(...args: unknown[]) {
    if (debug) {
      console.log('[rmmz-plugin]', ...args)
    }
  }

  return {
    name: 'rmmz:virtual-module',
    configResolved(resolvedConfig) {
      config = resolvedConfig
      resolvedProjectRoot = resolve(
        options.projectRoot ?? join(config.publicDir, 'project')
      )
      log('项目根目录:', resolvedProjectRoot)
    },
    resolveId(id) {
      if (id === VIRTUAL_MODULE_ID) {
        return RESOLVED_VIRTUAL_MODULE_ID
      }
    },
    load(id) {
      if (id === RESOLVED_VIRTUAL_MODULE_ID) {
        // 使用模板字符串生成更清晰的代码
        return `
export function fileurl(filePath) {
  if (typeof filePath !== 'string') {
    throw new TypeError('filePath must be a string');
  }
  return '${apiPath}?path=' + encodeURIComponent(filePath);
}

export const projectRoot = ${JSON.stringify(resolvedProjectRoot)};
`
      }
    },
    configureServer(server) {
      server.middlewares.use(apiPath, async (req, res) => {
        try {
          const url = new URL(req.url!, `http://${req.headers.host}`)
          const filePath = url.searchParams.get('path')

          if (!filePath) {
            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'Missing path parameter' }))
            return
          }

          // 标准化路径并进行安全检查
          const normalizedPath = relative('.', filePath).replace(/\\/g, '/')
          if (normalizedPath.startsWith('../') || normalizedPath.includes('/../')) {
            res.statusCode = 403
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'Access denied: invalid path' }))
            return
          }

          const fullPath = resolve(resolvedProjectRoot, normalizedPath)

          // 双重安全检查：确保解析后的路径仍在项目根目录内
          if (!fullPath.startsWith(resolvedProjectRoot)) {
            res.statusCode = 403
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'Access denied: path outside project root' }))
            return
          }

          // 检查文件是否存在并获取统计信息
          let stats
          try {
            stats = await stat(fullPath)
          } catch {
            res.statusCode = 404
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: `File not found: ${filePath}` }))
            return
          }

          // 确保是文件而不是目录
          if (!stats.isFile()) {
            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'Path is not a file' }))
            return
          }

          const isBinary = isBinaryFile(filePath)
          const mimeType = getMimeType(filePath)

          // 设置缓存头以提升性能
          const lastModified = stats.mtime.toUTCString()
          res.setHeader('Last-Modified', lastModified)
          res.setHeader('ETag', `"${stats.size}-${stats.mtime.getTime()}"`)

          // 检查条件请求
          const ifModifiedSince = req.headers['if-modified-since']
          const ifNoneMatch = req.headers['if-none-match']

          if (ifModifiedSince === lastModified || ifNoneMatch === res.getHeader('ETag')) {
            res.statusCode = 304
            res.end()
            return
          }

          // 读取并返回文件内容
          const content = await readFile(fullPath, isBinary ? undefined : 'utf-8')

          res.setHeader('Content-Type', isBinary ? mimeType : `${mimeType}; charset=utf-8`)
          res.setHeader('Content-Length', Buffer.byteLength(content))

          log(`服务文件: ${filePath} (${mimeType})`)
          res.end(content)

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          log('文件服务错误:', errorMessage)

          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: `Internal server error: ${errorMessage}` }))
        }
      })
    }
  }
}
