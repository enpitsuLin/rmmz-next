import type { Game_Interpreter } from 'rmmz-next'
import type { MZ } from 'rmmz-next/database-types'
import { Game_Actor, Game_BattlerBase, GlobalMananger as globals, Graphics, Input, PluginManager, SceneManager } from 'rmmz-next'
import { installConfig } from './managers/NightwardConfigManager'
import { readPluginConfig } from './managers/NightwardDataManager'
import { installEffekseer } from './managers/NightwardEffectManager'
import { activeWeapon } from './objects/combat'
import { readMetaJson } from './primitives/metadata'
import { fullscreen } from './primitives/ui'
import { Scene_Nightward } from './scenes/Scene_Nightward'
import { Scene_NightwardTitle } from './scenes/Scene_NightwardTitle'
import '@pixi/3d'

export function installNightward(): void {
  installConfig()
  installEffekseer()
  Graphics._isFullScreen = () => !!document.fullscreenElement
  Graphics._switchFullScreen = fullscreen
  const updateEffekseer = SceneManager.updateEffekseer
  SceneManager.updateEffekseer = function (): void {
    if (!(this._scene instanceof Scene_Nightward))
      updateEffekseer.call(this)
  }
  const paramPlus = Game_Actor.prototype.paramPlus
  Game_Actor.prototype.paramPlus = function (paramId) {
    const weapon = activeWeapon(this)
    if (!weapon || paramId !== 2)
      return paramPlus.call(this, paramId)
    let value = Game_BattlerBase.prototype.paramPlus.call(this, paramId) + weapon.params[paramId]!
    for (const armor of this.armors())
      value += armor.params[paramId]!
    return value
  }
  const isNightwardClass = (entry: MZ.Class): boolean =>
    readMetaJson<{ key?: string }>(entry)?.key === 'nightward'
  const expForLevel = Game_Actor.prototype.expForLevel
  Game_Actor.prototype.expForLevel = function (level) {
    const c = this.currentClass()
    if (isNightwardClass(c) && c.expParams[2] === 0 && c.expParams[3] === 0)
      return Math.round((level - 1) * c.expParams[0]! + c.expParams[1]! * (level - 1) * (level - 2) / 2)
    return expForLevel.call(this, level)
  }
  const equipSlots = Game_Actor.prototype.equipSlots
  Game_Actor.prototype.equipSlots = function () {
    if (!isNightwardClass(this.currentClass()))
      return equipSlots.call(this)
    const { weaponSlots } = readPluginConfig()
    return [...Array.from<number>({ length: weaponSlots }).fill(1), 2, 3, 4, 5]
  }
  const run = SceneManager.run
  SceneManager.run = function (scene, scenes) {
    return run.call(this, scene, scenes ? { ...scenes, Title: Scene_NightwardTitle } : undefined)
  }
  Object.assign(Input.keyMapper, { 65: 'left', 68: 'right', 87: 'up', 83: 'down', 80: 'pause', 77: 'mute', 70: 'fullscreen', 49: 'choice1', 50: 'choice2', 51: 'choice3' })
  Input.gamepadMapper[9] = 'pause'
  PluginManager.registerCommand('Nightward', 'Start', () => SceneManager.goto(Scene_Nightward))
  PluginManager.registerCommand('Nightward', 'Pause', () => {
    const scene = SceneManager._scene
    if (scene instanceof Scene_Nightward)
      scene.pause()
  })
  PluginManager.registerCommand('Nightward', 'PhaseNotice', (args) => {
    const scene = SceneManager._scene
    if (scene instanceof Scene_Nightward)
      scene.showNotice(args.message)
  })
  PluginManager.registerCommand('Nightward', 'PhaseBanner', (args) => {
    const scene = SceneManager._scene
    if (scene instanceof Scene_Nightward)
      scene.showBanner(args.title, args.subtitle, Number(args.style), Number(args.hold), args.slam === 'true')
  })
  PluginManager.registerCommand('Nightward', 'TimerWarning', (args) => {
    const scene = SceneManager._scene
    if (scene instanceof Scene_Nightward)
      scene.setTimerWarning(args.enabled === 'true')
  })
  PluginManager.registerCommand('Nightward', 'PickupVacuum', () => {
    const scene = SceneManager._scene
    if (scene instanceof Scene_Nightward)
      scene.run.triggerVacuum()
  })
  PluginManager.registerCommand('Nightward', 'PickupRelic', (args) => {
    const scene = SceneManager._scene
    if (scene instanceof Scene_Nightward)
      scene.run.triggerRelic(Number(args.radius ?? 26), Number(args.delay ?? 0.4))
  })
  PluginManager.registerCommand('Nightward', 'PickupChest', () => {
    const scene = SceneManager._scene
    if (scene instanceof Scene_Nightward)
      scene.run.triggerChest()
  })
  for (const command of ['PropMove', 'PropVisible', 'PropBreak', 'PropDoor', 'PropCommonEvent', 'PropContext']) {
    PluginManager.registerCommand('Nightward', command, function (this: Game_Interpreter, args) {
      const scene = SceneManager._scene
      if (!(scene instanceof Scene_Nightward))
        return
      const run = scene.run
      const context = run.propContext(this)
      if (command === 'PropContext') {
        Reflect.apply(globals.$gameVariables.setValue, globals.$gameVariables, [Number(args.variable), context ?? ''])
        return
      }
      for (const prop of run.props.select(args.target === '@context' ? context ?? '' : args.target ?? '')) {
        if (command === 'PropMove') {
          const relative = args.relative === 'true'
          run.props.move(prop, Number(args.x) + (relative ? prop.x : 0), Number(args.y) + (relative ? prop.y : 0), Number(args.z) + (relative ? prop.z : 0))
        }
        else if (command === 'PropVisible') {
          run.props.show(prop, args.visible === 'true')
        }
        else if (command === 'PropBreak') {
          run.breakProp(prop)
        }
        else if (command === 'PropDoor') {
          run.props.open(prop, Number(args.amount), run.time, Number(args.duration ?? 0))
        }
        else if (command === 'PropCommonEvent') {
          run.queuePropEvent(Number(args.commonEvent), prop.id)
        }
      }
      run.world.syncProps()
    })
  }
}
