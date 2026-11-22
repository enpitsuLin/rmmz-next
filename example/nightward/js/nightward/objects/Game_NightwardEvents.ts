import type { Game_Action } from 'rmmz-next'
import type { MZ } from 'rmmz-next/database-types'
import { Game_Action as Action, Game_Interpreter, GlobalMananger as globals } from 'rmmz-next'

export type PhaseSignal = 'start' | 'boss' | 'bossDeath' | 'victory'

interface PhaseEvent {
  at: string | number
  list: MZ.CommonEvent['list']
}

class NightwardInterpreter extends Game_Interpreter {
  constructor(readonly propId?: string, depth = 0) {
    super(depth)
  }

  override setupChild(list: MZ.EventCommon.PageCommand[], eventId: number): void {
    this._childInterpreter = new NightwardInterpreter(this.propId, this._depth + 1)
    this._childInterpreter.setup(list, eventId)
  }
}

export class Game_NightwardEvents {
  private phases: PhaseEvent[] = []
  private running: NightwardInterpreter[] = []
  private previousTime = -1

  constructor(demo: boolean) {
    for (const event of globals.$dataCommonEvents) {
      if (event?.trigger !== 0)
        continue
      const comment = event.list[0]
      if (comment?.code !== 108)
        continue
      const match = /^<nightwardPhase:(start|boss|bossDeath|victory|\d+(?:\.\d+)?)(,demo)?>$/.exec(String(comment.parameters[0]).trim())
      if (!match || (demo && !match[2]))
        continue
      const seconds = Number(match[1])
      this.phases.push({ at: Number.isNaN(seconds) ? match[1]! : seconds, list: event.list })
    }
  }

  propContext(interpreter: Game_Interpreter): string | undefined {
    return interpreter instanceof NightwardInterpreter ? interpreter.propId : undefined
  }

  run(commonEventId: number, propId?: string): void {
    const event = globals.$dataCommonEvents[commonEventId]
    if (event)
      this.start(event.list, propId)
  }

  applyAction(action: Game_Action): void {
    for (const effect of action.item().effects) {
      if (effect.code === Action.EFFECT_COMMON_EVENT)
        this.run(effect.dataId)
    }
    action.updateLastUsed()
    action.updateLastSubject()
  }

  queue(signal: PhaseSignal): void {
    for (const event of this.phases) {
      if (event.at === signal)
        this.start(event.list)
    }
  }

  update(time: number): void {
    const active = this.running
    this.running = []
    for (const interpreter of active) {
      interpreter.update()
      if (interpreter.isRunning())
        this.running.push(interpreter)
    }
    for (const event of this.phases) {
      if (typeof event.at === 'number' && this.previousTime < event.at && time >= event.at)
        this.start(event.list)
    }
    this.previousTime = time
  }

  clear(): void {
    for (const interpreter of this.running)
      interpreter.clear()
    this.running.length = 0
  }

  private start(list: MZ.CommonEvent['list'], propId?: string): void {
    const interpreter = new NightwardInterpreter(propId)
    interpreter.setup(list, 0)
    interpreter.update()
    if (interpreter.isRunning())
      this.running.push(interpreter)
  }
}
