import type { Sprite } from 'pixi.js'
import type { Spriteset_Nightward } from '../sprites/Spriteset_Nightward'
import type { Window_NightwardScreen } from '../windows/Window_NightwardScreen'
import { Graphics, SoundManager } from 'rmmz-next'
import { NightwardManager } from '../managers/NightwardManager'
import { NightwardConfig } from '../patches/ConfigManager'
import { colors, FRAME_DT } from '../primitives/ui'
import { box } from '../sprites/uiSprites'
import { Scene_NightwardBase } from './Scene_NightwardBase'

/**
 * Base scene for pushed Nightward overlay menus (Options, How To Play).
 * Reuses the live retained Spriteset_Nightward as its background and returns it on pop.
 */
export abstract class Scene_NightwardMenuBase extends Scene_NightwardBase {
  protected _spriteset: Spriteset_Nightward | null = null
  protected _shade!: Sprite
  protected _closing = false
  private _shadeAlpha = 0
  private _shadeTarget = 0

  override start(): void {
    super.start()
    this._spriteset = NightwardManager.retainedSpriteset()
    if (this._spriteset)
      this.addChild(this._spriteset)
    const run = NightwardManager.run()
    if (run?.demo) {
      this.drawLetterbox(1)
      this.addChild(this._letterbox)
    }
    this._shadeTarget = run?.demo ? 0.5 : 0.62
    this._shade = box(Graphics.width, Graphics.height, colors.night, run?.demo ? 0 : 0.62)
    this._shadeAlpha = this._shade.alpha
    this.addChild(this._shade)
    this.createWindowLayer()
    this.createMenuWindow()
    this.clearInput()
  }

  protected abstract createMenuWindow(): void

  protected closeAndPop(window: Window_NightwardScreen): void {
    if (this._closing)
      return
    this._closing = true
    SoundManager.playCancel()
    NightwardConfig.save()
    this._shadeTarget = NightwardManager.run()?.demo ? 0 : 0.62
    window.closeWithAnimation(() => {
      this.clearInput()
      this.popScene()
    })
  }

  override update(): void {
    this.updateGlobalHotkeys()
    const run = NightwardManager.run()
    const liveDemo = !!run?.demo && run.state === 'running'
    NightwardManager.setSimulationFrozen(!liveDemo)
    if (liveDemo)
      run.update({ x: 0, z: 0 })
    this._shadeAlpha += (this._shadeTarget - this._shadeAlpha) * Math.min(1, FRAME_DT * 20)
    this._shade.alpha = this._shadeAlpha
    super.update()
  }

  override terminate(): void {
    super.terminate()
    // Detach borrowed spriteset without destroying it so the parent scene reclaims it on pop().
    if (this._spriteset) {
      this._spriteset.removeFromParent()
      this._spriteset = null
    }
  }

  override destroy(): void {
    this._shade?.removeFromParent()
    this._shade?.destroy()
    super.destroy()
  }
}
