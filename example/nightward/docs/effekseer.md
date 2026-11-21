# Nightward 的 Effekseer 特效

1. **职责**

   六种武器的光束、光核、符文、书本与药瓶、火花、火焰、烟尘、碎片、冲击环、焦痕，以及火盆火焰、破坏爆光和余辉，均由 RMMZ 已有的 Effekseer WebGL/WASM 运行时绘制。

   `reference/combat.js` 保留官方纯呈现层的发射参数、确定性随机、武器轨迹和时序；`effekseer.ts` 将其四顶点数据交给 Effekseer。没有将命中判定、伤害或武器冷却搬进特效资源。法典和药瓶直接跟随 RMMZ 的模拟快照，火池的开始、结束和燃尽仍使用同一世界时间。

   `weapons.ts`、`combat.ts` 和 RMMZ 数据库继续负责玩法。原版 14 个战斗点光源、8 个 Prop 点光源、天空闪电、镜头震动、炫光、冲击波、泛光与景深继续由 Pixi3D 提供。UI 字效和飞行图标保持 Pixi。

2. **资源与绘制**

   `effects/nightward/` 提供 55 份可由 Effekseer 1.70 打开的 `.efkefc` 和 5 份自定义材质。帧坐标、过滤方式和资源名登记在 `img/nightward/reference/effekseer.json`。

   全部图片来自原版 `combat-fx.png`、`actors-albedo.png` 和 `effects.png`。`effects/nightward/textures/` 只制作预乘 Alpha 副本，配合材质中的反预乘采样，保持原先 Pixi 的半透明边缘过滤；原版图集保持原样。

   普通粒子沿用原版的重力、阻力积分、生长、冷却、闪烁、旋转、近裁剪淡出与速度拉丝公式。任意光束使用两个三角形，保留两端的位置、宽度、颜色和透明度插值，同时保留原版深度前拉。地面效果继续使用加法或乘法混合。

   原版粒子容器的巨大 Y 偏移仅用来排序，顶点保持世界坐标。书本与药瓶在 `afterOpaque` 阶段写入现有深度附件；其余特效在 `afterTransparent` 阶段绘制，随后进入 Pixi3D 的原版镜头后处理。

   复用 `Graphics.effekseer`、`EffectManager` 与同一 WebGL 画布；启动时为原版粒子池配置 65,536 个实例和 32,768 个四边形。存活实例按槽复用，过期或隐藏时停止并释放，避免已消失的粒子长期占用实例。颜色和自定义参数只在变化时传入 WASM；图集帧查询使用弱引用缓存，光束计算不创建临时顶点数组。

   1.70 的 JS API 没有材质全局参数接口；绘制期间通过一处局部 WebGL 桥传入当前曝光、相机裁剪参数和 Pixi3D 已计算的线性雾颜色。运行时关闭完整 GL 状态查询，绘制结束后恢复 WebGL 方法、`BACK` 剔除模式、Pixi 状态缓存及当前渲染目标的绕序。Effekseer 会留下 `FRONT_AND_BACK`，而 Pixi 的 `resetState()` 只重置剔除开关；必须显式恢复模式，否则单面地图会被全部剔除。Effekseer 负责实际的几何、材质、深度测试和混合。

3. **暂停、地图事件与销毁**

   Nightward 场景将 `SceneManager` 默认的 Effekseer 更新延后至渲染图的 `prepare` 阶段。两个绘制通道共用一次场景遍历和一次批量 `update()`，在本帧位置、颜色与参数就绪后刷新所有实例，不再逐粒子调用 `updateHandle()`。其他 RMMZ 场景保留原有更新路径。

   受控实例速度为零，批量更新不会推进其年龄；特效仍由 RMMZ 世界时间驱动。暂停、升级和宝箱选择冻结世界时间，新一局清理旧实例。

   火盆火焰使用原版 10 FPS 的四帧动画及原版宽高、底部锚点。破坏爆光按原版事件生成；两层余辉按 `exp(-7 × 时间)` 衰减并以原版频率闪烁。火盆模型、火焰、余辉和点光源随 Game_Event 移动；无有效页或消除时隐藏。已飞散碎片留在破坏发生的位置。

   场景销毁时停止所属实例，不清理其他场景的全局 EffectManager 缓存。原有地图手工坐标、注释和事件页不受资源制作影响。

4. **重新制作**

   生成结果已随工程提供，运行游戏不需要安装特效编辑器或 .NET。只有重制特效时需要官方 [Effekseer 1.70e](https://github.com/effekseer/Effekseer/releases/tag/170e) 和 .NET 8 SDK。

   在 `example/nightward` 目录运行：

   ```sh
   EFFEKSEER_EDITOR_DIR="/path/to/Effekseer" node scripts/generate-effekseer.mjs
   ```

   `EFFEKSEER_EDITOR_DIR` 指向包含 `EffekseerCore.dll`、`Newtonsoft.Json.dll` 的官方目录；macOS 位于 `Effekseer.app/Contents/Resources`。`DOTNET` 可指定 `dotnet` 可执行文件。制作脚本调用官方 EffekseerCore 导出器，临时编译产物放入系统临时目录。

   更换原版图集或重新运行 `generate:assets` 后，再运行该命令更新帧清单、预乘贴图和 `.efkefc`。只重制原版轨迹呈现代码可运行 `node scripts/import-reference-combat.mjs --runtime-only`；生成器保留 Effekseer 绘制接入。

5. **清理与交付**

   已删除 `effects/` 根目录 120 个旧 RTP `.efkefc`；本工程 Animations 数据库没有这些资源的 `effectName` 引用。保留 RMMZ 的运行时 JS/WASM 和新 Nightward 资源。

   首次迁移只执行资源制作及其导出器编译。随后用户授权用 `pnpm run dev` 和 DevTools 调试掉帧及地图问题；已实际录制 CPU 性能、统计实例调用，并核对地图恢复后的游戏画布。未运行自动化测试、类型检查、lint 或游戏构建，没有提交或推送。

6. **本机性能记录**

   - 问题录制：约 8.7 FPS，六秒内 47,815 次 `updateHandle()`，合计约 4.4 秒；已经消失的粒子仍保留数千个实例。官方运行时的逐实例更新会扫描实例块，不能为每个粒子重复调用。
   - 修复后：每个渲染帧只批量更新一次；最后一次八秒录制为 468 帧、468 次 `update()`、零次 `updateHandle()`。地图与六种武器同时显示，未记录到运行异常。
   - 该次实际运行采样约 58.4 FPS，帧间隔 P95 约 16.7 ms，P99 约 33.3 ms；活动实例在 2,912–4,992 之间变化。采样包含升级选择，武器等级为 Lash 3、Wand 2、Tomes 2、Storm 2、Ward 5、Flask 2，不能将该数值视为所有满级战斗阶段的帧率保证。
