import { Game_Event } from 'rmmz-next'

export interface NightwardEventMethods {
  nightwardActivePage: () => ReturnType<Game_Event['page']> | undefined
  nightwardRealX: () => number
  nightwardRealY: () => number
}

export type NightwardEvent = Game_Event & NightwardEventMethods

export function installGameEventPatch(): void {
  const proto = Game_Event.prototype as NightwardEvent

  proto.nightwardActivePage = function () {
    return this._erased || this._pageIndex < 0 ? undefined : this.page()
  }

  proto.nightwardRealX = function (): number {
    return this._realX
  }

  proto.nightwardRealY = function (): number {
    return this._realY
  }
}
