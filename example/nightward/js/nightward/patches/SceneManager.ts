import { Scene_Base, Scene_Boot, SceneManager } from 'rmmz-next'
import { NightwardManager } from '../managers/NightwardManager'
import { NightwardRecordManager } from '../managers/NightwardRecordManager'
import { Scene_NightwardTitle } from '../scenes/Scene_NightwardTitle'

interface NightwardSceneBase {
  usesNativeEffekseer: () => boolean
}

export function installSceneManagerPatch(): void {
  const sceneProto = Scene_Base.prototype as Scene_Base & NightwardSceneBase
  sceneProto.usesNativeEffekseer = function (): boolean {
    return true
  }

  const _updateEffekseer = SceneManager.updateEffekseer
  SceneManager.updateEffekseer = function (): void {
    const scene = this._scene as (Scene_Base & Partial<NightwardSceneBase>) | null
    if (scene?.usesNativeEffekseer?.() === false)
      return
    _updateEffekseer.call(this)
  }

  const _onBeforeSceneStart = SceneManager.onBeforeSceneStart
  SceneManager.onBeforeSceneStart = function (): void {
    // Preserve active Effekseer handles when pushing/popping Nightward overlay scenes.
    if (NightwardManager.hasRetainedSpriteset()) {
      if (this._previousScene) {
        this._previousScene.destroy()
        this._previousScene = null
      }
      return
    }
    _onBeforeSceneStart.call(this)
  }

  const _loadPlayerData = Scene_Boot.prototype.loadPlayerData
  Scene_Boot.prototype.loadPlayerData = function (): void {
    _loadPlayerData.call(this)
    void NightwardRecordManager.load()
  }

  const _isPlayerDataLoaded = Scene_Boot.prototype.isPlayerDataLoaded
  Scene_Boot.prototype.isPlayerDataLoaded = function (): boolean {
    return _isPlayerDataLoaded.call(this) && NightwardRecordManager.isLoaded()
  }

  const _start = Scene_Boot.prototype.start
  Scene_Boot.prototype.start = function (): void {
    SceneManager._scenes.set('Title', Scene_NightwardTitle)
    _start.call(this)
  }
}
