/* eslint-disable style/spaced-comment */
/*:
 * @target MZ
 * @plugindesc HD-2D 3D diorama renderer for RPG Maker MZ powered by PixiJS 8 and @pixi/3d.
 * @author rmmz-next
 *
 * @command SetEventLight
 * @text Set Event Light
 * @desc Attach or override a dynamic 3D light on an event (0 = current event).
 *
 * @arg eventId
 * @text Event ID
 * @desc Target event ID (0 = this event).
 * @type number
 * @min 0
 * @default 0
 *
 * @arg preset
 * @text Preset
 * @desc Optional preset defaults (any field below overrides it).
 * @type select
 * @option None
 * @value
 * @option Torch (warm flickering shadow light)
 * @value torch
 * @option Campfire (wide flickering shadow light)
 * @value campfire
 * @option Lantern (soft warm swaying light)
 * @value lantern
 * @option Crystal (cool pulsing light)
 * @value crystal
 * @option Flashlight (directional spot light)
 * @value flashlight
 * @default
 *
 * @arg type
 * @text Light Type
 * @type select
 * @option Inherit / Point
 * @value
 * @option Point Light
 * @value point
 * @option Spot Light
 * @value spot
 * @default
 *
 * @arg color
 * @text Color (#RRGGBB)
 * @type string
 * @default
 *
 * @arg intensity
 * @text Intensity
 * @type string
 * @default
 *
 * @arg range
 * @text Range
 * @type string
 * @default
 *
 * @arg decay
 * @text Decay (Point)
 * @type string
 * @default
 *
 * @arg offsetX
 * @text Offset X
 * @type string
 * @default
 *
 * @arg offsetY
 * @text Offset Y (Height)
 * @type string
 * @default
 *
 * @arg offsetZ
 * @text Offset Z
 * @type string
 * @default
 *
 * @arg castShadow
 * @text Cast Shadow
 * @type select
 * @option Inherit
 * @value inherit
 * @option On
 * @value true
 * @option Off
 * @value false
 * @default inherit
 *
 * @arg spriteLight
 * @text Tint Characters
 * @type select
 * @option Inherit
 * @value inherit
 * @option On
 * @value true
 * @option Off
 * @value false
 * @default inherit
 *
 * @arg flicker
 * @text Flicker Strength (0-1)
 * @type string
 * @default
 *
 * @arg pulse
 * @text Pulse Strength (0-1)
 * @type string
 * @default
 *
 * @arg sway
 * @text Sway Amplitude
 * @type string
 * @default
 *
 * @arg coneAngle
 * @text Spot Cone Angle (deg)
 * @type string
 * @default
 *
 * @arg penumbra
 * @text Spot Penumbra (0-1)
 * @type string
 * @default
 *
 * @arg pitch
 * @text Spot Pitch (deg)
 * @type string
 * @default
 *
 * @arg followDir
 * @text Spot Follow Event Direction
 * @type select
 * @option Inherit
 * @value inherit
 * @option On
 * @value true
 * @option Off
 * @value false
 * @default inherit
 *
 * @command ClearEventLight
 * @text Clear / Turn Off Event Light
 * @desc Restore an event's note/page light or forcibly turn it off.
 *
 * @arg eventId
 * @text Event ID
 * @type number
 * @min 0
 * @default 0
 *
 * @arg turnOff
 * @text Force Turn Off
 * @desc When true, turns off all lights on this event instead of restoring note/page lights.
 * @type boolean
 * @default false
 *
 * @command SetPlayerLight
 * @text Set Player Light
 * @desc Attach a dynamic light (lantern, flashlight, etc.) to the player across maps.
 *
 * @arg preset
 * @text Preset
 * @type select
 * @option Lantern
 * @value lantern
 * @option Flashlight
 * @value flashlight
 * @option Torch
 * @value torch
 * @option Crystal
 * @value crystal
 * @option Custom
 * @value
 * @default lantern
 *
 * @arg type
 * @text Light Type
 * @type select
 * @option Inherit / Point
 * @value
 * @option Point Light
 * @value point
 * @option Spot Light
 * @value spot
 * @default
 *
 * @arg color
 * @text Color (#RRGGBB)
 * @type string
 * @default
 *
 * @arg intensity
 * @text Intensity
 * @type string
 * @default
 *
 * @arg range
 * @text Range
 * @type string
 * @default
 *
 * @arg castShadow
 * @text Cast Shadow
 * @type select
 * @option Inherit
 * @value inherit
 * @option On
 * @value true
 * @option Off
 * @value false
 * @default inherit
 *
 * @arg coneAngle
 * @text Spot Cone Angle (deg)
 * @type string
 * @default
 *
 * @arg pitch
 * @text Spot Pitch (deg)
 * @type string
 * @default
 *
 * @command ClearPlayerLight
 * @text Clear Player Light
 * @desc Remove the dynamic light attached to the player.
 *
 * @help
 * Native Tileset Integration:
 *   - Ground (A1-A5 + flat B-E + shadows) renders via RMMZ's native Tilemap
 *     with automatic paired "<tileset>-normal.png" normal maps and A1 water animation.
 *   - B-E tiles stand upright based on Terrain Tag + Tileset Note <hd2d-tile> rules
 *     (defaults: tag 1 = standing card with subtle yaw, tag 2 = straight card; A1-A5 stay flat).
 *   - Tileset Note: <hd2d-tile tag="1" mode="flat|stand|cylindrical|spherical" jitter="0.16" deg="0">
 *   - Map Note (per-tile override, editor layer 2-4 optional):
 *     <hd2d-tile x="9" y="5" layer="3" deg="-20" rot="-0.35" mode="stand|cylindrical|spherical" offset="0,0,0">
 *
 * Event Appearance Tag (<hd2d-sprite ...> in Note or active Page Comments):
 *   Supports both character sheets and tileset events (tileId > 0).
 *   Attributes (all optional):
 *     offset="x,y,z" (or x/y/z)   anchor="x,y"            rot="0.15"
 *     scale="1"                   pixelSize="0.015"       billboard="none|cylindrical|spherical"
 *     emissive="0.7"              emissiveColor="#ffc484" blend="true|false"
 *     shadow="true|false"         groundShadow="true|false"
 *     sway="0.05" swaySpeed="2"   swayPitch="0.075" swayPitchSpeed="3"
 *     breathe="true|false"        collider="auto|none|r|w,d"
 *
 * Event Light Tag (<hd2d-light ...> / <hd2d-no-light> in Note or Page Comments):
 *   Page comments override the Note, so switching event pages automatically
 *   turns lights on/off or swaps color/intensity.
 *   Attributes (all optional):
 *     preset="torch|campfire|lantern|crystal|flashlight"
 *     type="point|spot"          color="#ffbb4c"
 *     intensity="10"             range="3.5"           decay="0.25"
 *     offset="0,0.85,0.15"       (or x/y/z)
 *     shadow="true|false"        shadowBias="0.00015"  spriteLight="true|false"
 *     flicker="0.15"             flickerSpeed="1"      flickerJitter="0.002"
 *     pulse="0.25"               pulseSpeed="2.4"
 *     sway="0.03"                swaySpeed="2"
 *     angle="32" penumbra="0.4"  pitch="-26" yaw="0"   followDir="true|false"
 */
/*:zh
 * @target MZ
 * @plugindesc 基于 PixiJS 8 与 @pixi/3d 的 RPG Maker MZ HD-2D 3D 场景渲染插件。
 * @author rmmz-next
 *
 * @command SetEventLight
 * @text 设置事件光源
 * @desc 为指定事件附加或覆盖动态 3D 光源（事件 ID 为 0 表示当前事件）。
 *
 * @arg eventId
 * @text 事件 ID
 * @desc 目标事件 ID（0 表示本事件）。
 * @type number
 * @min 0
 * @default 0
 *
 * @arg preset
 * @text 光源预设
 * @desc 可选预设模板（下方填写的任意参数都会覆盖预设值）。
 * @type select
 * @option 无
 * @value
 * @option 火把（暖色闪烁投影点光源）
 * @value torch
 * @option 篝火（大范围暖色闪烁投影光源）
 * @value campfire
 * @option 灯笼（柔和暖色摇曳光源）
 * @value lantern
 * @option 水晶（冷色呼吸脉冲光源）
 * @value crystal
 * @option 手电筒（朝向聚光灯）
 * @value flashlight
 * @default
 *
 * @arg type
 * @text 光源类型
 * @type select
 * @option 继承 / 点光源
 * @value
 * @option 点光源 (Point)
 * @value point
 * @option 聚光灯 (Spot)
 * @value spot
 * @default
 *
 * @arg color
 * @text 颜色 (#RRGGBB)
 * @type string
 * @default
 *
 * @arg intensity
 * @text 光照强度
 * @type string
 * @default
 *
 * @arg range
 * @text 照射范围
 * @type string
 * @default
 *
 * @arg decay
 * @text 衰减指数（点光源）
 * @type string
 * @default
 *
 * @arg offsetX
 * @text 偏移 X
 * @type string
 * @default
 *
 * @arg offsetY
 * @text 偏移 Y（高度）
 * @type string
 * @default
 *
 * @arg offsetZ
 * @text 偏移 Z
 * @type string
 * @default
 *
 * @arg castShadow
 * @text 投射阴影
 * @type select
 * @option 继承
 * @value inherit
 * @option 开启
 * @value true
 * @option 关闭
 * @value false
 * @default inherit
 *
 * @arg spriteLight
 * @text 照亮角色精灵
 * @type select
 * @option 继承
 * @value inherit
 * @option 开启
 * @value true
 * @option 关闭
 * @value false
 * @default inherit
 *
 * @arg flicker
 * @text 闪烁幅度 (0-1)
 * @type string
 * @default
 *
 * @arg pulse
 * @text 呼吸脉冲幅度 (0-1)
 * @type string
 * @default
 *
 * @arg sway
 * @text 摇晃幅度
 * @type string
 * @default
 *
 * @arg coneAngle
 * @text 聚光灯张角（度）
 * @type string
 * @default
 *
 * @arg penumbra
 * @text 聚光灯柔和边缘 (0-1)
 * @type string
 * @default
 *
 * @arg pitch
 * @text 聚光灯俯仰角（度）
 * @type string
 * @default
 *
 * @arg followDir
 * @text 聚光灯跟随事件朝向
 * @type select
 * @option 继承
 * @value inherit
 * @option 开启
 * @value true
 * @option 关闭
 * @value false
 * @default inherit
 *
 * @command ClearEventLight
 * @text 清除 / 关闭事件光源
 * @desc 恢复事件备注/页注释中的默认光源，或强制熄灭。
 *
 * @arg eventId
 * @text 事件 ID
 * @type number
 * @min 0
 * @default 0
 *
 * @arg turnOff
 * @text 强制熄灭
 * @desc 开启后会熄灭该事件所有光源；关闭则恢复为备注或事件页注释配置的光源。
 * @type boolean
 * @default false
 *
 * @command SetPlayerLight
 * @text 设置主角随身光源
 * @desc 为主角附加跨地图保留的动态光源（如提灯、手电筒等）。
 *
 * @arg preset
 * @text 光源预设
 * @type select
 * @option 提灯 (Lantern)
 * @value lantern
 * @option 手电筒 (Flashlight)
 * @value flashlight
 * @option 火把 (Torch)
 * @value torch
 * @option 水晶 (Crystal)
 * @value crystal
 * @option 自定义
 * @value
 * @default lantern
 *
 * @arg type
 * @text 光源类型
 * @type select
 * @option 继承 / 点光源
 * @value
 * @option 点光源 (Point)
 * @value point
 * @option 聚光灯 (Spot)
 * @value spot
 * @default
 *
 * @arg color
 * @text 颜色 (#RRGGBB)
 * @type string
 * @default
 *
 * @arg intensity
 * @text 光照强度
 * @type string
 * @default
 *
 * @arg range
 * @text 照射范围
 * @type string
 * @default
 *
 * @arg castShadow
 * @text 投射阴影
 * @type select
 * @option 继承
 * @value inherit
 * @option 开启
 * @value true
 * @option 关闭
 * @value false
 * @default inherit
 *
 * @arg coneAngle
 * @text 聚光灯张角（度）
 * @type string
 * @default
 *
 * @arg pitch
 * @text 聚光灯俯仰角（度）
 * @type string
 * @default
 *
 * @command ClearPlayerLight
 * @text 清除主角随身光源
 * @desc 移除附加在主角身上的动态光源。
 *
 * @help
 * 【原生图块集成】
 * - 地面（A1-A5 与平坦 B-E 图块）：直接通过 RMMZ 原生 Tilemap 渲染，自动加载
 *   同名 "<图块名>-normal.png" 法线贴图，并支持 A1 动态水面动画。
 * - 立体景物（仅作用于 B-E 图块，A1-A5 始终平贴地面）：
 *   默认地形标志 1 为带轻微随机偏转的竖立卡片，地形标志 2 为笔直竖立卡片；
 *   可在「图块集备注」用 <hd2d-tile> 自定义任意地形标志（1~7）的行为：
 *     <hd2d-tile tag="1" mode="stand" jitter="0.16">
 *     <hd2d-tile tag="3" mode="cylindrical">  （始终朝向相机的圆柱 Billboard）
 *     <hd2d-tile tag="4" mode="spherical">    （全轴朝向相机的球型 Billboard）
 *     <hd2d-tile tag="1" mode="flat">         （强制贴地平铺，覆盖默认行为）
 * - 地图单格覆写（写在「地图备注」中，可精确设置 Y 轴偏转或模式）：
 *     <hd2d-tile x="9" y="5" deg="-20">                  （匹配该格所有立牌层）
 *     <hd2d-tile x="9" y="5" layer="3" rot="-0.35" mode="stand" offset="0,0,0">
 *     （layer 对应 RMMZ 编辑器图层 2~4，也可用 z="1~3"；多格合并立牌填其中任意一格即可命中）
 *
 * 【事件外观标签 <hd2d-sprite ...>】
 * 可写在事件「备注」或当前事件页「注释」中（页注释优先，翻页自动切换），
 * 同时支持行走图事件与图块事件（tileId > 0）。常用属性（均可选）：
 *   offset="x,y,z"          位置偏移（也可用 x/y/z 单独指定）
 *   anchor="x,y"            锚点（默认 0.5,1 贴地；挂件可用 0.5,0）
 *   rot="0.15"              Y 轴旋转（弧度）
 *   scale="1"               整体缩放倍率
 *   pixelSize="0.015"       覆盖单像素世界尺寸
 *   emissive="0.7"          自发光强度（>0 触发泛光）
 *   emissiveColor="#ffc484" 自发光染色
 *   shadow="true|false"     是否投射剪影阴影（自发光体默认关闭）
 *   groundShadow="true|false" 是否显示脚底接触圆影
 *   sway="0.05" swaySpeed="2" 挂件左右摇晃幅度与频率
 *   swayPitch="0.075" swayPitchSpeed="3" 前后摇晃幅度与频率
 *   breathe="true|false"    是否启用呼吸微动
 *   billboard="none|cylindrical|spherical" 朝向相机模式
 *   collider="auto|none|r|w,d" 碰撞盒模式（默认按精灵底部像素自动推导，高空悬空自动穿透）
 *
 * 【事件光源标签 <hd2d-light ...> / <hd2d-no-light>】
 * 可写在事件「备注」或当前事件页「注释」中，同一事件支持叠加多个光源；
 * 切页时自动开关灯或切换颜色强度，写 <hd2d-no-light> 可在当前页熄灭备注光源。
 * 常用属性（均可选）：
 *   preset="torch|campfire|lantern|crystal|flashlight"
 *   type="point|spot"       color="#ffbb4c"
 *   intensity="10"          range="3.5"            decay="0.25"
 *   offset="0,0.85,0.15"    (或 x/y/z)
 *   shadow="true|false"     shadowBias="0.00015"   spriteLight="true|false"
 *   flicker="0.15"          flickerSpeed="1"       flickerJitter="0.002"
 *   pulse="0.25"            pulseSpeed="2.4"
 *   sway="0.03"             swaySpeed="2"
 *   angle="32" penumbra="0.4" pitch="-26" yaw="0"  followDir="true|false"
 *
 * 示例：
 *   <hd2d-light preset="torch" offset="0.18,0.97,0.09">
 *   <hd2d-light type="spot" color="#fff0cc" intensity="15" range="6" angle="28" followDir="true" shadow="true">
 *
 * 如需实时调试后期特效、雾、粒子、自由相机或碰撞箱，请在插件管理器中本插件
 * 下方启用独立的 Hd2dDebug.js 插件。
 */
import { installHd2d } from '../hd2d/install'

installHd2d()
