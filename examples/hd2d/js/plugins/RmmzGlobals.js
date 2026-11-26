// @ts-check
/* eslint-disable style/spaced-comment */

/*:
 * @target MZ
 * @plugindesc Publishes the engine on globalThis so classic plugins can run.
 * @author rmmz-next
 *
 * @help RmmzGlobals.js
 *
 * Enable it first in `js/plugins.js`. `loadPlugins()` evaluates the enabled
 * plugins in list order, so everything below this entry can read `Scene_Map`,
 * `Window_Base`, `$gameParty` and the other RPG Maker globals.
 *
 * Plugins written as ES modules (like TestPlugin.js) import the engine instead
 * and do not need this one.
 */
/*:zh
 * @target MZ
 * @plugindesc 将 rmmz-next 引擎类与全局状态挂载到 globalThis，以兼容传统 RPG Maker 插件。
 * @author rmmz-next
 *
 * @help RmmzGlobals.js
 *
 * 请在插件管理器（js/plugins.js）中将本插件放在最顶部启用。
 * 启用后，排在下方且依赖全局变量（如 Scene_Map、Window_Base、$gameParty 等）
 * 的经典插件即可正常运行。
 *
 * 纯 ESM 模块插件可直接从 'rmmz-next' 导入，不强制依赖本插件。
 */

import * as Rmmz from 'rmmz-next'

const {
  builtInScenes: _builtInScenes,
  initEffekseerRuntime: _initEffekseerRuntime,
  libUrls: _libUrls,
  loadExternalLibs: _loadExternalLibs,
  ...globals
} = Rmmz

Object.assign(globalThis, globals)

/** @satisfies {readonly Rmmz.GlobalMananger.GlobalStateName[]} */
const stateNames = /** @type {const} */ ([
  '$dataActors',
  '$dataClasses',
  '$dataSkills',
  '$dataItems',
  '$dataWeapons',
  '$dataArmors',
  '$dataEnemies',
  '$dataTroops',
  '$dataStates',
  '$dataAnimations',
  '$dataTilesets',
  '$dataCommonEvents',
  '$dataSystem',
  '$dataMapInfos',
  '$dataMap',
  '$gameTemp',
  '$gameSystem',
  '$gameScreen',
  '$gameTimer',
  '$gameMessage',
  '$gameSwitches',
  '$gameVariables',
  '$gameSelfSwitches',
  '$gameActors',
  '$gameParty',
  '$gameTroop',
  '$gameMap',
  '$gamePlayer',
  '$testEvent',
])

const globalState = /** @type {Record<string, unknown>} */ (/** @type {unknown} */ (Rmmz.GlobalMananger))

// Accessors keep globals in sync when a game is created or loaded.
for (const name of stateNames) {
  Object.defineProperty(globalThis, name, {
    configurable: true,
    get: () => globalState[name],
    set: (value) => {
      globalState[name] = value
    },
  })
}
