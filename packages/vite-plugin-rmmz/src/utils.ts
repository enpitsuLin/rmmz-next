import { copyFile, mkdir, readdir } from 'node:fs/promises'
import { extname, join } from 'node:path'
import { BINARY_EXTENSIONS, MIME_TYPES } from './constants'

export function getMimeType(filePath: string): string {
  const ext = extname(filePath).toLowerCase()
  return MIME_TYPES.get(ext) ?? 'text/plain'
}

export function isBinaryFile(filePath: string): boolean {
  const ext = extname(filePath).toLowerCase()
  return BINARY_EXTENSIONS.has(ext)
}

export function shouldTransform(filePath: string): boolean {
  const ext = extname(filePath).toLowerCase()
  return ['.js', '.ts', '.jsx', '.tsx'].includes(ext)
}

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
