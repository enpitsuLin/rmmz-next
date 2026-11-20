// @ts-check

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

import { installGlobals } from 'rmmz-next'

installGlobals()
