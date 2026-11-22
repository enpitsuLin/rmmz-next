# Nightward

使用 `rmmz-next`、RMMZ 数据库和 `@pixi/3d` 实现的 Nightward 生存游戏。

1. **启动**

   在仓库根目录执行：

   ```sh
   pnpm --filter nightward dev
   ```

   只使用浏览器：

   ```sh
   pnpm --filter nightward dev:server
   ```

   打开终端显示的地址。`Nightward` 插件已在 `js/plugins.js` 登记并启用；已打开的 MZ 编辑器应重新打开工程，避免旧的插件列表覆盖磁盘配置。

2. **操作**

   | 操作 | 输入 |
   | --- | --- |
   | 移动 | WASD、方向键、手柄摇杆或方向键、按住画面拖动 |
   | 攻击 | 自动 |
   | 选择菜单或升级 | 方向键与 Enter、手柄 A、点击；升级也支持 1–3 |
   | 暂停 | Esc、P、手柄 Start、计时器右侧暂停按钮 |
   | 返回 | Esc、手柄 B |
   | 静音、全屏 | M、F，或标题与暂停菜单按钮 |

3. **完整玩法**

   - 标题包含实时战斗演示、开始、操作说明、设置和最好成绩。
   - Lash、Wand、Tomes、Storm、Ward、Flask 六武器，各五阶。
   - Might、Haste、Lodestone、Cinder 四被动，各五阶。
   - 经验宝石、金币、烤鸡、磁吸、清场圣物和一至三次奖励的宝箱。
   - 蝙蝠、骷髅、食尸鬼、幽灵、飞骷髅、精英、蜂群和包围阵形。
   - 3:00 出现死神；包含登场、追击、蓄力、镰刀波和恢复阶段。击杀死神获胜，角色死亡失败。
   - 暂停、升级和局内设置冻结模拟；失焦自动暂停。
   - 结算展示本局数据、构筑和实际武器伤害。设置和纪录跨局保存。

4. **内容编辑**

   | 数据 | 作用 |
   | --- | --- |
   | Actors / Classes | 主角、100 点生命、每秒恢复、初始 Lash、经验曲线标记 |
   | Weapons | 六种武器各五阶，共 30 条；攻击力决定该阶基础伤害，备注配置冷却和轨迹 |
   | Armors | 四种被动饰品各五阶，共 20 条 |
   | Skills | 六种武器的内部攻击动作、接触伤害模板，以及死神镰刀波技能（008） |
   | States | 死亡及临时战斗状态 |
   | Enemies | 五类敌人及死神的生命和行为参数 |
   | Items | 八种拾取物，物品使用效果关联金币、经验公共事件和恢复效果 |
   | Troops | 四个阵形模板，参数放在第一页的战斗事件注释中 |
   | Map001 / Tilesets / GLB 场景 | 原生二维地图铺地、地图绑定、逻辑事件，以及墓园 Prop 的三维布局 |
   | System / CommonEvents | 玩家初始位置、标题 BGM、胜败 ME、阶段提示、音效和墓穴演出 |

   自定义内容使用 `<nightward:JSON>`。武器、被动饰品、敌人和物品使用备注；地图物件使用 GLB 节点和 `extras.nightward` 保存布局、碰撞和配置；少量原生逻辑事件按 Prop ID 绑定；敌群模板使用战斗事件注释。生命、伤害、经验、装备、状态和金币由 RMMZ 游戏对象管理。Nightward 角色使用六个武器槽（类型 1），以及 Might、Haste、Lodestone、Cinder 四个专属被动槽（类型 2–5）；升级替换同系列装备，HUD、暂停和结算直接读取角色装备。技能不表示武器持有，被动不使用状态保存。

   在地图上设置「玩家初始位置」可调整出生点。起始地图需要配置 Nightward 地图备注和 GLB。开局配乐使用地图的「自动播放 BGM」，标题配乐与胜败 ME 在系统设置中编辑，死神登场时执行公共事件 002。

   在公共事件 005–011 编辑开场和分钟提示、墓穴显隐、开门、倒计时与击败死神的音效。阶段以首条注释绑定对局时点或 Boss 信号，等待和门动画随对局暂停。[阶段事件说明](docs/prop-scene.md)

   升级、宝箱、装备栏和结算使用每阶武器、饰品记录的原生图标，素材从 `img/system/IconSet.png` 读取。升级卡片的名称和逐阶说明也来自这条记录。详见 [UI 说明](docs/ui-replication.md)。

   经验条按角色当前经验和原生等级经验阈值计算，沿用 Nightward 的经验曲线。调整武器伤害时编辑该阶武器的「攻击力」，调整死神镰刀波伤害时编辑技能 008 的伤害公式，默认值为 25。

   在物品 001–004 的「使用效果」中选择奖励公共事件。默认公共事件 012–014 给守夜人（角色 001）增加 1、5、25 点经验，015 增加 10 金币。使用原生「增减经验」时保持「显示升级」关闭，由 Nightward 逐级处理升级选择。

   地图中心格 `(90, 90)` 对应三维世界 `(0, 0)`。连续碰撞和空间查询位于 [Game_NightwardWorld.ts](js/nightward/objects/Game_NightwardWorld.ts)，战斗、刷怪和奖励由同目录下的模块处理。

   草地、道路和散布泥地在 RMMZ 地图编辑器中铺设：第一图块层铺草地，第二图块层用 A5 泥地图块画道路轮廓，进入场景时自动补齐透明渐隐边缘和转角。运行时由原生 `Tilemap` 合成为三维平面地面，颜色与法线一起过渡，接收场景光照、阴影和雾。墓碑脚下的泥地保留在三维墓碑模型中，使用原版网格和内嵌贴图，与墓碑一起变换和显隐。

   地图备注 `<propScene:models/maps/graveyard.glb>` 绑定标准 GLB。普通 Prop 由 `Game_NightwardProps` 管理，无需地图事件；逻辑事件使用 `<prop:brazier:1>` 和 `<propOffset:0.4,0,-0.2>` 绑定。插件指令支持按 ID 或标签移动、显隐、破坏、开门和调用公共事件，详见 [GLB 场景说明](docs/prop-scene.md)。

5. **原版资产**

   角色、敌人、拾取物、武器物件、墓园贴图、几何、UI、位图字形、月亮、配乐和音效均由官方 Nightward 的程序生成器编译。已移除上一版自行绘制的简化素材和替代音乐。

   `img/nightward/reference/` 保存原版图集、法线、自发光和来源清单；`models/` 保存内嵌几何、材质和贴图的标准 GLB，旧自定义几何包已移除。玩法继续使用 RMMZ 的角色、武器、防具、内部攻击技能、状态、敌人、物品和存储。

   场景 Prop 的碰撞位置已同步原版墓园。相机、月光、火光、材质粗糙度、雾、泛光和景深参数也已按原版接入。界面使用 RMMZ `Window` / `Window_Selectable` 与原版风格的 `img/system/Window.png`，保留原版像素比例、布局和动画时序。字效、光晕与飞行图标继续使用 Pixi，选项处理由原生选择窗口管理。标题、HUD、升级/宝箱、暂停与结算的实现见 [UI 说明](docs/ui-replication.md)。

   六种武器和火盆特效由 RMMZ 现有 Effekseer 运行时绘制，沿用原版贴图、轨迹、粒子参数和时序；灯光、镜头与后处理继续使用 Pixi3D。首次出手、连发、法典休眠和火池伤害时序同步原版。Cinder 每级减少 8% 冷却，Haste 每级增加 10% 移速，见 [武器说明](docs/weapon-replication.md) 和 [Effekseer 说明](docs/effekseer.md)。

   数据和素材已经随工程提供，正常启动不需要生成。需要重新制作资产时：

   ```sh
   pnpm --filter nightward generate:assets
   pnpm --filter nightward generate:content
   ```

   资产编译需要访问官方发布脚本、可用的 Chrome 和 FFmpeg。可用 `NIGHTWARD_CHROME`、`NIGHTWARD_FFMPEG` 指定其路径；已有脚本快照可通过 `NIGHTWARD_REFERENCE_SOURCE`、`NIGHTWARD_REFERENCE_LOADER` 指定。独立 Chrome 只用于生成 UI、战斗特效图集和离线音频，不运行游戏。

   `generate:content` 只重建 RMMZ 数据。它会保留已有地图、玩家初始位置、系统音频、物品、公共事件、武器能力值、死神镰刀波技能，以及武器和防具的名称、说明和图标索引。物品或公共事件文件缺失时会创建对应的默认配置。其他由脚本生成的数据库字段会按生成器重建。[资产来源说明](docs/reference-assets.md) 记录来源与转换方式。

6. **打包与存储**

   ```sh
   pnpm --filter nightward build
   pnpm --filter nightward preview
   ```

   构建目录为本工程的 `dist`。浏览器使用 IndexedDB，NW.js 使用原生 StorageManager 存储；纪录键为 `nightward-records`，选项存入 `config`。演示和未完成对局不计入纪录。

7. **交付约定**

   未添加测试框架；GLB 迁移执行必要的类型、构建与资产检查，未代理试玩。由用户运行本工程并测试。实现范围与设计依据见 `docs/nightward-replication-plan.md`。

## 源码结构

[Nightward.js](js/plugins/Nightward.js) 提供 MZ 插件元数据，由 [install.ts](js/nightward/install.ts) 注册指令和引擎补丁。运行模块按 `rmmz-next` 核心的职责组织在 `js/nightward/`。

| 目录 | 职责 |
| --- | --- |
| [`primitives/`](js/nightward/primitives) | 坐标与空间索引、输入和布局工具 |
| [`managers/`](js/nightward/managers) | 数据库读取、GLB 和特效加载、音频、配置及纪录 |
| [`objects/`](js/nightward/objects) | 对局状态、碰撞、地图物件、阶段事件、战斗和奖励 |
| [`scenes/`](js/nightward/scenes) | 标题演示和正式对局的生命周期 |
| [`sprites/`](js/nightward/sprites) | 三维墓园、粒子渲染、HUD 和界面精灵 |
| [`windows/`](js/nightward/windows) | RMMZ 窗口皮肤、选择处理和各个界面面板 |
| [`reference/`](js/nightward/reference) | 生成的战斗呈现模块 |
