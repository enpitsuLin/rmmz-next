/**
 * The game object class for the timer.
 */
import { BattleManager } from '../managers/BattleManager'

export class Game_Timer {
  _frames: number
  _working: boolean

  constructor() {
    this._frames = 0
    this._working = false
  }

  update(sceneActive: boolean): void {
    if (sceneActive && this._working && this._frames > 0) {
      this._frames--
      if (this._frames === 0) {
        this.onExpire()
      }
    }
  }

  start(count: number): void {
    this._frames = count
    this._working = true
  }

  stop(): void {
    this._working = false
  }

  isWorking(): boolean {
    return this._working
  }

  seconds(): number {
    return Math.floor(this._frames / 60)
  }

  frames(): number {
    return this._frames
  }

  onExpire(): void {
    BattleManager.abort()
  }
}
