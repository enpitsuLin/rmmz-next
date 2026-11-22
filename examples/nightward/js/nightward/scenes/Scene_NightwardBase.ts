import { Graphics as Draw } from 'pixi.js'
import { DataManager, GlobalMananger as globals, Graphics, Input, Scene_Base, WindowLayer } from 'rmmz-next'
import { NightwardAssetManager } from '../managers/NightwardAssetManager'
import { NightwardManager } from '../managers/NightwardManager'
import { NightwardPropSceneManager } from '../managers/NightwardPropSceneManager'
import { NightwardRecordManager } from '../managers/NightwardRecordManager'
import { NightwardConfig } from '../patches/ConfigManager'
import { toggleFullscreen } from '../patches/Graphics'
import { clearInputEdge } from '../patches/Input'
import { uiLayout } from '../primitives/ui'
import { Sprite_NightwardWipe } from '../sprites/Sprite_NightwardWipe'
import { groundBitmaps } from '../sprites/Spriteset_NightwardGround'

/**
 * Shared superclass for Nightward scenes (Title, Play, Options, HowTo).
 * Manages asset/map readiness, full-viewport WindowLayer, global hotkeys, and wipe transitions.
 */
export abstract class Scene_NightwardBase extends Scene_Base {
  protected _letterbox = new Draw()
  protected _wipe = new Sprite_NightwardWipe()

  usesNativeEffekseer(): boolean {
    return false
  }

  override create(): void {
    super.create()
    NightwardAssetManager.load()
    if (!NightwardManager.hasRetainedSpriteset())
      DataManager.loadMapData(globals.$dataSystem.startMapId)
    void NightwardRecordManager.load()
  }

  override isReady(): boolean {
    if (!DataManager.isMapLoaded())
      return false
    groundBitmaps(globals.$dataTilesets[globals.$dataMap.tilesetId]!)
    return super.isReady()
      && NightwardAssetManager.isReady()
      && NightwardPropSceneManager.isReady(NightwardPropSceneManager.urlForMap(globals.$dataMap))
      && NightwardRecordManager.isLoaded()
  }

  override createWindowLayer(): void {
    this._windowLayer = new WindowLayer()
    this._windowLayer.x = 0
    this._windowLayer.y = 0
    this.addChild(this._windowLayer)
  }

  override start(): void {
    super.start()
    NightwardManager.setScene(this)
  }

  override terminate(): void {
    super.terminate()
    if (NightwardManager.scene() === this)
      NightwardManager.setScene(null)
  }

  protected updateGlobalHotkeys(): void {
    if (Input.isTriggered('mute'))
      NightwardConfig.toggleNightwardMute()
    if (Input.isTriggered('fullscreen'))
      toggleFullscreen()
  }

  protected drawLetterbox(amount: number): void {
    const l = uiLayout()
    const band = Math.round(l.h * (l.portrait ? 0.05 : 0.06) * amount) * l.unit
    this._letterbox.clear()
    if (band > 0)
      this._letterbox.rect(0, 0, Graphics.width, band).rect(0, Graphics.height - band, Graphics.width, band).fill(0)
  }

  protected clearInput(): void {
    clearInputEdge()
  }

  requestPause(): void {}
  showNotice(_message: string): void {}
  showBanner(_title: string, _subtitle: string, _style: number, _hold: number, _slam: boolean): void {}
  setTimerWarning(_enabled: boolean): void {}

  override destroy(): void {
    this._windowLayer?.removeFromParent()
    this._windowLayer?.destroy({ children: true })
    this._letterbox.removeFromParent()
    this._letterbox.destroy()
    this._wipe.removeFromParent()
    this._wipe.destroy({ children: true })
    super.destroy()
  }
}
