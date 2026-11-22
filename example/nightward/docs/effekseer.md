# Nightward 的 Effekseer 特效

1. **职责**

   [Spriteset_NightwardProps.ts](../js/nightward/sprites/Spriteset_NightwardProps.ts) 通过 RMMZ 的 Effekseer WebGL/WASM 运行时绘制火盆火焰、破坏闪光和余辉。[NightwardEffectManager.ts](../js/nightward/managers/NightwardEffectManager.ts) 加载特效资源，[Effekseer.ts](../js/nightward/sprites/Effekseer.ts) 管理实例与绘制。武器特效和镜头后处理由 Pixi3D 提供，详见 [武器说明](weapon-replication.md)。

2. **资源与绘制**

   `effects/nightward/` 提供 55 份可由 Effekseer 1.70 打开的 `.efkefc` 和 5 份自定义材质。帧坐标、过滤方式和资源名登记在 `img/nightward/reference/effekseer.json`。

   全部图片来自原版 `combat-fx.png`、`actors-albedo.png` 和 `effects.png`。`effects/nightward/textures/` 只制作预乘 Alpha 副本，配合材质中的反预乘采样，保持原先 Pixi 的半透明边缘过滤；原版图集保持原样。

   绘制复用 `Graphics.effekseer`、`EffectManager` 与同一个 WebGL 画布。存活实例按槽复用，过期或隐藏时停止并释放。颜色和自定义参数只在变化时传入 WASM，图集帧查询使用弱引用缓存。

   1.70 的 JS API 没有材质全局参数接口；绘制期间通过一处局部 WebGL 桥传入当前曝光、相机裁剪参数和 Pixi3D 已计算的线性雾颜色。运行时关闭完整 GL 状态查询，绘制结束后恢复 WebGL 方法、`BACK` 剔除模式、Pixi 状态缓存及当前渲染目标的绕序。Effekseer 会留下 `FRONT_AND_BACK`，而 Pixi 的 `resetState()` 只重置剔除开关；必须显式恢复模式，否则单面地图会被全部剔除。Effekseer 负责实际的几何、材质、深度测试和混合。

3. **暂停、地图事件与销毁**

   Nightward 场景将 `SceneManager` 默认的 Effekseer 更新延后至渲染图的 `prepare` 阶段。两个绘制通道共用一次场景遍历和一次批量 `update()`，在本帧位置、颜色与参数就绪后刷新所有实例，不再逐粒子调用 `updateHandle()`。其他 RMMZ 场景保留原有更新路径。

   受控实例速度为零，批量更新不会推进其年龄；特效仍由 RMMZ 世界时间驱动。暂停、升级和宝箱选择冻结世界时间，新一局清理旧实例。

   火盆火焰使用 10 FPS 的四帧动画。两层余辉按 `exp(-7 × 时间)` 衰减并闪烁。绑定事件的火盆模型、火焰、余辉和点光源随 `Game_Event` 移动，无有效页或事件消除时隐藏。

   场景销毁时停止所属实例，全局 `EffectManager` 继续缓存共享资源。
