/*:
 * @target MZ
 * @plugindesc Nightward — a complete 3D survivor mode powered by RMMZ data.
 * @author rmmz-next
 *
 * @command Start
 * @text Start Nightward
 * @desc Start a fresh run in the graveyard.
 *
 * @command Pause
 * @text Pause Nightward
 * @desc Open the current run's pause overlay.
 *
 * @command PhaseNotice
 * @text Show Stage Notice
 * @arg message
 * @type string
 *
 * @command PhaseBanner
 * @text Show Stage Banner
 * @arg title
 * @type string
 * @arg subtitle
 * @type string
 * @arg style
 * @type select
 * @option Gold
 * @value 1
 * @option Warning
 * @value 2
 * @default 1
 * @arg hold
 * @text Hold (seconds)
 * @type number
 * @decimals 2
 * @min 0
 * @default 2
 * @arg slam
 * @text Slam Entrance
 * @type boolean
 * @default false
 *
 * @command TimerWarning
 * @text Set Timer Warning
 * @desc Enabling the warning also pulses the timer.
 * @arg enabled
 * @type boolean
 * @default true
 *
 * @command PropMove
 * @text Move Prop
 * @arg target
 * @text Prop ID / #tag / @context
 * @type string
 * @default brazier:1
 * @arg x
 * @type number
 * @decimals 3
 * @min -10000
 * @default 0
 * @arg y
 * @type number
 * @decimals 3
 * @min -10000
 * @default 0
 * @arg z
 * @type number
 * @decimals 3
 * @min -10000
 * @default 0
 * @arg relative
 * @type boolean
 * @default false
 *
 * @command PropVisible
 * @text Show / Hide Props
 * @arg target
 * @type string
 * @default brazier:1
 * @arg visible
 * @type boolean
 * @default true
 *
 * @command PropBreak
 * @text Break Props
 * @arg target
 * @type string
 * @default brazier:1
 *
 * @command PropDoor
 * @text Open / Close Prop Doors
 * @arg target
 * @type string
 * @default crypt:1
 * @arg amount
 * @type number
 * @decimals 3
 * @min 0
 * @max 1
 * @default 1
 * @arg duration
 * @text Duration (seconds)
 * @type number
 * @decimals 3
 * @min 0
 * @default 0
 *
 * @command PropCommonEvent
 * @text Call Common Event for Props
 * @arg target
 * @type string
 * @default brazier:1
 * @arg commonEvent
 * @type common_event
 * @default 1
 *
 * @command PropContext
 * @text Read Current Prop ID
 * @arg variable
 * @type variable
 * @default 1
 *
 * @help
 * Enable this plugin in the Plugin Manager. It replaces the title scene and
 * provides the graveyard, six weapons, four passives, enemies and Reaper fight.
 * Requires @pixi/3d and rmmz-next. All content lives in the standard database.
 * Map note: <propScene:models/maps/graveyard.glb>.
 * Props use GLB nodes and extras.nightward; ordinary Props need no map events.
 * Logic event comments: <prop:brazier:1> <propOffset:0,0,0>.
 * Command targets accept a stable ID, #tag, or @context inside a Prop common event.
 * Stage common events begin with a comment such as <nightwardPhase:60>.
 * Use start, boss, bossDeath, or elapsed seconds. Add ,demo to include the title demo.
 *
 * Move: WASD / arrows / gamepad / drag. Weapons fire automatically.
 * Pause: Esc / P / Start. M: mute. F: fullscreen. 1–3: select an upgrade.
 * Records and options are saved separately from normal RPG Maker save files.
 */
import { installNightward } from '../nightward/install'

installNightward()
