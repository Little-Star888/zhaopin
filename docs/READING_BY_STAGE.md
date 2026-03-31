# 分阶段阅读指南

> 版本：1.2 | 日期：2026-03-25
> 作用：告诉接手人”当前处于什么阶段、什么角色，就先看什么”，避免一次性把所有文档全看一遍。

## 1. 使用原则

不要一口气通读所有文档。
先判断当前项目处于哪个阶段，再按你的角色阅读对应文档。

阶段完成后，请在对应阶段打标记。

---

## 2. 阶段总览

- [ ] Phase A：Boss 单平台生产化收口
- [ ] Phase B：多平台抽象设计文档
- [ ] Phase C：第二平台 PoC
- [ ] Phase D：多平台共享底座
- [ ] **Phase UI：Dashboard Web UI 工作台**（与 Phase A 并行推进）

说明：

1. 当前默认主线是 `Phase A`
2. `Phase UI` 与 `Phase A` 并行，不互相阻塞
3. 只有 Phase A 验收通过，才进入 Phase C 的实现动作
4. Phase B 当前只做文档，不做抽象代码

---

## 3. 按角色阅读

### 3.1 前端开发（Dashboard UI）

当前任务：实现 Web UI 工作台（Bento Grid + 简历管理）

先看：

1. `docs/plans/DIVERGENCE_DASHBOARD_AND_MULTIPLATFORM.md`（已达成共识的部分）
2. `docs/FRONTEND_ENTRY.md`（现有前端架构）
3. `docs/ARCHITECTURE.md`（整体架构理解）

### 3.2 后端开发（Controller API）

当前任务：为 Dashboard 提供增量 API

先看：

1. `docs/plans/DIVERGENCE_DASHBOARD_AND_MULTIPLATFORM.md`（已达成共识的部分）
2. `docs/BACKEND_ENTRY.md`（现有后端架构）
3. `controller/server.js`（现有 API 端点）

### 3.3 爬虫开发（多平台扩展）

当前任务：评估和实现第二平台采集

先看：

1. `docs/plans/DIVERGENCE_DASHBOARD_AND_MULTIPLATFORM.md`（分歧点 1：爬虫路径）
2. `MULTI_PLATFORM_PHASE_PRD.md`（全平台产品规划）
3. `ADAPTER_EXECUTOR_INTERFACE_DRAFT.md`（接口草案）
4. `spiders/base_spider.py`（现有爬虫基类）

### 3.4 项目经理 / 接班 AI

先看：

1. `CURRENT_PRIORITY.md`（当前优先级）
2. `PROJECT_PRODUCT_STATUS.md`（产品状态）
3. 本文件（`docs/READING_BY_STAGE.md`）
4. `docs/plans/DIVERGENCE_DASHBOARD_AND_MULTIPLATFORM.md`（待决策项）

---

## 4. Phase A 阅读顺序

适用场景：

1. 你要把 Boss 单平台跑稳
2. 你要做真实目标城市 / 岗位验证
3. 你要做 delivery、enrichment、反爬、验收收口

先看：

1. `README.md`
2. `CURRENT_PRIORITY.md`
3. `PROJECT_PRD.md`
4. `PROJECT_ACCEPTANCE_CRITERIA.md`
5. `PROJECT_PRODUCT_STATUS.md`
6. `docs/ARCHITECTURE.md`
7. `docs/BACKEND_ENTRY.md`
8. `docs/FRONTEND_ENTRY.md`
9. `docs/TESTING_ENTRY.md`
10. `docs/plans/EXECUTION_PLAN_SQLITE_DELIVERY_QUEUE.md`
11. `docs/plans/EXECUTION_PLAN_COMPANY_ENRICHMENT_FINAL.md`

完成标记条件：

- [ ] Boss 单平台生产基线通过

---

## 4. Phase UI 阅读顺序（Dashboard Web UI）

适用场景：

1. 你要实现 Chrome 扩展的 Web UI 工作台
2. 你要做 Bento Grid 岗位展示、简历管理、待投递列表
3. 你要为 UI 增加新的 Controller API

先看：

1. `docs/plans/DIVERGENCE_DASHBOARD_AND_MULTIPLATFORM.md`（共识 + 待决策）
2. `docs/ARCHITECTURE.md`
3. `docs/FRONTEND_ENTRY.md`（理解现有扩展结构）
4. `docs/BACKEND_ENTRY.md`（理解现有 Controller API）

方案文档（待决策后产出）：

- `docs/plans/DASHBOARD_UI_PLAN.md` — UI 实现方案（待创建）
- `docs/plans/MULTIPLATFORM_CRAWL_PLAN.md` — 多平台扩展方案（待创建）

完成标记条件：

- [ ] Dashboard 主页 Bento Grid 可展示岗位数据
- [ ] 第二页简历上传 + 待投递岗位列表可用
- [ ] Glassmorphism 浮窗、Toast、Micro-interactions 实现
- [ ] Controller 增量 API 可用

---

## 5. Phase B 阅读顺序

适用场景：

1. 你要定义统一职位模型
2. 你要定义 adapter / executor 边界
3. 你当前不写抽象代码，只写设计文档

先看：

1. `PROJECT_PRD.md`
2. `PROJECT_DECISIONS.md`
3. `docs/ARCHITECTURE.md`
4. `UNIFIED_JOB_MODEL_DRAFT.md`
5. `ADAPTER_EXECUTOR_INTERFACE_DRAFT.md`
6. `docs/FRONTEND_ENTRY.md`
7. `docs/BACKEND_ENTRY.md`
8. `MULTI_PLATFORM_PHASE_PRD.md`

完成标记条件：

- [ ] UnifiedJobModel 草案完成
- [ ] adapter / executor 草案完成

---

## 6. Phase C 阅读顺序

适用场景：

1. 你要接入第二平台
2. 你要做平台 PoC，而不是一次性多平台铺开

先看：

1. `PROJECT_PRD.md`
2. `UNIFIED_JOB_MODEL_DRAFT.md`
3. `ADAPTER_EXECUTOR_INTERFACE_DRAFT.md`
4. `MULTI_PLATFORM_PHASE_PRD.md`
5. `docs/ARCHITECTURE.md`
6. `docs/FRONTEND_ENTRY.md`
7. `docs/BACKEND_ENTRY.md`
8. `docs/TESTING_ENTRY.md`

完成标记条件：

- [ ] 第二平台列表 + 详情 + 落库 PoC 通过

---

## 7. Phase D 阅读顺序

适用场景：

1. 你已经通过第二平台 PoC
2. 你要把 controller 变成多平台共享底座

先看：

1. `PROJECT_PRD.md`
2. `PROJECT_PRODUCT_STATUS.md`
3. `PROJECT_DECISIONS.md`
4. `UNIFIED_JOB_MODEL_DRAFT.md`
5. `ADAPTER_EXECUTOR_INTERFACE_DRAFT.md`
6. `MULTI_PLATFORM_PHASE_PRD.md`
7. `docs/ARCHITECTURE.md`
8. `docs/BACKEND_ENTRY.md`
9. `docs/FRONTEND_ENTRY.md`
10. `docs/TESTING_ENTRY.md`

完成标记条件：

- [ ] 至少 2 个平台进入统一模型
- [ ] 平台差异被收敛到 executor / adapter

---

## 8. 当前状态建议

如果你不确定现在在哪个阶段：

1. 先看 `CURRENT_PRIORITY.md`
2. 再看 `PROJECT_PRODUCT_STATUS.md`
3. 默认按 `Phase A` 处理
