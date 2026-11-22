# Findings

- 主会话已完成最近提交 e3f92f0，工作区起始干净。
- Pixi3D 当前公开 glbToGltf、loadImages、normalizeMeshopt、parseGltf 和 getAttributeData；可在 Nightward 内取得 extras，无须 patch。
- 旧 world.bin 是按 4 字节对齐的几何数组，gzip 解压约 15.68 MB；模型、碰撞、灯光及布局目录在 manifest。
- 旧 Prop 位置和状态依赖 Game_Event；PropView 已按材质合批，必须保留该绘制方式。
- 现有墓碑合组仅为规避 999 事件限制；迁移时应拆回原始物件并保留组合事件产生的整体移动。
- 模型资源由 ImageManager/Assets 生命周期持有，单个 Prop 的销毁不应释放共享几何或材质。

- 用户新增授权：扩展 rmmz() 的 extraAssetDirs 参数。已复用现有目录复制链，默认目录保留、额外目录去重；Nightward 配置 models，移除专用复制插件。
- 正常重制原 GLB 节点与 extras 保留；无原版资源键的手工网格/材质也保留。
- 运行态与生产模型目录检查通过，无需依赖补丁或新增运行依赖。
