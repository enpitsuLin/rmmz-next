// @ts-check

/* :
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
