# Task Plan: Nightward 完整复刻

## Goal
按照 example/nightward/docs/nightward-replication-plan.md 完整实现原版 Nightward 的玩法与三维呈现，尽量复用 RMMZ 数据和运行对象。

## Next Step
Effekseer 性能与地图显示修复已完成，并经用户授权使用 pnpm dev / DevTools 实测；不提交或推送。

## Current Phase
Phase 16

## Phases

### Phase 1: 工程与规则核对
- [x] 读取完整方案、当前工程与原作规则
- [x] 保留用户自行测试的约定
- **Status:** complete

### Phase 2: 内容与插件骨架
- [x] 制作角色、职业、技能、状态、敌人、物品、地图和素材
- [x] 接入 ESM 插件、数据编译与依赖
- **Status:** complete

### Phase 3: 完整战斗与成长
- [x] 连续移动、碰撞、六武器、四被动与升级奖励
- [x] 敌群调度、精英与死神、掉落、胜负
- **Status:** complete

### Phase 4: 三维墓园与初版界面
- [x] 墓园、像素角色、灯光、阴影、效果与相机
- [x] 专用标题、演示、HUD、设置、暂停、结算与三类输入
- **Status:** complete

### Phase 5: 生命周期与运行交付
- [x] 对接配置、音频、纪录、资源归属与构建入口
- [x] 按源码审阅需求覆盖，不新增或执行自动化测试
- **Status:** complete

### Phase 6: 初版交付
- [x] 逐条核对方案范围与实际文件
- [x] 交付启动说明和用户试玩入口
- **Status:** complete

## Decisions Made
| Decision | Rationale |
|----------|-----------|
| 默认不执行自动化验证、构建验证或代理试玩；本轮授权 pnpm dev / DevTools 性能调试 | 用户明确要求自行测试，随后明确允许实际运行以定位掉帧 |
| 使用 RMMZ 原生战斗对象和数据库，三维仅负责呈现与空间模拟 | 满足系统数据复用，保持单一数值来源 |
| 阵形元数据使用敌群第一页的事件注释 | MZ 敌群没有备注字段，注释可在编辑器修改 |
| 原版资产通过 ESM 编译器生成，字体使用原版位图字形 | 撤销自制替代素材；保留官方生成结果、来源和输入快照 SHA |

## Errors Encountered
| Error | Resolution |
|-------|------------|
| 默认 FFmpeg 缺少 libx265.215.dylib | 使用已有 ffmpeg-full，生成脚本支持 NIGHTWARD_FFMPEG |
| 音频生成的局部 process 名称遮蔽 Node process | 改名为 encoding 后完成所有音频产出 |
| UI 修改时补丁上下文不匹配 | 拆分补丁，按实际声明完成修改 |
| 查询引擎工具类时使用了错误目录 | 通过 rg --files 定位 core/primitives 下的真实文件 |
| 更新火盆计划时补丁混入无效文档上下文 | 移除无效块，按已读取的实际段落拆分更新 |
| Context7 文档查询返回 fetch failed | 以已安装 @pixi/3d 的类型与实现、官方发布脚本作为一手依据 |

## 约定
- 不提交或推送。
- 不增加自动化测试、Vitest 或代理试玩流程。
- 原有方案文档为未提交用户资产，保留并按实现情况补充。

### Phase 7: 原版资产纠正
- [x] 核对原版资产为代码生成，定位上一版擅自替换的偏差
- [x] 编译原版角色动画、法线/自发光、贴图、图标和墓园几何
- [x] 接入原版 UI 字形、面板、相机和材质参数
- [x] 烘焙原版配乐与音效，并更新数据和资源说明
- **Status:** complete

### Phase 8: 启动 Failed to fetch 修复
- [x] 对照用户截图检查资源加载链路
- [x] 确认 Vite 静态服务对 .gz 响应设置 Content-Encoding: gzip
- [x] 将应用层 gzip 几何资源统一改名 world.bin，更新加载器、生成脚本和说明
- [x] 遵守用户自行测试约定，不执行自动化验证
- **Status:** complete

### Phase 9: 行走图左右朝向修复
- [x] 对照原版确认左右共用动画帧，通过 UV 镜像切换
- [x] 修正 3D 公告板忽略负缩放导致主角和敌人不转向
- [x] 同步提灯位置、MZ 左右行生成与现有角色图
- [x] 按约定不执行自动化验证或代理试玩
- **Status:** complete

### Phase 10: 原版 UI 完整还原
- [x] 对照官方发布代码记录像素比例、布局和动画时序
- [x] 实现共享字形、动画、按钮和像素擦屏
- [x] 对齐标题、HUD、升级/宝箱、暂停/设置和结算
- [x] 对接场景生命周期、输入、纪录与资源生成说明
- [x] 按约定交由用户测试，不运行自动化验证
- **Status:** complete

### Phase 11: 复用 RMMZ 原生窗体
- [x] 核对本仓库 Window、Window_Selectable 与现有 UI 调用
- [x] 用 Window.png 和 Window 子类承载面板
- [x] 用 Window_Selectable 管理菜单、升级卡片和系统按钮
- [x] 保留原版布局、字效、翻牌、退场和奖励飞行
- [x] 更新资源制作与说明，交由用户自行测试
- **Status:** complete

### Phase 12: 火盆破坏光效
- [x] 对照原版破坏闪光、两层余辉和局部光照参数
- [x] 接入共享光晕批次与现有点光源池
- [x] 记录实现范围，交由用户自行测试
- **Status:** complete

### Phase 13: 六武器原版表现与节奏
- [x] 核对原版六武器、特效纹理与被动规则
- [x] 移植原版武器绘制模块和生成资产，接入RMMZ模拟适配
- [x] 对齐初始延迟、连发、法典休眠、火池与被动冷却
- [x] 更新说明和实施记录，交由用户自行测试
- **Status:** complete

### Phase 14: 地图事件驱动Prop
- [x] 拆分原版模型、局部碰撞和附属光效，保留环境静态几何
- [x] 由Game_Event生效页注释和真实坐标驱动Prop状态与位置
- [x] 接通原生地图事件更新，统一公共事件消费
- [x] 同步批量渲染、碰撞索引、门体与附属光效
- [x] 保留手工布局并迁移当前工程，更新说明
- **Status:** complete

### Phase 15: Effekseer特效迁移
- [x] 核对现有运行时、三维通道和资源制作接口
- [x] 制作原版贴图、轨迹和时序对应的Effekseer资源
- [x] 接入六武器与火盆生命周期、暂停和事件跟随
- [x] 保留Pixi3D灯光和镜头，移除旧特效绘制
- [x] 清理旧efkefc及引用，更新说明，交由用户测试
- **Status:** complete


### Phase 16: Effekseer 性能与地图显示修复
- [x] 按用户授权启动 pnpm run dev，通过本机 DevTools 录制 CPU 和调用次数
- [x] 将逐粒子 updateHandle 改为每帧一次批量 update，释放过期实例
- [x] 缓存未变化的颜色和自定义参数，取消光束临时数组
- [x] 修复 Effekseer 遗留 FRONT_AND_BACK 导致地图整体被剔除
- [x] 确认原始单面材质地图、火盆与武器同时显示，记录实际帧时间
- **Status:** complete
