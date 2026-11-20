import * as managers from './managers'
import { GlobalMananger } from './managers/GlobalManager'
import * as objects from './objects'
import * as primitives from './primitives'
import * as scenes from './scenes'
import * as sprites from './sprites'
import * as windows from './windows'

/**
 * The `$`-prefixed globals RPG Maker scripts read directly. They are plain
 * properties of the global state, exposed as accessors so that creating or
 * loading a game swaps the value behind them.
 */
const stateNames = [
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
] as const satisfies readonly GlobalMananger.GlobalStateName[]

const globalState = GlobalMananger as unknown as Record<string, unknown>

/**
 * Publishes the engine on `globalThis` the way RPG Maker does, so classic
 * plugins that read `Scene_Map`, `Window_Base`, `$gameParty` and friends keep
 * working without being rewritten as ES modules.
 *
 * Only module bindings are copied, never imported, so this cannot create an
 * import cycle. Call it before plugin modules are evaluated.
 */
export function installGlobals(): void {
  // `builtInScenes` is an engine detail; every other export mirrors an RPG Maker
  // global.
  const sceneClasses: Record<string, unknown> = { ...scenes }
  delete sceneClasses.builtInScenes
  Object.assign(globalThis, managers, objects, primitives, sceneClasses, sprites, windows)

  for (const name of stateNames) {
    Object.defineProperty(globalThis, name, {
      configurable: true,
      get: () => globalState[name],
      set: (value: unknown) => {
        globalState[name] = value
      },
    })
  }
}
