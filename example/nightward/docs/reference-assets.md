# 原版 Nightward 资产

1. **来源**

   - [官方 Nightward](https://goodstuff.pixijs.io/nightward/)
   - [游戏发布脚本](https://goodstuff.pixijs.io/nightward/assets/start-DZtWMAL3.js)
   - [位图字形与调色板发布脚本](https://goodstuff.pixijs.io/nightward/assets/index-CSDXPW24.js)
   - [官方介绍](https://pixijs.com/blog/pixi-3d-open-beta) 明确说明，其美术和音乐均由代码生成，不加载外部图片或音频文件。

   资产作者为 PixiJS / Nightward 原作者。这里记录来源与转换方式，不将这些资产标为本项目原创。

2. **图像与模型**

   `import-reference-assets.mjs` 使用 TypeScript 的语法绑定获取资产生成函数及其依赖，执行像素和确定性几何生成，输出 PNG、帧信息、材质信息、几何数据及碰撞信息。`manifest.json` 记录官方脚本 URL 和编译输入快照的 SHA-256。

   包含 22 套动画：主角待机、行走和受伤，五种普通敌人，死神行走、挥镰和升起，三种宝石、金币、烤鸡、磁吸、圣物、宝箱、法典、药瓶及火盆。

   图集同时保留 albedo、normal 和 glow。场景保留原版装饰表面的贴图、顶点颜色、几何与确定性布局，另外生成墓穴门和天空几何。草地和泥地由原生 RMMZ `Tilemap` 绘制后作为三维平面地面，GLB 不再保存两者的网格、材质和贴图。`NightwardGround.png` 与对应法线图是标准 A5 tileset，从完整原版图像按世界比例切分，草地每 8×8 格、泥地每 4×4 格重复。`NightwardDirtEdgesB/C/D.png` 及对应法线图保存带透明渐变的泥地边缘，八邻域选择处理直边、凸角和凹角，原生 Tilemap 把泥地混合到下层草地。原版道路、随机泥斑和墓碑脚下泥地的布局已转入地图。MZ 的角色图、敌人图和图标表从同一批原版生成结果转换。原版角色左右使用同一套帧的水平镜像；三维显示通过纹理 UV 镜像切换，MZ 行走图的第二行导出为向左镜像，第三行为原始向右帧。上下移动沿用原版朝向，不另造四方向素材。

   单独重制地表 tileset：`node scripts/import-reference-assets.mjs --ground-only`。此命令不重建 GLB、UI 或音频，也不重铺已编辑的地图。`node scripts/check-ground-tileset.mjs` 检查纹理切分、世界比例和法线对齐。

   Prop 已拆为独立模型，使用标准 `models/maps/graveyard.glb` 保存几何、材质、贴图、节点布局、局部碰撞与光效挂点；`models/props/` 提供可复用 GLB。运行态由 PropManager 管理并按材质合批，普通物件不占用地图事件。资源重制保留 GLB 节点布局与配置，详见 [GLB 场景说明](prop-scene.md)。

   火盆火焰、破坏闪光和余辉由 RMMZ 现有 Effekseer 运行时绘制，复用原版光晕贴图和参数：瞬间闪光按 `exp(-7 × 时间)` 衰减，留下火盆上方与地面两层橙红余辉，以原版频率持续闪烁。破坏后的局部光照继续复用 Pixi3D 点光源池，范围缩为 4，不额外增加点光源。光效跟随地图事件，随世界暂停冻结，新一局重建时重置。

   六种武器使用独立的原版战斗特效图集 `combat-fx.png`，由 `import-reference-combat.mjs` 执行官方 `yI` 绘制器生成，包含光核、火花、烟团、圆环、弧光、闪电、光束、碎片、余烬、焦痕、符文、火焰和光晕。对应帧清单与输入来源保存在 `combat-fx.json`。纯呈现模块离线提取到 `js/nightward/reference/combat.js`，通过 `weapon-effects.ts` 读取本工程的模拟结果；`effekseer.ts` 将原版粒子公式与光束顶点交给 Effekseer 绘制，保留池容量，14 个战斗点光源预算和镜头后处理继续使用 Pixi3D。实现范围与重制命令见 [武器说明](weapon-replication.md) 和 [Effekseer 说明](effekseer.md)。

3. **UI 与字形**

   原版 UI 生成器在独立 Chrome 中输出面板、格子、按钮图形、光晕、位图字形和月亮。Pixi 显示对象直接读取原版两套独立栅格化字号及四种样式的字形帧，按原版度量排版。原版面板打包到标准192×192的 `img/system/Window.png`，由本地 `Window` 子类绘制；焦点皮肤使用其选中分区，保留原版5像素边角。菜单、卡片和按钮的选项处理由 `Window_Selectable` 提供，字效、光晕与飞行图标继续使用 Pixi。

   原版图标转换到 MZ 的 32 像素网格。局内拾取物使用原版动画，不使用物品图标替代三维世界中的拾取物。

4. **声音**

   原版音符合成器和乐谱在 OfflineAudioContext 中渲染。配乐烘焙两个循环并保留后一循环，包含前一循环的混响尾音；音效保留尾音后转换为 Ogg Vorbis，由 RMMZ AudioManager 播放。

   包含普通配乐、死神配乐、六武器声音、命中、拾取、升级、宝箱、受伤、死神登场、清场、UI 操作、胜利和失败声音。UI 另外保留 tick、stamp、swoosh；tick 通过播放速率还原计数与奖励顺序的音高变化。

5. **工程边界**

   官方游戏模拟、输入、场景管理和 PixiJS 引擎没有随发布包复制到本工程运行时。原版六武器的纯呈现模块和镜头着色器通过离线提取接入，运行时保留本工程的 RMMZ 战斗对象、数据库、原生窗体、选项处理、输入、配置和纪录存储。

   旧的简化素材生成代码已删除，数据库生成脚本不会再次覆盖原版资产。修改原版资源后应同时维护其帧尺寸、法线、自发光与几何 UV。

6. **运行约定**

   相机、材质、光照和后处理已接入原版参数。`node scripts/check-prop-scene.mjs --built` 检查 GLB 加载、草地移除、布局保留与构建资源；地面已通过浏览器渲染检查，完整玩法仍由开发者自行测试。
