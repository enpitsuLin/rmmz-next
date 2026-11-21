# Task Plan: Nightward 完整复刻

## Goal
按照 example/nightward/docs/nightward-replication-plan.md 完整实现原版 Nightward 的玩法与三维呈现，尽量复用 RMMZ 数据和运行对象。

## Next Step
UI 实现与离线资产制作已完成；交由用户重启 Nightward 测试。

## Current Phase
Phase 10

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
| 不执行自动化验证、构建验证或代理试玩 | 用户明确要求自行测试 |
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
