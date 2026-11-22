import type { Game_Interpreter } from 'rmmz-next'
import { GlobalMananger as globals, PluginManager, SceneManager } from 'rmmz-next'
import { NightwardManager } from '../managers/NightwardManager'
import { Scene_Nightward } from '../scenes/Scene_Nightward'

type CommandHandler = (this: Game_Interpreter, args: Record<string, string>) => void

function forEachProp(interpreter: Game_Interpreter, targetArg: string | undefined, fn: (prop: ReturnType<NonNullable<ReturnType<typeof NightwardManager.run>>['props']['select']>[number]) => void): void {
  const run = NightwardManager.run()
  if (!run)
    return
  const context = run.propContext(interpreter)
  const target = targetArg === '@context' ? context ?? '' : targetArg ?? ''
  for (const prop of run.props.select(target))
    fn(prop)
  run.world.syncProps()
}

export function installPluginCommands(): void {
  const commands: Record<string, CommandHandler> = {
    Start: () => {
      NightwardManager.clearRetained()
      SceneManager.goto(Scene_Nightward)
    },
    Pause: () => NightwardManager.pause(),
    PhaseNotice: args => NightwardManager.showNotice(args.message ?? ''),
    PhaseBanner: args => NightwardManager.showBanner(
      args.title ?? '',
      args.subtitle ?? '',
      Number(args.style),
      Number(args.hold),
      args.slam === 'true',
    ),
    TimerWarning: args => NightwardManager.setTimerWarning(args.enabled === 'true'),
    PickupVacuum: () => NightwardManager.triggerVacuum(),
    PickupRelic: args => NightwardManager.triggerRelic(Number(args.radius ?? 26), Number(args.delay ?? 0.4)),
    PickupChest: () => NightwardManager.triggerChest(),
    PropContext(args) {
      const context = NightwardManager.propContext(this)
      Reflect.apply(globals.$gameVariables.setValue, globals.$gameVariables, [Number(args.variable), context ?? ''])
    },
    PropMove(args) {
      const relative = args.relative === 'true'
      forEachProp(this, args.target, (prop) => {
        NightwardManager.requireRun().props.move(
          prop,
          Number(args.x) + (relative ? prop.x : 0),
          Number(args.y) + (relative ? prop.y : 0),
          Number(args.z) + (relative ? prop.z : 0),
        )
      })
    },
    PropVisible(args) {
      const visible = args.visible === 'true'
      forEachProp(this, args.target, prop => NightwardManager.requireRun().props.show(prop, visible))
    },
    PropBreak(args) {
      forEachProp(this, args.target, prop => NightwardManager.breakProp(prop))
    },
    PropDoor(args) {
      forEachProp(this, args.target, (prop) => {
        const run = NightwardManager.requireRun()
        run.props.open(prop, Number(args.amount), run.time, Number(args.duration ?? 0))
      })
    },
    PropCommonEvent(args) {
      forEachProp(this, args.target, prop => NightwardManager.queuePropEvent(Number(args.commonEvent), prop.id))
    },
  }

  for (const [name, handler] of Object.entries(commands))
    PluginManager.registerCommand('Nightward', name, handler)
}
