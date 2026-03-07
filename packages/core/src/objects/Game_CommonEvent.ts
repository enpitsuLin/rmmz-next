import type { MZ } from '@rmmz-lib/database-types'
import { Game_Interpreter } from './Game_Interpreter'

/**
 * The game object class for a common event.
 *
 *  It contains functionality for running parallel process events.
 */
export class Game_CommonEvent {
  _commonEventId: number
  _interpreter!: Game_Interpreter | null
  constructor(commonEventId: number) {
    this._commonEventId = commonEventId
    this.refresh()
  }

  event(): MZ.CommonEvent {
    return $dataCommonEvents[this._commonEventId]!
  }

  list(): MZ.EventCommon.PageCommand[] {
    return this.event().list
  }

  refresh(): void {
    if (this.isActive()) {
      if (!this._interpreter) {
        this._interpreter = new Game_Interpreter()
      }
    }
    else {
      this._interpreter = null
    }
  }

  isActive(): boolean {
    const event = this.event()
    return event.trigger === 2 && $gameSwitches.value(event.switchId)
  }

  update(): void {
    if (this._interpreter) {
      if (!this._interpreter.isRunning()) {
        this._interpreter.setup(this.list())
      }
      this._interpreter.update()
    }
  }
}
