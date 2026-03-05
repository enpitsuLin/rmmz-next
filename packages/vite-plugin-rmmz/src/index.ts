import type { Plugin, ResolvedConfig, Rollup, ViteDevServer } from 'vite'
import { Buffer } from 'node:buffer'
import { copyFile, mkdir, readdir, readFile, stat } from 'node:fs/promises'
import { extname, join, relative, resolve } from 'node:path'
import process from 'node:process'
import { defu } from 'defu'
import { withLeadingSlash } from 'ufo'
import { BINARY_EXTENSIONS, MIME_TYPES, RESOLVED_VIRTUAL_MODULE_ID, VIRTUAL_MODULE_ID } from './constants'

function getMimeType(filePath: string): string {
  const ext = extname(filePath).toLowerCase()
  return MIME_TYPES.get(ext) ?? 'text/plain'
}

function isBinaryFile(filePath: string): boolean {
  const ext = extname(filePath).toLowerCase()
  return BINARY_EXTENSIONS.has(ext)
}

function shouldTransform(filePath: string): boolean {
  const ext = extname(filePath).toLowerCase()
  return ['.js', '.ts', '.jsx', '.tsx'].includes(ext)
}

// 递归复制目录
async function copyDirectory(src: string, dest: string): Promise<void> {
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

export interface RMMZPluginOptions {
  /**
   * 项目根目录路径，默认为 public/project
   */
  projectRoot?: string
  /**
   * API 路径
   * @default `/__rmmz__`
   */
  apiPath?: string
  /**
   * 是否启用开发模式日志
   */
  debug?: boolean
  /**
   * 生产环境输出目录名
   * @default `project`
   */
  outputDir?: string
}

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

function virtualModule(options: RMMZPluginOptions = {}): Plugin {
  let config: ResolvedConfig
  let resolvedProjectRoot: string
  let viteServer: ViteDevServer

  // 确保 apiPath 以 / 开头且格式正确
  const apiPath = withLeadingSlash(options.apiPath)

  // 生产环境输出目录名
  const projectOutputDir = options.outputDir!

  const debug = options.debug && process.env.NODE_ENV === 'development'

  function log(...args: unknown[]): void {
    if (debug) {
      // eslint-disable-next-line no-console
      console.log('[rmmz-plugin]', ...args)
    }
  }

  return {
    name: 'rmmz:virtual-module',
    configResolved(resolvedConfig) {
      config = resolvedConfig
      resolvedProjectRoot = resolve(
        options.projectRoot ?? join(config.publicDir, 'project'),
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
        // 根据环境生成不同的代码
        const isProduction = process.env.NODE_ENV === 'production'

        if (isProduction) {
          // 生产环境：直接返回相对路径
          return `
export function fileurl(filePath) {
  if (typeof filePath !== 'string') {
    throw new TypeError('filePath must be a string');
  }
  return '/${projectOutputDir}/' + filePath;
}

export const projectRoot = ${JSON.stringify(resolvedProjectRoot)};
`
        }
        else {
          // 开发环境：使用 API 端点
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
      }
    },
    configureServer(server) {
      viteServer = server
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
          }
          catch {
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

          // 检查是否需要使用 Vite 转换
          const needsTransform = shouldTransform(filePath) && viteServer

          if (needsTransform) {
            try {
              // 使用 Vite 转换文件
              const transformResult = await viteServer.transformRequest(fullPath)
              if (transformResult?.code) {
                const transformedContent = transformResult.code

                // 设置正确的 Content-Type
                res.setHeader('Content-Type', 'application/javascript; charset=utf-8')
                res.setHeader('Content-Length', Buffer.byteLength(transformedContent))

                // 保持现有缓存机制
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

                log(`服务转换后的文件: ${filePath}`)
                res.end(transformedContent)
                return
              }
            }
            catch (transformError) {
              // 返回转换错误信息
              const errorMessage = transformError instanceof Error ? transformError.message : 'Unknown transform error'
              log('Vite 转换错误:', errorMessage)

              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({
                error: `Vite transform failed: ${errorMessage}`,
                file: filePath,
              }))
              return
            }
          }

          // 如果不需要转换或转换失败，继续原有的文件读取逻辑
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
        }
        catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          log('文件服务错误:', errorMessage)

          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: `Internal server error: ${errorMessage}` }))
        }
      })
    },
    // 生产构建：将项目文件复制到输出目录
    async writeBundle(options: Rollup.OutputOptions) {
      const isProduction = process.env.NODE_ENV === 'production'
      if (!isProduction || !options.dir) {
        return
      }

      const outputDir = resolve(options.dir, projectOutputDir)
      log(`复制项目文件到输出目录: ${outputDir}`)

      try {
        await copyDirectory(resolvedProjectRoot, outputDir)
        log('项目文件复制完成')
      }
      catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        log('复制文件失败:', errorMessage)
        throw error
      }
    },
  }
}
