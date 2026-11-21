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


## 结算 BUILD 与双栏裁切

1. 后四格为被动升级；Game_BattlerBase.die 会 clearStates，旧结算在死亡后调用 rankOf 时读到 0，所以图标与等级点隐藏。
2. RunSession 开局及 grantReward 完成后保存从 RMMZ 对象读出的构筑快照，finish 使用该快照；战斗状态语义保持原样，不修改引擎死亡逻辑。
3. 非 short 横屏原先固定两列各 180 单位，加间距共 372，超过 DPR 1 下 1100 像素画面的 366 单位。统一按可用宽度限制列宽，不修改 Window 裁切或 Window.png。
4. DevTools 实际升级后触发 RMMZ 死亡：原生被动等级变为 0，结算快照仍为 3/4/2/5，十个槽图标可见。1100×760、DPR 1 时左栏 x=24–531，右栏 x=567–1074，无运行异常。预览未写入纪录。


## 原生装备构筑迁移（2026-11-22）

1. 当前 Weapons / Armors 为空，Skills 保存六武器五阶，States 保存四被动五阶；现有实际参数与内容生成脚本一致。
2. 原生 Database.isWeapon/isArmor 按数据库对象身份判断，装备必须保留原始数据库对象引用；不能把展开复制的记录直接交给 changeEquip。
3. System 的装备、武器、防具类型目前均为空，迁移需补齐类型和职业装备许可；Nightward 职业单独覆盖 equipSlots，保持通用引擎不变。
4. 官方说明确认装备的 params 会叠加到角色，独立武器伤害和冷却等保留备注；技能仅承载内部攻击效果。来源：https://rpgmakerofficial.com/product/MZ_help-en/01_08_05.html 。Context7 查询连接失败，改查官方手册。
5. 删除死亡前构筑快照，结算直接读取不会被死亡清除的装备。按用户要求不执行自动化验证、构建或代理试玩。
6. 调研路径不存在：src/database/types/Weapons.ts 与 src/Utils；已改读实际 database-types/index.ts 与 core/managers/Database.ts。一次计划补丁因 findings 锚点不匹配失败，改用保留内容的定点更新。

7. 装备记录通过 Object.assign 保留原生数据库身份；授予奖励使用 forceChangeEquip 替换同族原槽或对应类型首个空槽，不累积旧阶库存。装备槽本身保存获得顺序。
8. 武器备注新增 skillId，每家族一个内部动作；Game_Action 继续结算命中，基础威力从出手上下文的装备记录读取，八项原生装备参数均为零。现有数值、冷却和各类定时器未调整。
9. 删除 rankOf、WeaponSkill、buildOrder、buildSnapshot、captureBuild 和技能学习/被动状态授予路径；HUD、暂停与结算直接读取装备。已发射弹丸和火池持有原装备记录，待发连击继续读取当前装备。
10. 已成功执行 node scripts/generate-content.mjs，生成 30 条武器、20 条饰品、8 条内部攻击和死亡状态，同步初始装备、职业许可、敌方动作引用和类型表；Map001 / MapInfos 的存在判断继续保留手工布局。旧 --weapons-only 分支删除，内容生成统一更新关联数据库。
11. 文档首次编辑命令误用了 Nightward 工作目录和仓库相对路径，未写入文档；随后改为绝对路径并成功完成 README、武器、UI 和架构说明更新。内容生成已成功，不重复执行。


## 装备备注去重（2026-11-22）

1. 武器备注的 name、description、icon 重复数据库原生字段；color 无运行时消费者，category 在 Weapons / Armors 中也未被读取。饰品重复保存 name、description、category。
2. Reward 改读 entry.name / entry.description / entry.iconIndex。WeaponData 和 PassiveData 删除对应声明；生成脚本区分原生字段与专用参数，清除旧颜色配置。
3. 现有数据库只定点删除上述备注字段，保留其他注释、原生字段与所有实际玩法参数，没有重跑全量内容生成。饰品备注仅 key / rank / value；武器保留独立伤害、内部攻击绑定与空间和时序参数。
4. 本轮官方手册打开请求停滞，已终止只读查询；去重依据是本仓库完整字段消费者搜索，不依赖外部 API 变化。


## 内部攻击迁入原生特性（2026-11-22）

1. 用户将 Lash 1 添加 code=43、dataId=1、value=1 的“添加技能”特性。原生 Game_BattlerBase.TRAIT_SKILL_ADD=43，Game_Actor.skills 会合并装备提供的技能；不同于 code=35 的单一普通攻击技能。
2. 六种武器各阶保留自己的添加技能特性，出手和命中从来源装备读取特性 dataId，避免从角色聚合技能选择造成六武器混淆。WeaponData、现有备注和生成脚本不再保存 skillId，没有旧字段兼容路径。
3. Lash 1 的 wtypeId 同时被改为 0，但职业仅允许类型 1；原生 canEquipWeapon 会拒绝并在刷新时卸下。已恢复为当前 Nightward 类型 1，保留用户添加的技能特性及其他数据。
4. 只定点迁移 Weapons，不重跑全量内容生成；现有特性不替换，其他字段、装备备注参数和地图布局保留。Context7 连接失败，依据本仓库原生常量和技能汇总实现完成适配。


## Might 1 升级崩溃（2026-11-22）

1. 用户截图为升级选择后 Cannot read property setObject of undefined。grantReward 按 entry.etypeId 寻找空槽，Might 1 当前 etypeId=0，而 Nightward 装备槽仅有 1 和 5，查找返回 -1，forceChangeEquip 访问 _equips[-1] 导致错误。
2. Might 1 的 atypeId 也为 0，职业只许可 Nightward 防具类型 1；即使只修槽类型，该饰品也会被原生 releaseUnequippableItems 卸下。已同时修正 etypeId=5、atypeId=1。
3. 其余 29 条武器与 19 条饰品的对应类型均符合当前配置，内容生成脚本原本也使用正确类型。本轮只定点修复 Armors[1]，不修改原生引擎、奖励节奏或其他数据库内容。


## 标题底部排版（2026-11-22）

1. 用户截图中底部 Best、胜利纪录和署名挤在一起。原布局按菜单末项加固定偏移排列两行纪录，却独立将署名固定在底边；菜单可用高度未计入纪录，导致重叠和越界。
2. 将三条文字归入统一 footer，纪录居中、署名按用户补充要求右对齐放在右下角。字号使用已有 icon 单位和 fitScale，保持整数物理像素，不替换字形或引入字体。
3. 先按可见纪录行数、行间距、分组间距和底边距计算 footer 高度，再限制菜单位置；低高度横排菜单也使用同一底部边界。淡入和 PLAY 退出统一作用于 footer，保留现有时序。
4. 本轮仅修改标题布局与说明，没有运行游戏、自动化验证或构建；由用户测试。使用 better-layout、better-typography 的分组间距与字阶原则，不添加未要求的设备、语言或代理试玩检查。


## 启动菜单闪现（2026-11-22）

1. 用户报告开局菜单先出现、消失后再淡入。SceneManager.updateScene 的未启动分支调用 start 后本帧不会再执行 update；TitleScreen 在 start 阶段创建并加入场景，此时 UiScreen.content 与子节点仍为默认 alpha=1。下一次 tick 才调用 animate，将未到入场时间的标题、菜单和 footer 设为透明，形成闪现。
2. 共享 UiScreen.content 初始 alpha 改为 0；第一次 tick 先设置内容透明度并完成子节点动画和按钮状态，再由渲染显示本帧结果。无需提前推进时钟、调用未完成构造的子类动画或改变 SceneManager。
3. 该入口涵盖当前标题、面板、暂停、结算和奖励界面，保留原有淡入、减少动态效果设置和底部排版。未运行游戏或自动化验证。


## 数据库备注驱动升级文案（2026-11-22）

1. 原 Reward 虽读取原生 name / description，RewardScreen 实际却忽略它们，分别使用 build-ui.ts 的 upgradeNames 与 upgradeDescription。用户要求独立一行备注，因此使用 nightwardCard JSON 存储展示名称和该阶描述，保留已有玩法备注。
2. 默认文案从原固定表提取后写入全部 30 条武器和 20 条饰品，随后删除升级名称表、描述表和描述查找函数。备注通过原生 DataManager.extractMetadata 提供的 meta.nightwardCard 在 readContent 中解析一次，保存到装备 card 字段，保留数据库对象身份。
3. RewardScreen 使用 reward.name 与 reward.description；HUD 提示队列保存奖励名称，结算按对应武器阶级读取同一 card.name。ResultsScreen 的唯一调用点同步传入 Content，消除其他名称表消费者。
4. 内容生成按现有数据库记录 ID 读取并保留 nightwardCard 整行，不再在代码或额外数据文件维护重复卡片文案。此次直接更新两份装备数据库，没有执行全量生成，其他原生字段、特性、数值与地图布局保留。
5. 未运行游戏、自动化验证、类型检查、lint 或构建；按用户要求由用户测试。


## 专属被动装备类型（2026-11-22）

1. 用户完成数据库配置：初始装备为 [1]，所有武器类型为 etypeId=1 / wtypeId=1，Might、Haste、Lodestone、Cinder 各五阶的 etypeId 分别为 2、3、4、5，atypeId=1，职业装备许可匹配。
2. 插件原来的后四槽仍为 5、5、5、5，与用户新配置不匹配；现同步为 2、3、4、5。奖励发放原先已按 etypeId 选择空槽，同家族升级也按已有装备定位，继续复用即可。
3. 内容生成的饰品 etypeId 改为 i+2，装备类型名称同步用户的 Weapon / Might / Haste / Lodestone / Cinder。既有 JSON 输出已改为两空格缩进和换行，此次没有修改或重新生成数据库。


## 卡片文案改用原生字段（2026-11-22）

1. 用户指出 description 已是原生字段，要求迁回；随后追问名称备注的用途，最终按同一原则移除名称覆盖层。每阶装备已有独立记录，可直接保存显示名称与该阶描述。
2. 将原 nightwardCard.description 写入 description，将展示名称写入 name；保留所有其他字段、特性与玩法备注。两个数据库均按两空格缩进及文件末尾换行保存，未全量生成数据库。
3. 删除文案备注、UpgradeCard 及 card/cardName 编译结构；Reward 读取 entry.name / entry.description，结算读取该阶 weapon.name，HUD 与宝箱沿用 Reward 文案。
4. 内容生成只从现有数据库保留 name / description，删除装备的固定默认描述、名称备注读取和拼接逻辑。原有技能特性、装备类型与数值不变，无旧格式兼容路径。
5. 未运行游戏、自动化验证、类型检查、lint 或构建，由用户自行测试。
