# Dashboard 实施开工体系索引

> 版本：1.3 | 日期：2026-03-25
> 目标：把 `PROJECT_PRD.md` / `DIVERGENCE_DASHBOARD_AND_MULTIPLATFORM.md` 继续拆成「里程碑 → 节点 → 工作包」三级执行文档。
> 废弃声明：本文档体系取代 `IMPLEMENTATION_PLAN_DASHBOARD.md`（Node A/B/C 体系），预算门禁已继承到本文档。

## 文档定位

- `PROJECT_PRD.md` 仍然是唯一产品源文档，不重写、不复制、不替代。
- 本目录下的文档全部是执行层文档，只回答 4 件事：谁先做、改哪些文件、怎么验收、什么不能碰。
- 如果执行文档与 PRD/决策文档冲突，以 PRD 和已确认的分歧决策文档为准，执行文档只负责收敛到可执行粒度。

---

## 审阅意见

当前给出的 `Phase 1 / Phase 2 / Phase 3` 顺序图没有达到“拿到开工单即可执行”的要求，主要缺 4 件事：

1. 没有分出“里程碑方案”和“节点方案”两层，执行者仍需自己理解依赖。
2. 前端、后端、验证、测试、UI 被混在阶段描述里，没有拆到工作包。
3. “读需求、写代码、检测、合并”写了动作名，但没有落到具体文件路径。
4. 第一个开工阶段没有细化到可以直接领取的最小工作包。

因此本次改为以下路径体系。

---

## 路径总树

```text
docs/plans/dashboard-delivery/
├── README.md                                        # 本索引：总路径、开工顺序、规则
├── M4_M5_PLANNING_DISCUSSION.md                     # M4/M5 三方讨论记录
├── M6_PLANNING_DISCUSSION.md                         # M6 Popup 换色讨论记录
├── milestones/
│   ├── M1_BACKEND_FOUNDATION.md                     # 里程碑1：后端基建
│   ├── M2_DASHBOARD_WORKBENCH.md                    # 里程碑2：工作台前端
│   ├── M3_EXTENSION_INTEGRATION_AND_CLOSEOUT.md     # 里程碑3：扩展入口、联调、收口
│   ├── M4_UI_REDESIGN.md                            # 里程碑4：UI/UX 视觉重构（6 PANTONE 色）
│   ├── M5_MULTIPLATFORM_DESIGN.md                   # 里程碑5：多平台架构设计（Phase B）
│   └── M6_POPUP_UI_COLOR.md                         # 里程碑6：插件 Popup UI 换色
├── nodes/
│   ├── M1_N1_DB_SCHEMA_AND_MIGRATION.md             # 节点：DB/迁移
│   ├── M1_N2_API_CORS_AND_UPLOAD.md                 # 节点：API/CORS/上传
│   ├── M1_N3_BACKEND_VALIDATION_AND_CONTRACT.md     # 节点：后端校验/API契约
│   ├── M2_N1_FRONTEND_SKELETON_AND_API.md           # 节点：前端骨架/API接线
│   ├── M2_N2_HOME_UI_AND_INTERACTION.md             # 节点：首页/UI/交互
│   ├── M2_N3_RESUME_PAGE_AND_FRONTEND_VALIDATION.md # 节点：第二页/前端验收
│   ├── M3_N1_EXTENSION_ENTRY_AND_SINGLETON.md       # 节点：manifest/popup/单例
│   ├── M3_N2_E2E_DOCS_AND_MERGE.md                  # 节点：联调/文档/合并
│   ├── M4_N1_COLOR_AND_NEUMORPHISM.md               # 节点：PANTONE 色值 + Neumorphism
│   ├── M4_N2_LAYOUT_AND_VALIDATION.md               # 节点：布局反转 + 回归检测
│   ├── M5_N1_ARCHITECTURE_DESIGN.md                 # 节点：架构设计文档
│   ├── M6_N1_POPUP_CSS_EXTRACTION_AND_COLOR.md       # 节点：CSS 提取 + 换色
│   └── M6_N2_POPUP_NEUMORPHISM_AND_VALIDATION.md    # 节点：Neumorphism + 回归
└── workpacks/
    ├── M1_N1_WP2_SCRAPED_JOBS_SCHEMA.md
    ├── M1_N1_WP3_RESUME_SCHEMA_AND_MIGRATION_V5.md
    ├── M1_N1_WP4_DB_SELF_CHECK.md
    ├── M1_N2_WP1_CORS_AND_ROUTING_STYLE.md
    ├── M1_N2_WP2_JOBS_ENDPOINTS.md
    ├── M1_N2_WP3_RESUME_UPLOAD_ENDPOINTS.md
    ├── M1_N2_WP4_API_SMOKE_CHECK.md
    ├── M1_N3_WP1_API_CONTRACT_DOC.md
    ├── M1_N3_WP2_BACKEND_ACCEPTANCE.md
    ├── M2_N1_WP1_DASHBOARD_FILE_SCAFFOLD.md
    ├── M2_N1_WP2_HASH_ROUTING_AND_API_CLIENT.md
    ├── M2_N1_WP3_FRONTEND_SMOKE_CHECK.md
    ├── M2_N2_WP1_BENTO_GRID.md
    ├── M2_N2_WP2_GLASS_MODAL_AND_TOAST.md
    ├── M2_N2_WP3_MICRO_INTERACTIONS_AND_UI_REVIEW.md
    ├── M2_N2_WP4_AMBIENT_BACKGROUND_AND_NEUMORPHISM.md
    ├── M2_N3_WP1_RESUME_PANEL.md
    ├── M2_N3_WP2_DELIVERY_LIST.md
    ├── M2_N3_WP3_FRONTEND_ACCEPTANCE.md
    ├── M3_N1_WP1_MANIFEST_HOST_PERMISSIONS.md
    ├── M3_N1_WP2_POPUP_SINGLETON_ENTRY.md
    ├── M3_N1_WP3_EXTENSION_SMOKE_CHECK.md
    ├── M3_N2_WP1_E2E_SCRIPT_AND_MANUAL_CHECK.md
    ├── M3_N2_WP2_DOC_UPDATES.md
    ├── M3_N2_WP3_FINAL_MERGE_GATE.md
    ├── M4_N1_WP1_PANTONE_COLOR_SYSTEM.md
    ├── M4_N1_WP2_NEUMORPHISM_WARM_SHADOWS.md
    ├── M4_N2_WP1_LAYOUT_REVERSE_70_30.md
    ├── M4_N2_WP2_VISUAL_REGRESSION_CHECK.md
    ├── M5_N1_WP1_UNIFIED_JOB_MODEL.md
    ├── M5_N1_WP2_ADAPTER_EXECUTOR_INTERFACE.md
    ├── M5_N1_WP3_BOSS_SPECIFIC_BOUNDARY.md
    ├── M5_N1_WP4_SECOND_PLATFORM_CANDIDATES.md
    ├── M6_N1_WP1_POPUP_CSS_EXTRACTION_AND_COLOR.md
    ├── M6_N1_WP2_POPUP_SMOKE_CHECK.md
    ├── M6_N2_WP1_POPUP_NEUMORPHISM.md
    └── M6_N2_WP2_POPUP_REGRESSION_CHECK.md
```

---

## 开工顺序

### 第一个阶段

第一个真正应该开工的阶段是：

1. 里程碑：[`M1_BACKEND_FOUNDATION.md`](/home/xixil/kimi-code/zhaopin/docs/plans/dashboard-delivery/milestones/M1_BACKEND_FOUNDATION.md)
2. 第一个节点：[`M1_N1_DB_SCHEMA_AND_MIGRATION.md`](/home/xixil/kimi-code/zhaopin/docs/plans/dashboard-delivery/nodes/M1_N1_DB_SCHEMA_AND_MIGRATION.md)
3. 第一个可执行工作包：[`M1_N1_WP2_SCRAPED_JOBS_SCHEMA.md`](/home/xixil/kimi-code/zhaopin/docs/plans/dashboard-delivery/workpacks/M1_N1_WP2_SCRAPED_JOBS_SCHEMA.md)

原因只有一个：前端节点不应该再读后端源码自行猜接口，必须先由 M1 产出稳定的 DB 结构和 API 契约。

补充裁决：

- `M1_N1_WP1_REQUIREMENT_AND_SOURCE_READING.md` 不再视为“第一个开工单”。
- 对 AI 执行者而言，纯阅读摘要不是交付物，不符合“拿到开工单只需执行”。
- 阅读要求保留在各代码工作包的 `读文件/前置条件` 中，不再单独作为执行路径的起点。

### 渐进明晰原则

- 总产品 PRD 只定义目标、范围、约束，不直接作为执行单。
- 里程碑方案负责说明目标、依赖、交付边界。
- 节点方案负责说明该节点到底做哪些代码面工作。
- 工作包方案负责把任务压到“执行者只需要按文件路径和命令执行”的粒度。

### 分工维度

- 后端：M1 为主，M3 补联调支撑。
- 前端：M2 为主，M3 补扩展入口收口。
- UI：M2_N2 单独承担，不和 API/上传混写。
- 检验/测试：M1 每节点自检，M2 每节点前端冒烟，M3 做端到端与最终验收。
- 文档/合并：M1 产出契约，M3 统一收口。

### 最小改动执行原则

- 工作包只为完成当前 Dashboard 总需求服务，不预埋后续平台扩展占位代码。
- 能在现有文件内完成的改动，不额外拆新模块；只有在单文件复杂度明显失控时才拆分。
- 不允许为了”未来可能要用”而新增空文件、空 content script、占位接线。
- M3 只接入 Dashboard 入口并收口，不引入猎聘等下阶段能力。

### 导航规则（核心）

任何业务角色从 PRD 出发，通过跳转路径找到自己要做什么：

```
PRD（唯一入口）
  → 里程碑进度面板（当前到哪个里程碑，各里程碑完成状态）
    → 节点路径（各节点完成状态，跳过已完成的）
      → 业务角色导航（按角色分组：后端/前端/UI/测试/文档）
        → 工作包（直接执行）
```

**每个角色的工作流程**：
1. 打开 PRD → 看”Dashboard 进度导航”章节
2. 找到自己角色的”当前活跃任务”
3. 点击链接跳到对应节点文档
4. 在节点文档中找到自己角色分组下的工作包
5. 执行工作包，完成后勾选 `[x]`
6. 验收通过后，更新节点和里程碑的完成标记

### 状态维护规则（自底向上，顾问已确认）

状态只在最底层（工作包）通过 `[ ]`/`[x]` checkbox 维护，向上传播：

| 层级 | 标记方式 | 更新时机 | 谁更新 |
|------|---------|---------|--------|
| 工作包 | `- [ ]` / `- [x]` | 执行完成后 | **执行者** |
| 节点 | `> 状态：进行中` / `> 状态：[done]` | 该节点所有 WP 通过后 | **验收者** |
| 里程碑 | `> 状态：进行中` / `> 状态：[done]` | 该里程碑所有节点通过后 | **验收者** |
| PRD | 进度面板中标记完成状态 | 里程碑完成后 | **验收者** |

**角色权限**：
- **执行者**：只能勾选自己角色区域内的 WP checkbox，不能跨角色修改
- **验收者**：负责更新节点和里程碑的状态标记

**状态生命周期**：
- 里程碑/节点状态：`待开始` → `进行中` → `阻塞` → `[done]`

**回退规则**：
- 若节点内任一 WP 取消勾选（返工），该节点状态必须回退为 `进行中`
- 若里程碑内任一节点回退，该里程碑状态必须回退为 `进行中`

**单一事实源（SSOT）绝对规则**：

> 若各层级状态发生冲突，**一律以工作包 checkbox 为准**。
> 节点、里程碑、PRD 面板中的状态均为"人工快照"，不是事实源。
> 状态推导方向：WP checkbox 状态 → 节点状态 → 里程碑状态 → PRD 面板。

### 节点文档模板（顾问已确认）

每个节点文档必须按以下模板组织。角色区块用 markdown 标题分隔，降低多角色并行时的 Git 合并冲突。

```markdown
# 节点 Mx-Ny：标题

> 状态：进行中
> 归属里程碑：Mx
> 目标：一句话描述

## 业务角色导航

### 后端
- [ ] [WPx 标题](../workpacks/WP文件.md)

### 前端
- [ ] [WPx 标题](../workpacks/WP文件.md)

### UI
- [ ] [WPx 标题](../workpacks/WP文件.md)

### 测试/检验
- [ ] [WPx 标题](../workpacks/WP文件.md)

### 文档
- [ ] [WPx 标题](../workpacks/WP文件.md)

## 前置条件
- ...

## 边界
- ...
```

---

## 预算门禁（继承自旧体系）

每个里程碑是独立会话，各自 90 万 token 上限。

| 里程碑 | 规划值 | 预警线 | 收口线 | 超限动作 |
|--------|--------|--------|--------|----------|
| M1 后端基建 | ~250k | 400k | 550k | 停止扩需求，只完成 DB/API/CORS 主链路 |
| M2 前端实现 | ~350k | 500k | 650k | 触发拆分评估：N1 骨架 与 N2 视觉细化 |
| M3 联调收口 | ~300k | 450k | 600k | 停止新增文档扩写，优先集成测试与必要文档 |

### M2 应急拆分条件

- 浏览器视觉迭代超过 6 轮，且仍存在明显 UI 回退或样式重构需求
- `dashboard.css` 与 `dashboard.js` 同时出现大面积返工

### M2 应急拆分方式

- **B1 骨架可用版**（规划 200k / 预警 300k / 收口 400k）：hash 路由、API 对接、首页列表、第二页基本功能
- **B2 视觉精修版**（规划 250k / 预警 350k / 收口 450k）：Bento Grid 优化、Glassmorphism 细调、Toast 动效、Micro-interactions

### 节点交接规则

- 里程碑间通过**文件传递**，不透传全量日志：M1 产出 API 契约文档 → M2 读取；M2 产出 dashboard 文件 → M3 读取
- 每个里程碑预留 ~50k token 用于"上文摘要读取"和"本里程碑产物快照生成"

### 降级兼容契约

| 上游降级 | 下游影响 | 应对 |
|---------|---------|------|
| M1 API 不完整 | M2 无法对接真实数据 | M2 用 Mock 数据开发，API 契约作为接口规范 |
| M2 骨架不完整 | M3 联调失败 | M3 只验证扩展入口（manifest + popup），前端联调标记为 TODO |
