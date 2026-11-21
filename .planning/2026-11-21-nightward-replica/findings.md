# 调研与决策

## 需求
- 完整复刻：标题自动演示、六武器五阶、四被动五阶、五种普通敌人及精英、死神、地图障碍与补给、升级、暂停设置、纪录与结算。
- 采用 Scene_Base 的专用标题，保留 RMMZ 数据与游戏对象。
- 用户自行测试；不新增测试框架和测试脚本。

## 工程依据
- PixiJS 8.23.0，已重新安装 @pixi/3d 0.1.0。
- 数据库除死亡状态外基本为空，地图 17×13，无角色图和音频。
- 启用插件在 Graphics 初始化之前求值，可以注册 3D 后端。
- Game_Action 需要队伍处于战斗状态；暂停覆盖层不能切出当前场景。
- 原作公开脚本已留存于 /private/tmp/nightward-game-readable.js，仅用于研究行为和数值，不复制完整发布程序。

## 资源策略
- 为本工程制作可复现的程序生成像素角色、地表和物件，写入标准 MZ 素材目录。
- 全部玩法参数落入 RMMZ 数据或备注扩展，不另建重复数据库。

## 问题记录
- 初始规划目录尚不存在，已用技能初始化器创建命名计划。

## 最终实现
- 插件入口：example/nightward/js/plugins/Nightward.js；实现位于 js/nightward/。
- 30 个武器阶级、20 个被动阶级、6 类敌人、8 类拾取物、4 个敌群模板和 181×181 地图均由脚本生成。
- 敌群模板存放于战斗事件注释，避免使用编辑器不支持的 Troop.note 字段。
- 宝箱已有条目全满时回退到新条目；十类全满时才兑换金币。
- 火盆的圣物概率 4%，仅在 60 秒后出现；吸取 10%，烤鸡 26%，其余金币。
- 渲染资源按场景归属释放；独立敌人材质死亡后释放，ImageManager 纹理缓存保留。
- 用户明确取消自动化验证，因此未运行测试、类型检查、lint、构建验证或浏览器/NW.js 试玩。

## 用户反馈后的资产纠正
- 用户指出资产与原版不符；上一版原创替代素材策略已撤销，不能把相似玩法视为完整复刻。
- 官方说明明确 Nightward 的美术与音乐均由代码生成；从公开发布脚本提取资产生成函数及依赖，编译为本地标准资源。
- 已生成并接入 22 套动画、albedo/normal/glow、11 类表面、13 个世界几何、原版 UI/字形/图标、月亮、两份乐谱和全部使用的音效。
- 原版世界碰撞与火盆位置同步到 MZ 地图事件；相机 FOV32、距离24、俯角42及光照、雾、泛光、景深参数已接入。
- 移除旧的简化图像、Press Start 2P 和自制音乐生成逻辑。数据生成脚本只重建 RMMZ 数据。
- 原版 UI 与音频离线烘焙使用独立 Chrome；这是资源制作，未运行游戏、自动化验证或构建。

## 启动 Failed to fetch 的根因
- Vite 7.3.1 内置 sirv 的 toHeaders 对 .gz 文件直接设置 Content-Encoding: gzip，浏览器/XHR 会先做传输层解压。
- Nightward 的资源加载器随后又调用 DecompressionStream('gzip')，对已解压数据再次解压，流读取失败。
- 将生成物和加载路径统一为 world.bin，内部仍为 gzip 数据；通过普通二进制文件名明确由应用层解压。
- 未更改引擎、添加依赖或执行自动化验证。

## 左右朝向修复
- 原版 _writeHero 与敌人显示通过负 UV 宽度实现水平镜像。
- @pixi/3d 的 cylindrical billboard 通过 length(modelMatrix[0].xyz) 获取宽度，负 scale.x 不会改变可见朝向。
- 使用缓存的 groupD8.MIRROR_HORIZONTAL 纹理帧实现主角/敌人镜像；原图、法线与自发光共享同一 UV 变换，提灯随主角左右切换。
- 修正资产生成器与现有 MZ 角色图：第二行为向左镜像，第三行为向右原帧。
- 未运行自动化验证或试玩；未提交。

## 原版 UI 继续还原
- 纠正此前“完整界面/完整交付”的完成表述：原版素材已接入，但布局、动画、转场此前仍为简化版。
- 原版物理像素 unit=max(2,round(min(width,height)/290))，iconUnit=max(2,round(unit*.7))；1100×760时为3和2。
- 原版标题 Ho 使用独立双倍字号字形（已在PNG内，尚未导出metadata），逐字下落0.45s、stagger0.05，菜单0.85s起逐项入场，1.1s聚焦，2s开始扫光。
- HUD XP带边框和内嵌等级，装备按获得次序入槽，角色受伤后显示跟随世界投影的22×5血条，Boss条带掉血残影/闪白和离屏方向提示。
- 升级默认236×40竖排，HUD下面高度不足才改三列58高卡片；0.12s开始stagger0.07，0.45s解锁选择，选中图标0.45s飞入装备槽。宝箱0.6s后翻牌，1.6s后自动收起。
- 结算横屏左右180宽RUN/BUILD与DAMAGE面板，伤害条相对最大武器归一；统计滚数、新纪录印章、逐槽弹入，失败和胜利时序相差1.5s。
- 重开/返回标题使用8×unit方块，从左上向右下按对角线错峰长大/缩小，cover0.4s、uncover0.4/0.45s；首次PLAY使用按钮闪白和标题退出，接镜头/黑边1s过渡。
- PixiJS官方文档建议显式hitArea和static事件模式；销毁children时保留共享TextureSource。

### UI 生命周期衔接
- 选择时先保留装备槽旧等级，图标落入后显示新等级；结算使用结束前构筑快照，避免 RMMZ onBattleEnd 清状态后被动槽消失。
- 结算保存完成只更新纪录文字和操作可用状态，避免重复创建界面而重播动画。
- 标题、重开、返回标题在同一专用场景内重建 RunSession/View，不通过销毁场景打断擦屏；停止旧 UI 后保留 ImageManager 共享纹理。
- 双倍字号元数据直接取原版 Y.bigGlyphs，softRect/glow/vignette 来自原版 UI 图集；不拉伸小字形替代大字形。

### 高分屏与输入补充
- 官方启动代码把 UI 布局密度上限设为1.5，布局器使用该密度计算物理像素单位。此前“1100×760单位3”的结论仅适用于DPR1；高分屏须先按密度换算，再映射到RMMZ游戏坐标。
- 本次按原版密度计算UI，不修改引擎或提高三维渲染分辨率。
- RMMZ手柄B映射为cancel；菜单通过cancel读取返回，Esc仍由RMMZ别名支持。消费菜单触发边沿时保留移动键按住状态，避免选升级后移动中断。

## 原生窗体迁移
- 本仓库 Window 是 Pixi 8 显示对象，Windowskin 默认使用192×192协议；Window_Selectable 已包含键盘、手柄、悬停、触摸确认和取消处理。
- 原版面板边角为5像素，默认Window边角为24像素；在 Nightward 的Window子类中使用相同skin分区与5像素边角，保留原版外观，不改引擎。
- 使用Window承载面板，Window_Selectable承载选项和原版任意布局；屏幕的动画容器及逐字字形/光晕/飞行图标仍为Pixi。
- Window.png属于已有程序生成UI的引擎图集，沿用Canvas资产制作管线打包同源像素，不引入新绘制风格或AI生成贴图。
- 官方RMMZ文档支持自定义windowskin、padding、cursorRect和窗口子类；实际API以本仓库源码为准。

### 原生窗体实现决策
- NightwardWindow 读取 Window.png 的普通96×96边框和选中48×48皮肤，以5像素边角调用引擎 _setRectPartsGeometry；背景使用同一皮肤的填充区域，避免混入原生箭头。
- NightwardSelectable 复用原生 processCursorMove/processHandling/processTouch、索引与handlers；只适配原版不规则itemRect、按行/列移动和卡片循环选择。旧UiScreen键盘分发与按钮/卡片的Pixi激活监听已移除。
- 逐字字形和动效内容挂在选择窗口客户端；客户端不裁切单项的溢出光晕，保留原版透明叠加。外层屏幕容器继续编排入场/退场。
- --windowskin-only 已实际成功执行，只制作Window.png，不重烘焙其他资源，也不启动游戏。

## 火盆破坏光效
- 官方发布脚本 rU._updateBraziers 使用 exp(-age*7) 生成瞬间闪光；两层光晕分别位于 y=.95 和 y=.15、z+.3，颜色为 0xff3a10。
- 上层尺寸为 1.1+flash*3、透明度 min(1,.32*flicker+flash*.8)，下层尺寸为 .9、透明度 .22*flicker；flicker=.75+.25*sin(time*1.7+index*2.3)，余辉持续保留。
- 破坏后的点光源位置 y=.9、范围4、强度4*flicker+flash*60；flash>.2时保持火焰色，其后变为余烬色。
- 使用已安装 @pixi/3d 的 ParticleContainer3D.setParticleAt/upload，每个火盆两个加法混合球形公告板，同一批次上传，不新增贴图、依赖或点光源。
- 现有世界视图时钟在暂停、升级、宝箱时传入dt=0，光效沿用该时钟；场景重建时重置破坏时间，粒子批次随View3D子节点销毁。


## 六武器原版绘制与时序
- 原版六武器的纯战斗呈现集中在PD及其依赖；额外spectacle模块处理升级、宝箱、圣物和Boss，不属于六武器基础绘制。
- 原版使用独立的1024×512战斗特效图集yI，不能用世界光晕或UI圆环代替。已离线提取绘制模块、粒子GL/WGSL着色器、14个战斗光源预算、镜头Lens状态与后处理。
- 共享reference-source.mjs按TypeScript符号依赖提取；生成模块仅将Container3D、ParticleContainer3D、PointLight、PostEffect与Pixi纹理/UniformGroup绑定现有依赖，不包含原版游戏模拟器或引擎实现。
- 原版Cinder为1-.08*rank冷却乘数，Haste为1+.1*rank移速乘数。法典仅休眠时间受冷却缩放，完全退场后停转；连发间隔、鞭子反击与火池结算间隔不缩放。
- 原版武器顺序为鞭子、魔杖、法典、落雷、法阵、药瓶，之后先结算旧火池再更新飞行物。药瓶落地后下一模拟步开始火池结算，火池容量32。
- GI._remember以Float32开始时间匹配缓存，适配层将start/end转为Math.fround，避免同一火池被当成新火池重复登记。
- 首帧即命中的魔杖飞弹仍要提供发射快照，否则原版枪口闪光无法从已移除的弹体读取速度与位置。
- 命中/死亡事件带目标、世界高度与武器类型；命中特效阈值使用RMMZ动作的hpDamage结果，不使用敌人HP夹到0之后的差值。


## 地图事件驱动Prop
- Game_Event生效页由_pageIndex决定，原生erase会refresh到无效页。108/408注释可直接解析，不需要执行解释器或从事件备注中反查固定坐标。
- Game_Map.update(true)已经统一更新地图主解释器、原生事件、并行事件和公共事件；RunSession改持有地图解释器，移除独立消费预留公共事件的代码。
- 原版x9生成器可在不改变随机调用与绘制参数的情况下捕获A9/R9/jc/wa等调用，按局部几何拆出火盆、墓碑、院内树木、围栏、纪念碑和建筑；地面、道路与边界树林保留静态。
- 原版No每支蜡烛都有独立火焰位置，同时每组另有candleSite点光源，拆分时须同时保留，不能用组灯替代各支烛火。
- 原版模型共1063个摆放物件。MZ编辑器事件上限依据：https://www.tyruswoo.com/rpg-maker/mz/event-generator-mz/event-generator-plugin-v1-0-for-rpg-maker-mz/ 。外圈墓碑按原版远景分区组成预设，保留单体资源；最终1135个预设、819个默认事件，最高事件ID999。
- 组合模型使用共享几何描述符加局部offset，不复制二进制几何。运行时按材质合批，通过dynamic Geometry3D的位置缓冲更新移动对象，不为每个墓碑建立独立绘制调用。
- 正常生成保留已有Map001/MapInfos。一次性迁移保留原有可匹配事件的ID、坐标和页面；仅移除完全未改动的重复自动碰撞标记，组合与ID整理仅处理未改动的自动生成事件。
- Prop位置由事件_realX/_realY及注释偏移派生；生命、破坏状态和破坏时间放在Game_Event._nightwardProp。碰撞索引、门、火焰、点光、余辉和烛光同步使用派生位置。
- 原版战斗模块的火盆爆裂原先读取静态Bt坐标，已改为读取破坏事件的实际X/Y/Z，保留既有六武器效果和节奏。


## Effekseer 迁移（2026-11-21）

1. 复用 RMMZ 内置 1.70 WebGL/WASM、Graphics.effekseer 和 EffectManager，同一画布与深度附件。Nightward 配置 65,536 个实例和 32,768 个四边形。
2. 原版纯呈现层继续输出轨迹、时序、确定性随机和四顶点参数；新 EffekseerParticles 保留 packed API，把 Pyro 的阻力/重力、热量、生长和拉丝公式转为 CPU 计算，交给 Effekseer 绘制。任意光束用两个三角形，保留端点渐变和深度前拉。原版容器 -3000/-2000/-1000 的 Y 位置只用于排序，不能加到世界顶点。
3. 官方 Effekseer 1.70e 的 EffekseerCore.dll 导出 55 份 efkefc 和 5 份材质；不更换已有运行时。原版三个图集制作预乘 Alpha 副本，并在材质采样时反预乘，保留 Pixi 的边缘过滤。
4. 原版 14 个战斗点光源、Prop 点光源、天空闪电、镜头与后处理继续在 Pixi3D。局部 GL 桥只传入曝光、裁剪与现有线性雾参数，绘制后恢复。
5. 火盆火焰、破坏爆光与两层余辉迁移；火焰宽高、锚点、四帧 10 FPS、闪光衰减和闪烁保持原参数，继续跟随 Game_Event。未改变地图布局或玩法数据。
6. Animations 数据无 effectName 引用，删除根 effects 目录 120 个旧 RTP efkefc，保留运行时与新 Nightward 资源。


## Effekseer 性能与地图诊断

1. 用户明确授权 pnpm run dev 和 DevTools 实测，覆盖此前本轮不运行游戏的限制。使用临时 NW.js 调试启动器和本机 CDP 9222；没有引入测试框架或修改依赖。
2. 旧实现约 8.7 FPS：六秒内 47,815 次 updateHandle，耗时约 4.4 秒。官方 Manager::UpdateInstancesByInstanceGlobal 会扫描全部实例块，逐粒子调用造成重复扫描；隐藏实例持续存活又放大这一开销。
3. 两个 Pass 共享每个 RenderSession 的 prepare，统一提交本帧位置与参数后只调用一次 context.update；Nightward 场景跳过模拟前的默认更新，其他场景不变。实例 speed=0，原版轨迹和 RMMZ 时钟不变。消失即 stop，复用仍存活槽，缓存颜色与动态参数，消除光束临时数组。
4. 地图不是资源丢失：819 个事件、11 份静态几何均在。DevTools 纯色材质及剔除隔离确认 culled mode=1032（FRONT_AND_BACK）；Pixi resetState 不恢复 cullFace 模式。绘制后显式 gl.cullFace(BACK)，并恢复当前目标的绕序，地图重新显示；最终使用原始单面 PBR 材质，未保留临时诊断修改。
5. 最后八秒采样 468 帧 / 468 次批量更新 / 0 次 updateHandle，约 58.4 FPS，P95 16.7 ms，P99 33.3 ms；实例 2,912–4,992。此段含升级选择，六武器等级 3/2/2/2/5/2，不能冒充满级持续战斗测量。无运行异常。实际指标保存在 /private/tmp/nightward-final-metrics.json，CPU profile 保存在 /private/tmp/nightward-baseline.cpuprofile 等临时文件中。
