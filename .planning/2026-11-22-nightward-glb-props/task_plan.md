# Task Plan: Nightward GLB 场景与独立 Prop

## Goal
标准 GLB 替换 world.bin；独立 PropManager 接管布局、碰撞和运行状态；保持手工布局、原版外观、合批、RMMZ 玩法和既有特效。

## Next Step
已完成；由用户运行游戏检查实际画面和交互。

## Current Phase
Phase 5

## Phases

### Phase 1: 核对工作区与接口
- [x] 确认主会话空闲、工作区干净，保留全部既有提交
- [x] 核对原生 GLB API、现有 Prop/碰撞/资源生成链
- **Status:** complete

### Phase 2: GLB 资产与布局迁移
- [x] 制作标准 GLB 导出器、单体模型及完整场景
- [x] 迁移事件布局和配置，保留有逻辑的事件及稳定 ID
- [x] 资源重制保留现有 GLB 布局、ID 和人工配置
- **Status:** complete

### Phase 3: 加载与独立 PropManager
- [x] 原生 GLB 解析和 extras 适配，不修改依赖
- [x] 位姿、显隐、破坏、碰撞索引与挂点生命周期
- [x] RMMZ 插件指令和事件按 ID/标签操作 Prop
- **Status:** complete

### Phase 4: 渲染集成与旧格式清理
- [x] 保留材质合批、变换、灯光、火盆和门行为
- [x] 删除 world.bin 和旧事件布局依赖
- [x] 更新生成流程和使用文档
- **Status:** complete

### Phase 5: 验证与交付
- [x] 批量执行针对 GLB、迁移和运行态的必要检查
- [x] 记录验证结果与交付说明
- **Status:** complete

## Decisions Made
| Decision | Rationale |
|---|---|
| 独立计划与主计划分离 | 主会话计划保持原样 |
| 不修改 Pixi3D、不新增运行依赖 | 当前已公开 GLB 拆分、图片、解析和几何读取接口 |
| 模型和布局配置放 GLB extras | 避免外部 Prop JSON，突破地图事件数量限制 |
| 不提交或推送 | 用户仅授权实现 |

## Errors Encountered
| Error | Resolution |
|---|---|

## Validation

- 通过：GLB/Prop 检查（含原生解析、1063 个 Prop、迁移、配置保留、自定义资源保留、碰撞、事件页、重开重置、打包目录）。
- 通过：Nightward 生产构建、rmmz-next 类型检查、新增模块与 Vite 接口 lint。
- 已知限制：Nightward 类型检查仍有原提交已有的 3 条 Effekseer 类型错误；本次未改动该文件。
- 未代理试玩、未提交、未推送。
