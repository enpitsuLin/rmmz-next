/* eslint-disable style/spaced-comment */
/*:
 * @target MZ
 * @plugindesc Standalone debug UI (lil-gui) and 3D collider overlay for the Hd2d plugin.
 * @author rmmz-next
 *
 * @param openByDefault
 * @text Expand Panel On Start
 * @desc Expand the debug panel by default when entering a map.
 * @type boolean
 * @default true
 *
 * @param showColliders
 * @text Show Colliders On Start
 * @desc Show the 3D tile/event/player collider overlay by default.
 * @type boolean
 * @default false
 *
 * @help
 * Place this plugin AFTER Hd2d in the Plugin Manager.
 * Disable it in production builds to completely strip the debug UI and lil-gui.
 *
 * Features:
 *   - Live tuning for post-processing (Bloom, Vignette, Tone Mapping, Tilt Shift),
 *     fog, dust particles, and follow camera parameters.
 *   - Free Orbit Camera toggle: left-drag rotate, right/middle-drag pan, wheel zoom.
 *   - 3D Collider Overlay: green = player, red = blocked tiles,
 *     cyan = solid events, magenta = elevated/through interactable events.
 */
/*:zh
 * @target MZ
 * @plugindesc Hd2d 独立调试面板（lil-gui）、自由轨道相机与 3D 碰撞箱可视化插件。
 * @author rmmz-next
 *
 * @param openByDefault
 * @text 启动时展开面板
 * @desc 进入地图时默认展开右上角 HD-2D 调试面板。
 * @type boolean
 * @default true
 *
 * @param showColliders
 * @text 启动时显示碰撞箱
 * @desc 进入地图时默认开启 3D 碰撞箱叠加显示。
 * @type boolean
 * @default false
 *
 * @help
 * 请在插件管理器中将本插件放在 Hd2d 之后。
 * 正式发布游戏时直接关闭本插件即可彻底移除调试面板与 lil-gui 依赖。
 *
 * 功能说明：
 * 1. 实时调节：泛光、色调映射、移轴景深、暗角、亮度对比度、雾、浮尘粒子与相机参数。
 * 2. 自由旋转平移（相机分组）：
 *    - 开启后左键拖拽旋转视角（按住 Shift/Ctrl/Cmd 拖拽切换为平移）
 *    - 右键 / 中键拖拽平移视角，滚轮缩放
 *    - 键盘仍可正常移动主角，关闭开关或点「重置自由视角」立即恢复跟随镜头
 * 3. 3D 碰撞箱显示（碰撞箱分组）：
 *    - 绿色圆环：玩家脚底碰撞圆
 *    - 红色方框：不可通行图块
 *    - 青色方框/圆环：实体阻挡事件
 *    - 紫红色方框/圆环：高空悬空或可穿透事件（仅可交互，不挡路）
 */
import { installHd2dDebug } from '../hd2d-debug/install'

installHd2dDebug()
