export const VIRTUAL_MODULE_ID = 'virtual:rmmz-project'
export const RESOLVED_VIRTUAL_MODULE_ID = `\0${VIRTUAL_MODULE_ID}`

// MIME 类型映射 - 优化为 Map 以提升性能
export const MIME_TYPES = new Map([
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
export const BINARY_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.bmp',
  '.ico',
  '.wav',
  '.mp3',
  '.ogg',
  '.woff',
  '.woff2',
  '.ttf',
  '.otf',
  '.eot',
  '.wasm',
])
