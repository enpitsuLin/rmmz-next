export const VIRTUAL_MODULE_ID = 'virtual:rmmz-project'
export const RESOLVED_VIRTUAL_MODULE_ID = `\0${VIRTUAL_MODULE_ID}`

// One virtual module per plugin, resolved to the real file in `js/plugins`.
export const PLUGIN_VIRTUAL_PREFIX = 'virtual:rmmz-plugin/'
export const PLUGINS_FILE = 'js/plugins.js'
export const PLUGINS_DIR = 'js/plugins'

// RPG Maker MZ runtime directories, copied into the output directory on build.
export const ASSET_DIRS = [
  'audio',
  'css',
  'data',
  'effects',
  'fonts',
  'icon',
  'img',
  'movies',
  'save',
]

// Files used by the editor / NW.js when running the output directory directly.
export const ROOT_FILES = ['game.rmmzproject', 'package.json']
