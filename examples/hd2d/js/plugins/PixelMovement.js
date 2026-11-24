/* eslint-disable style/spaced-comment */
/*:
 * @target MZ
 * @plugindesc Independent 8-directional free pixel movement compatible with standard RMMZ maps, events, and followers.
 * @author rmmz-next
 *
 * @param colliderRadius
 * @text Collider Radius
 * @desc Half-size of the player's foot collider in tiles.
 * @type number
 * @decimals 2
 * @min 0.10
 * @max 0.48
 * @default 0.28
 *
 * @param speedScale
 * @text Speed Scale
 * @desc Multiplier applied to the player's movement speed.
 * @type number
 * @decimals 2
 * @min 0.25
 * @max 3.00
 * @default 1.00
 *
 * @param cornerSlide
 * @text Corner Slide Distance
 * @desc Maximum perpendicular nudge (in tiles) when brushing a tile corner.
 * @type number
 * @decimals 2
 * @min 0.00
 * @max 0.50
 * @default 0.35
 *
 * @param interactRange
 * @text Interact Range
 * @desc Forward reach (in tiles) when pressing the action button.
 * @type number
 * @decimals 2
 * @min 0.40
 * @max 1.50
 * @default 0.78
 *
 * @param followSpacing
 * @text Follower Spacing
 * @desc Trail distance (in tiles) between consecutive party followers.
 * @type number
 * @decimals 2
 * @min 0.30
 * @max 1.50
 * @default 0.75
 *
 * @param enableWasd
 * @text Enable WASD Movement
 * @desc Map W/A/S/D keys to directional movement alongside arrow keys.
 * @type boolean
 * @default true
 *
 * @help
 * Enables smooth 8-directional pixel movement while staying compatible with
 * standard RPG Maker MZ tile passability, event triggers, move routes,
 * touch-to-move, and party followers.
 *
 * Disable this plugin in the Plugin Manager to return to grid movement.
 */
import { installPixelMovement } from '../pixel-movement/install'

installPixelMovement()
