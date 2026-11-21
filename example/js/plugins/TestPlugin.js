// @ts-check

/*:
 * @target MZ
 * @plugindesc Verifies that plugins load as ES modules and can extend the engine.
 * @author rmmz-next
 *
 * @help TestPlugin.js
 *
 * Enable it in `js/plugins.js`. The Vite virtual module imports this file as a
 * real ES module, so it imports the engine instead of relying on globals, and
 * `tsc` type checks it because `example/tsconfig.json` includes it.
 *
 * `Reflect.apply` calls the original method with the current `this`; the patch
 * is still a prototype assignment, because a built-in scene cannot be extended
 * any other way once the engine owns its construction.
 */

import { Scene_Boot } from 'rmmz-next'

const { start } = Scene_Boot.prototype

Scene_Boot.prototype.start = /** @this {Scene_Boot} */ function () {
  Reflect.apply(start, this, [])
  // eslint-disable-next-line no-console
  console.log('TestPlugin is loaded!')
}
StorageManager.saveObject('test', { value: 1 })
