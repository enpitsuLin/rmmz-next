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
/*:zh
 * @target MZ
 * @plugindesc 独立的 8 方向自由像素移动插件，兼容标准 RMMZ 地图通行度、事件触发与队友跟随。
 * @author rmmz-next
 *
 * @param colliderRadius
 * @text 玩家碰撞半径
 * @desc 玩家脚底圆形碰撞体的半径（单位：地图格）。
 * @type number
 * @decimals 2
 * @min 0.10
 * @max 0.48
 * @default 0.28
 *
 * @param speedScale
 * @text 移动速度倍率
 * @desc 在 RMMZ 原生移动速度基础上叠加的倍率。
 * @type number
 * @decimals 2
 * @min 0.25
 * @max 3.00
 * @default 1.00
 *
 * @param cornerSlide
 * @text 拐角滑行距离
 * @desc 擦碰不可通行图块边角时自动向侧边微调绕过的最大距离（单位：地图格）。
 * @type number
 * @decimals 2
 * @min 0.00
 * @max 0.50
 * @default 0.35
 *
 * @param interactRange
 * @text 交互距离
 * @desc 按下确认键向前探测可交互事件的距离（单位：地图格）。
 * @type number
 * @decimals 2
 * @min 0.40
 * @max 1.50
 * @default 0.78
 *
 * @param followSpacing
 * @text 队友跟随间距
 * @desc 队伍跟随成员沿路径排列的间隔距离（单位：地图格）。
 * @type number
 * @decimals 2
 * @min 0.30
 * @max 1.50
 * @default 0.75
 *
 * @param enableWasd
 * @text 启用 WASD 移动
 * @desc 开启后除方向键外，也可使用 W / A / S / D 控制角色移动。
 * @type boolean
 * @default true
 *
 * @help
 * 提供平滑的 8 方向（斜向速度已归一化）像素级自由移动，并与标准
 * RPG Maker MZ 的图块通行度、事件触发、移动路线、点击寻路和队友跟随兼容。
 *
 * - 支持事件自定义矩形碰撞盒（配合 Hd2d 插件时自动按精灵尺寸与偏移推导）。
 * - 在插件管理器中禁用本插件即可立即恢复原生网格移动。
 */
import { installPixelMovement } from '../pixel-movement/install'

installPixelMovement()
