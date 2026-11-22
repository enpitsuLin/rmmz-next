# Nightward 核心式分层

## Goal
将插件源码按仓库内 RMMZ 核心的职责组织，保留玩法和生命周期。

## Next Step
迁移与验证已结束。

## Current Phase
已完成

## Phases

### Phase 1: Requirements & Discovery
- [x] 确认维护范围与验证基线
- **Status:** complete

### Phase 2: Planning & Structure
- [x] 确定目录、命名和依赖方向
- **Status:** complete

### Phase 3: Implementation
- [x] 迁移模块、脚本引用与文档
- **Status:** complete

### Phase 4: Testing & Verification
- [x] 集中执行类型、构建、资产和 lint 检查
- **Status:** complete

### Phase 5: Delivery
- [x] 汇总改动与检查结果
- **Status:** complete

## Decisions Made
| Decision | Rationale |
|----------|-----------|
| 按 primitives、managers、objects、scenes、sprites、windows 分层 | 对齐仓库内 RMMZ 核心 |
| 生成模块保留在 reference | 只同步模块导入路径 |

## Errors Encountered
| Error | Resolution |
|-------|------------|
| Effekseer 既有类型错误 3 项 | 作为重构前基线记录 |
| Nightward 既有 lint 错误 | 集中核对迁移后的诊断 |
| GLB 检查漏传开门时间与持续时间 | 对齐现有运行时调用，GLB 检查通过 |
