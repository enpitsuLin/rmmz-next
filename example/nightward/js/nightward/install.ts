import '@pixi/3d'
import { Game_Actor, Input, PluginManager, SceneManager } from 'rmmz-next'
import { installConfig } from './audio'
import { installEffekseer } from './effekseer'
import { Scene_Nightward, startNightwardRun } from './scene'
import { Scene_NightwardTitle } from './title-scene'

export function installNightward(): void {
  installConfig()
  installEffekseer()
  const updateEffekseer = SceneManager.updateEffekseer
  SceneManager.updateEffekseer = function (): void {
    if (!(this._scene instanceof Scene_Nightward)) updateEffekseer.call(this)
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
  PluginManager.registerCommand('Nightward', 'Start', startNightwardRun)
  PluginManager.registerCommand('Nightward', 'Pause', () => {
    const scene = SceneManager._scene
    if (scene instanceof Scene_Nightward) scene.pause()
  })
}
