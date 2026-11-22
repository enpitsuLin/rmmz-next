import type { MZ } from 'rmmz-next/database-types'
import { Game_Interpreter, GlobalMananger as globals } from 'rmmz-next'

type PhaseSignal = 'start' | 'boss' | 'bossDeath' | 'victory'
interface PhaseEvent {
  at: string | number
  list: MZ.CommonEvent['list']
}

export class Game_NightwardPhaseEvents {
  private events: PhaseEvent[] = []
  private running: Game_Interpreter[] = []
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
      this.events.push({ at: Number.isNaN(seconds) ? match[1]! : seconds, list: event.list })
    }
  }

  queue(signal: PhaseSignal): void {
    for (const event of this.events) {
      if (event.at === signal)
        this.start(event)
    }
  }

  update(time: number): void {
    for (const event of this.events) {
      if (typeof event.at === 'number' && this.previousTime < event.at && time >= event.at)
        this.start(event)
    }
    this.previousTime = time
    this.running = this.running.filter((interpreter) => {
      interpreter.update()
      return interpreter.isRunning()
    })
  }

  private start(event: PhaseEvent): void {
    // Waiting in one common event must not delay another phase.
    const interpreter = new Game_Interpreter()
    interpreter.setup(event.list)
    this.running.push(interpreter)
  }
}
