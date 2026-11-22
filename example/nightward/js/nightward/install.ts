import type { Game_Interpreter } from 'rmmz-next'
import { Game_Actor, GlobalMananger as globals, Input, PluginManager, SceneManager } from 'rmmz-next'
import { installConfig } from './managers/NightwardConfigManager'
import { installEffekseer } from './managers/NightwardEffectManager'
import { Scene_Nightward } from './scenes/Scene_Nightward'
import { Scene_NightwardTitle } from './scenes/Scene_NightwardTitle'
import '@pixi/3d'

export function installNightward(): void {
  installConfig()
  installEffekseer()
  const updateEffekseer = SceneManager.updateEffekseer
  SceneManager.updateEffekseer = function (): void {
    if (!(this._scene instanceof Scene_Nightward))
      updateEffekseer.call(this)
  }
  const expForLevel = Game_Actor.prototype.expForLevel
  Game_Actor.prototype.expForLevel = function (level) {
    return this.currentClass().note.includes('"key":"nightward"') ? 5 * (level - 1) ** 2 : expForLevel.call(this, level)
  }
  const equipSlots = Game_Actor.prototype.equipSlots
  Game_Actor.prototype.equipSlots = function () {
    return this.currentClass().note.includes('"key":"nightward"') ? [1, 1, 1, 1, 1, 1, 2, 3, 4, 5] : equipSlots.call(this)
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
