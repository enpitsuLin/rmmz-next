import type { Game_Interpreter } from 'rmmz-next'
import type { Game_NightwardProp } from '../objects/Game_NightwardProp'
import type { Scene_NightwardBase } from '../scenes/Scene_NightwardBase'
import type { Sprite_NightwardHud } from '../sprites/Sprite_NightwardHud'
import type { Spriteset_Nightward } from '../sprites/Spriteset_Nightward'
import { DataManager, GlobalMananger as globals } from 'rmmz-next'
import { Game_NightwardRun } from '../objects/Game_NightwardRun'
import { NightwardDataManager } from './NightwardDataManager'
import { NightwardPropSceneManager } from './NightwardPropSceneManager'

/**
 * The static class that orchestrates the active Nightward session across scenes
 * and plugin commands (analogous to BattleManager).
 */
export class NightwardManager {
  static _run: Game_NightwardRun | null = null
  static _scene: Scene_NightwardBase | null = null
  static _retainedSpriteset: Spriteset_Nightward | null = null
  static _retainedHud: Sprite_NightwardHud | null = null
  static _fromTitle = false
  static _wipeReveal = false
  static _simulationFrozen = false

  constructor() {
    throw new Error('This is a static class')
  }

  static setup(demo: boolean): Game_NightwardRun {
    this.clear()
    DataManager.setupNewGame()
    globals.$gamePlayer.performTransfer()
    const content = NightwardDataManager.content()
    const propScene = NightwardPropSceneManager.get(NightwardPropSceneManager.urlForMap(globals.$dataMap))
    this._run = new Game_NightwardRun(content, propScene, demo)
    return this._run
  }

  static run(): Game_NightwardRun | null {
    return this._run
  }

  static requireRun(): Game_NightwardRun {
    if (!this._run)
      throw new Error('Nightward run is not active')
    return this._run
  }

  static hasRun(demo?: boolean): boolean {
    if (!this._run)
      return false
    return demo === undefined ? true : this._run.demo === demo
  }

  static setScene(scene: Scene_NightwardBase | null): void {
    this._scene = scene
  }

  static scene(): Scene_NightwardBase | null {
    return this._scene
  }

  static isSimulationFrozen(): boolean {
    return this._simulationFrozen
  }

  static setSimulationFrozen(frozen: boolean): void {
    this._simulationFrozen = frozen
  }

  static setFromTitle(value: boolean): void {
    this._fromTitle = value
  }

  static consumeFromTitle(): boolean {
    const value = this._fromTitle
    this._fromTitle = false
    return value
  }

  static setWipeReveal(value: boolean): void {
    this._wipeReveal = value
  }

  static consumeWipeReveal(): boolean {
    const value = this._wipeReveal
    this._wipeReveal = false
    return value
  }

  static retainForPush(spriteset: Spriteset_Nightward, hud: Sprite_NightwardHud | null = null): void {
    spriteset.removeFromParent()
    this._retainedSpriteset = spriteset
    if (hud) {
      hud.removeFromParent()
      hud.flights.removeFromParent()
      this._retainedHud = hud
    }
  }

  static hasRetainedSpriteset(): boolean {
    return !!this._retainedSpriteset
  }

  static retainedSpriteset(): Spriteset_Nightward | null {
    return this._retainedSpriteset
  }

  static takeRetainedSpriteset(): Spriteset_Nightward | null {
    const spriteset = this._retainedSpriteset
    this._retainedSpriteset = null
    return spriteset
  }

  static takeRetainedHud(): Sprite_NightwardHud | null {
    const hud = this._retainedHud
    this._retainedHud = null
    return hud
  }

  static pause(): void {
    this._scene?.requestPause()
  }

  static showNotice(message: string): void {
    this._scene?.showNotice(message)
  }

  static showBanner(title: string, subtitle: string, style: number, hold: number, slam: boolean): void {
    this._scene?.showBanner(title, subtitle, style, hold, slam)
  }

  static setTimerWarning(enabled: boolean): void {
    this._scene?.setTimerWarning(enabled)
  }

  static triggerVacuum(): void {
    this._run?.triggerVacuum()
  }

  static triggerRelic(radius = 26, delay = 0.4): void {
    this._run?.triggerRelic(radius, delay)
  }

  static triggerChest(): void {
    this._run?.triggerChest()
  }

  static breakProp(prop: Game_NightwardProp): void {
    this._run?.breakProp(prop)
  }

  static queuePropEvent(id: number, propId: string): void {
    this._run?.queuePropEvent(id, propId)
  }

  static propContext(interpreter: Game_Interpreter): string | undefined {
    return this._run?.propContext(interpreter)
  }

  static clearRetained(): void {
    this._retainedHud?.destroy()
    this._retainedHud = null
    this._retainedSpriteset?.destroy()
    this._retainedSpriteset = null
  }

  static clear(): void {
    this.clearRetained()
    this._run?.dispose()
    this._run = null
    this._simulationFrozen = false
  }
}
