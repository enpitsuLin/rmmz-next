/*:
 * @target MZ
 * @plugindesc Nightward — a complete 3D survivor mode powered by RMMZ data.
 * @author rmmz-next
 *
 * @param weaponSlots
 * @text Weapon Slots
 * @desc Number of weapon equipment slots for the Nightward class.
 * @type number
 * @min 1
 * @max 6
 * @default 6
 *
 * @param upgradeChoices
 * @text Upgrade Choices
 * @desc Number of upgrade cards offered on level up.
 * @type number
 * @min 1
 * @max 6
 * @default 3
 *
 * @param maxLevelGold
 * @text Max Build Level Gold
 * @desc Gold granted per level when every weapon and passive is maxed.
 * @type number
 * @min 0
 * @default 25
 *
 * @param chestGold
 * @text Max Build Chest Gold
 * @desc Gold granted by a treasure chest when every weapon and passive is maxed.
 * @type number
 * @min 0
 * @default 100
 *
 * @param killsIcon
 * @text Kills Icon
 * @desc IconSet index for the kill counter.
 * @type icon
 * @default 114
 *
 * @param heartIcon
 * @text Heart Icon
 * @desc IconSet index for heal callouts.
 * @type icon
 * @default 115
 *
 * @param clockIcon
 * @text Clock Icon
 * @desc IconSet index for run timers in pause, help, and results.
 * @type icon
 * @default 116
 *
 * @param enemyCap
 * @text Enemy Cap
 * @desc Maximum number of active enemies on the map.
 * @type number
 * @min 1
 * @default 900
 *
 * @param eliteHpRate
 * @text Elite HP Multiplier
 * @type number
 * @decimals 2
 * @min 1
 * @default 4
 *
 * @param eliteAtkRate
 * @text Elite ATK Multiplier
 * @type number
 * @decimals 2
 * @min 1
 * @default 2
 *
 * @param eliteScale
 * @text Elite Size Multiplier
 * @type number
 * @decimals 2
 * @min 1
 * @default 1.6
 *
 * @param brazierRelicChance
 * @text Brazier Relic Chance
 * @desc Probability (0-1) that a broken brazier drops a Relic after Brazier Relic Time.
 * @type number
 * @decimals 2
 * @min 0
 * @max 1
 * @default 0.04
 *
 * @param brazierRelicTime
 * @text Brazier Relic Time (s)
 * @desc Earliest run time in seconds before broken braziers can drop a Relic.
 * @type number
 * @min 0
 * @default 60
 *
 * @param brazierVacuumChance
 * @text Brazier Vacuum Chance
 * @desc Probability (0-1) that a broken brazier drops a Vacuum.
 * @type number
 * @decimals 2
 * @min 0
 * @max 1
 * @default 0.10
 *
 * @param brazierChickenChance
 * @text Brazier Chicken Chance
 * @desc Probability (0-1) that a broken brazier drops a Roast Chicken.
 * @type number
 * @decimals 2
 * @min 0
 * @max 1
 * @default 0.26
 *
 * @param lashSe
 * @text Lash SE
 * @type file
 * @dir audio/se
 * @default Lash
 *
 * @param wandSe
 * @text Wand SE
 * @type file
 * @dir audio/se
 * @default Wand
 *
 * @param tomesSe
 * @text Tomes SE
 * @type file
 * @dir audio/se
 * @default Tomes
 *
 * @param lightningSe
 * @text Lightning SE
 * @type file
 * @dir audio/se
 * @default Lightning
 *
 * @param wardSe
 * @text Ward SE
 * @type file
 * @dir audio/se
 * @default Ward
 *
 * @param flaskSe
 * @text Flask SE
 * @type file
 * @dir audio/se
 * @default Flask
 *
 * @param relicSe
 * @text Relic Blast SE
 * @type file
 * @dir audio/se
 * @default Relic
 *
 * @param levelSe
 * @text Level Up SE
 * @type file
 * @dir audio/se
 * @default Level
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
 * @command PickupVacuum
 * @text Pull All Gems
 * @desc Attract every experience gem on the map toward the player.
 *
 * @command PickupRelic
 * @text Purge Nearby Enemies
 * @desc Trigger a relic blast that purges enemies within radius after delay.
 * @arg radius
 * @text Radius (tiles)
 * @type number
 * @decimals 2
 * @min 1
 * @default 26
 * @arg delay
 * @text Delay (seconds)
 * @type number
 * @decimals 2
 * @min 0
 * @default 0.4
 *
 * @command PickupChest
 * @text Open Treasure Chest
 * @desc Grant 1-3 equipment upgrades (or bonus gold if maxed) and display the chest overlay.
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
 * Spawn event comments: <nightwardSpawn:reaper> <spawnOffset:0,-0.5>.
 * Command targets accept a stable ID, #tag, or @context inside a Prop common event.
 * Stage common events begin with a comment such as <nightwardPhase:60>.
 * Use start, boss, bossDeath, victory, or elapsed seconds. Add ,demo to include the title demo.
 *
 * Move: WASD / arrows / gamepad / drag. Weapons fire automatically.
 * Pause: Esc / P / Start. M: mute. F: fullscreen. 1–3: select an upgrade.
 * Records and options are saved separately from normal RPG Maker save files.
 */
import { installNightward } from '../nightward/install'

installNightward()
