# 实施拆分方案：Dashboard Web UI + Controller 增量

> 版本：2.2 | 日期：2026-03-25
> 依据：`DIVERGENCE_DASHBOARD_AND_MULTIPLATFORM.md` v1.3（Q1-Q14 全部决策）
> 规则：每个节点以 90 万 token 为上限，包含「需求阅读 → 执行 → 检测 → 合并」完整闭环

---

## 总览

```
Node A ──────────→ Node B ──────────→ Node C
  后端基建             前端实现             联调+收口
(DB+API+CORS)    (骨架+视觉+第二页)    (扩展入口+集成+文档)
  ~250k token        ~350k token         ~300k token
```

| 节点 | 等级 | 交付物 | 预估 token | 依赖 |
|------|------|--------|-----------|------|
| Node A | P0 基础 | jobs-db.js + resume-db.js + migration V5 + 6 个 API 端点 + CORS 白名单 + API 契约文档 | ~250k | 无 |
| Node B | P0-P1 | dashboard 全套（骨架 + Bento Grid + Glassmorphism + Toast + 第二页） | ~350k | Node A 产出的 API 契约 |
| Node C | P1-P2 | manifest.json + popup 单例 + 端到端集成测试 + 文档更新 | ~300k | Node A + Node B |

**预估总消耗**：~900k token（单节点上限 90 万，三个节点均在预算内）

## 预算审阅意见（本轮）

- 这次估算方法比旧版合理，已经从“工具调用次数线性累加”切换为“源文件读入后持续驻留 + 多轮迭代放大”的级联上下文模型。
- Node A `~250k`、Node B `~350k`、Node C `~300k` 作为当前规划值是可接受的，整体仍在 3 个节点的预算边界内。
- 但 Node B 并没有逼近单节点 90 万上限，`350k / 900k ≈ 39%`，余量约 `61%`，不是“只有 55% 余量”。真正的风险不在静态额度，而在浏览器视觉迭代轮次失控。
- 因此预算管理不应只写估算表，还应增加“检测阈值 + 应急拆分触发条件”。

## token 预算检测方案

### 检测原则

- 每个节点都记录 4 类开销：需求阅读、代码阅读/修改、验证/测试、返工迭代。
- 一旦进入浏览器视觉反复调参或端到端修复阶段，按“轮次”而不是“单次调用”评估预算消耗。
- 预算检测在节点内持续进行，不等到节点结束才复盘。

### 节点内预警阈值

| 节点 | 规划值 | 预警线 | 强制收口线 | 超限动作 |
|------|--------|--------|------------|----------|
| Node A | ~250k | 400k | 550k | 停止扩需求，只完成 DB/API/CORS 主链路 |
| Node B | ~350k | 500k | 650k | 触发拆分评估：B1 骨架/功能 与 B2 视觉细化 |
| Node C | ~300k | 450k | 600k | 停止新增文档扩写，优先集成测试与必要文档 |

### Node B 应急拆分条件

- 浏览器视觉迭代超过 6 轮，且仍存在明显 UI 回退或样式重构需求
- `dashboard.css` 与 `dashboard.js` 同时出现大面积返工，影响骨架稳定性
- 为修视觉问题反复触碰 API 契约或 DOM 结构，导致 Node B 不再是“纯前端节点”

### Node B 应急拆分方式

- B1：骨架可用版（规划 200k / 预警 300k / 收口 400k）
  内容：hash 路由、API 对接、首页列表、第二页基本功能、可用但不精修的样式
- B2：视觉精修版（规划 250k / 预警 350k / 收口 450k）
  内容：Bento Grid 优化、Glassmorphism 细调、Toast 动效、Micro-interactions、细节 polish

### 上下文隔离策略

- Node A/B/C 是**独立会话**，各自清空上下文，不共享 90 万上限
- 节点间通过**文件传递**：Node A 产出 API 契约文档 → Node B 读取；Node B 产出 dashboard 文件 → Node C 读取
- 每个节点规划预算中预留 ~50k token 用于"上文摘要读取"和"本节点产物快照生成"

### 收口线的绝对阻断逻辑

触碰收口线后执行标准动作：
1. **停止一切修复和迭代**，严禁继续写代码
2. **保存当前最佳可用代码**（即使不完美）
3. **生成降级说明**（哪些功能已完成、哪些被砍、已知的遗留问题）
4. **执行合并门禁**（git commit + 工作树干净）
5. 利用剩余缓冲带（收口线 → 90 万上限之间）完成上述动作

### 降级兼容契约

| 上游降级 | 下游影响 | 应对 |
|---------|---------|------|
| Node A API 不完整 | Node B 无法对接真实数据 | Node B 用 Mock 数据开发，API 契约作为接口规范 |
| Node B 骨架不完整 | Node C 联调失败 | Node C 只验证扩展入口（manifest + popup），前端联调标记为 TODO |

### 节点完成时的预算复盘

- 记录本节点实际消耗区间，而不是只记“通过/未通过”
- 记录最大开销项是“源码驻留”“视觉迭代”还是“端到端修复”
- 如果某节点实际消耗超过规划值 50%，下一节点必须先重估再开工

## 为什么从 7 节点合并为 3 节点

1. **上下文重建开销**：server.js(982行) + db.js(961行) 合计约 2000 行(~25k token)，远不到 90 万上限；7 个节点意味着重复 7 次读取需求文档和源文件
2. **信息丢失风险**：节点越多，交接处越容易丢失上下文（DOM 结构、CSS 变量名、函数签名等）
3. **前端连贯性**：Dashboard 的骨架、视觉、第二页高度耦合（共享 CSS 变量、DOM 结构、JS 模块），拆开反而增加不一致风险
4. **前端不依赖后端源码**：Node B 只需 Node A 产出的 API 契约文档，不需要 server.js/db.js 源码

## 审阅意见汇总

- 90 万 token 是每节点上限，不是目标值；核心价值是降低认知负载和回滚成本
- 实现路径统一落在 `crawler/extension/` 目录下，避免和现有 MV3 包结构冲突
- "合并"门禁：检测通过 + 前序不回归 + 工作树干净 + 提交信息清晰
- Node A 必须产出标准化 API 契约文档，作为 Node B 的唯一后端输入
- token 预算要动态检测，不只写静态估算；Node B 是视觉迭代风险点，但当前仍未接近单节点 90 万上限

---

## Node A：后端基建（DB + API + CORS）

### 需求阅读（~25k token）

| 文件 | 读取目的 |
|------|---------|
| `DIVERGENCE_DASHBOARD_AND_MULTIPLATFORM.md` Q10/Q12/Q13 | 表结构、端点、CORS |
| `controller/db.js`（961 行） | migration 机制、PRAGMA、模块导出风格 |
| `controller/server.js`（982 行） | 路由风格、setCORS、body 解析 |
| `controller/package.json` | 现有依赖 |

### 执行清单

#### A1: DB 层

- [ ] **创建 `controller/jobs-db.js`**
  - `initJobsTable(db)` — CREATE TABLE IF NOT EXISTS scraped_jobs（Q10 完整 SQL + 索引）
  - `insertJob(db, job)` — INSERT OR REPLACE（UNIQUE(platform, platformJobId)）
  - `insertJobsBatch(db, jobs)` — 事务内批量插入
  - `getAllJobs(db, {platform, keyword})` — 列表查询，支持过滤
  - `getJobById(db, id)` — 单条查询
  - `updateSelected(db, id, selected)` — 更新 selected 状态
  - `getSelectedJobs(db)` — WHERE selected = true
  - `clearUnselected(db)` — DELETE WHERE selected = false
  - `clearAllSnapshot(db)` — 全量清空
  - `getSnapshotStats(db)` — 统计数据量
  - `recoverSelectedJobs(db, insertFn)` — 崩溃恢复（INSERT OR IGNORE 幂等）

- [ ] **创建 `controller/resume-db.js`**
  - `initResumeTable(db)` — resumes 表（id, file_path, original_name, uploaded_at, size_bytes）
  - `saveResume(db, {filePath, originalName, sizeBytes})`
  - `getCurrentResume(db)`
  - `deleteResume(db, id)`

- [ ] **修改 `controller/db.js`**
  - SCHEMA_VERSION 4 → 5
  - 新增 `migrateToV5(db)`
  - 新增 PRAGMA：`auto_vacuum = INCREMENTAL`
  - 导出新增函数

#### A2: API 层

- [ ] **安装 formidable**：`cd controller && npm install formidable`

- [ ] **修改 setCORS**：签名改为 `setCORS(req, res)`，动态白名单正则

- [ ] **新增 6 个 Handler 函数**
  - `handleGetJobs` — GET /api/jobs
  - `handleGetJobDetail` — GET /api/jobs/detail?id=N
  - `handleSelectJob` — POST /api/jobs/select
  - `handleResumeUpload` — POST /api/resume/upload
  - `handleGetResume` — GET /api/resume
  - `handleGetDeliveryList` — GET /api/delivery/selected

- [ ] **注册路由**：精确匹配风格，if/else 中仅调用 Handler

#### A3: API 契约文档（Node B 的唯一后端输入）

- [ ] **创建 `docs/plans/DASHBOARD_API_CONTRACT.md`**
  - 每个端点的 pathname、method、请求参数、响应格式
  - 错误码定义
  - CORS 配置说明
  - 文件上传说明（FormData 字段名）
  - 不包含 server.js 源码

### 检测

- [ ] Controller 启动无报错，自动迁移到 V5
- [ ] `curl GET http://127.0.0.1:7893/api/jobs` → `[]`
- [ ] `curl POST http://127.0.0.1:7893/api/jobs` — 插入测试数据
- [ ] `curl GET http://127.0.0.1:7893/api/jobs/detail?id=1` → 返回数据
- [ ] `curl POST http://127.0.0.1:7893/api/jobs/select` — 更新 selected
- [ ] `curl -F "file=@test.pdf" http://127.0.0.1:7893/api/resume/upload` → 200
- [ ] `curl GET http://127.0.0.1:7893/api/resume` → 简历信息
- [ ] CORS：非白名单 origin 被拒绝
- [ ] 现有端点（/api/status, /api/tasks 等）不受影响
- [ ] `recoverSelectedJobs` 幂等验证
- [ ] API 契约文档与实际端点一致

### 合并门禁

- 本节点检测全部通过
- 迁移结果可重复执行
- API 契约文档已产出且与代码一致
- 工作树干净
- git commit：`feat(backend): add scraped_jobs table, 6 dashboard endpoints, dynamic CORS whitelist`

---

## Node B：前端实现（骨架 + 视觉 + 第二页）

### 需求阅读（~20k token）

| 文件 | 读取目的 |
|------|---------|
| `DIVERGENCE_DASHBOARD_AND_MULTIPLATFORM.md` Q2/Q3/Q4/Q11 | Grid、Glass、第二页、文件结构 |
| `docs/plans/DASHBOARD_API_CONTRACT.md`（Node A 产出） | API 契约（替代 server.js/db.js 源码） |
| `crawler/extension/manifest.json` | MV3 CSP 限制 |

### 执行清单

#### B1: 骨架 + API 层

- [ ] **创建 `crawler/extension/dashboard.html`**
  - ESM 入口 `<script type="module" src="dashboard.js">`
  - 两个主容器 `#view-home` / `#view-resume`
  - 顶部导航栏

- [ ] **创建 `crawler/extension/dashboard.css`**
  - CSS 变量：8 色值（rgb(43,44,48) / rgb(240,239,235) / rgb(159,35,54) / rgb(151,99,124) / rgb(42,93,105) / rgb(85,84,59) / rgb(148,138,118) / rgb(100,102,103)）
  - 基础 reset + 全局排版
  - 导航栏 + view 容器布局
  - 响应式基础（1024px+）

- [ ] **创建 `crawler/extension/dashboard.js`**
  - hash 路由（`hashchange` 事件）
  - `renderJobGrid(jobs)` / `createJobCard(job)`
  - `openModal(job)` / `closeModal()`
  - `showToast(message, type)`
  - 导出 initDashboard

- [ ] **创建 `crawler/extension/dashboard-api.js`**
  - `const API_BASE = 'http://127.0.0.1:7893'`
  - 6 个 fetch 封装函数（对应 API 契约）
  - 统一错误处理

#### B2: 主页视觉

- [ ] **Bento Grid**（dashboard.css）
  - CSS Grid 布局，卡片容器 `.job-grid`
  - `.job-card` 基础 + `.job-card--featured` 大卡片变体
  - 平台标签固定色值

- [ ] **Glassmorphism 浮窗**（dashboard.css + dashboard.js）
  - `.modal-overlay` 遮罩
  - `.modal-content`：`backdrop-filter: blur(20px) saturate(150%)`，rgba(43,44,48,0.7)
  - CSS 伪元素噪点纹理
  - 内容：标题、公司、薪资、描述、跳转链接、"加入待投递"按钮
  - 关闭：ESC + 遮罩点击 + 关闭按钮

- [ ] **Toast**（dashboard.css + dashboard.js）
  - `.toast-container` 固定右上角
  - 滑入动画（@keyframes slideIn），3 秒自动消失

- [ ] **Micro-interactions**（dashboard.css）
  - 卡片 hover：上浮 + 阴影加深（200-300ms ease-out）
  - 按钮 hover：背景色 + 微缩放
  - 所有可点击元素有过渡效果

#### B3: 第二页

- [ ] **创建 `crawler/extension/dashboard-resume.js`**
  - `initResumeView()` / `loadResume()` / `handleResumeUpload(file)` / `loadDeliveryList()`

- [ ] **简历管理区域**（左侧 `.resume-panel`）
  - 拖拽上传区域
  - 当前简历显示（文件名、大小、时间）
  - "重新上传"按钮
  - "在线编辑"灰色占位

- [ ] **待投递列表**（右侧 `.delivery-panel`）
  - `<details>` / `<summary>` 内联展开
  - "取消选择"按钮

- [ ] **AI 占位**
  - "AI 智能匹配"灰色按钮

### 检测

- [ ] Chrome 加载扩展，Dashboard 打开无 CSP 报错
- [ ] hash 路由切换正常
- [ ] Bento Grid 1024px+ 正常排列
- [ ] 卡片 hover 微交互生效
- [ ] Glassmorphism 浮窗打开/关闭正常，背景模糊可见
- [ ] "加入待投递"按钮显示 Toast
- [ ] 简历拖拽上传成功
- [ ] 待投递列表 `<details>` 展开收起正常
- [ ] AI 按钮、在线编辑按钮为灰色禁用态
- [ ] 色值符合 8 色规范
- [ ] 控制台无 JS 错误

### 合并门禁

- 本节点检测全部通过
- 不依赖后端源码（仅通过 API 契约交互）
- 工作树干净
- git commit：`feat(dashboard): implement Bento Grid, Glassmorphism, Toast, resume page`

---

## Node C：联调 + 收口（扩展入口 + 集成测试 + 文档）

### 需求阅读（~30k token）

| 文件 | 读取目的 |
|------|---------|
| `DIVERGENCE_DASHBOARD_AND_MULTIPLATFORM.md` Q5/Q14 | manifest、popup 注册 |
| `crawler/extension/manifest.json` | 现有配置 |
| `crawler/extension/popup.html` + `popup.js` | 现有 popup 结构 |
| `PROJECT_MASTER_HANDOFF.md` | 需更新 |
| `docs/BACKEND_ENTRY.md` | 需更新 |
| `docs/FRONTEND_ENTRY.md` | 需更新 |
| `CURRENT_PRIORITY.md` | 需更新 |
| `PROJECT_PRODUCT_STATUS.md` | 需更新 |

### 执行清单

#### C1: 扩展入口

- [ ] **修改 `crawler/extension/manifest.json`**
  - `host_permissions` 新增 `"http://127.0.0.1:7893/*"`
  - `content_scripts` 新增猎聘条目（占位）
  - 创建 `crawler/extension/liepin_content.js` 空文件

- [ ] **修改 `crawler/extension/popup.html`**
  - 新增"打开工作台"按钮

- [ ] **修改 `crawler/extension/popup.js`**
  - 单例模式：`chrome.tabs.query` → 已打开则聚焦，否则新建
  - 打开后 `window.close()`

#### C2: 端到端集成测试

- [ ] 启动 Controller
- [ ] 通过 popup 打开 Dashboard
- [ ] 验证首页空态渲染
- [ ] 通过 API 插入测试数据，验证 Grid 渲染
- [ ] 点击卡片 → Glassmorphism 浮窗
- [ ] "加入待投递" → Toast
- [ ] 切换第二页 → 上传简历 → 查看列表
- [ ] 刷新页面 → hash 路由恢复
- [ ] 单例模式：重复点击不创建新标签

#### C3: 文档更新

- [ ] **更新 `docs/BACKEND_ENTRY.md`**
  - scraped_jobs 表结构
  - 6 个 API 端点
  - CORS 白名单
  - formidable 简历上传

- [ ] **更新 `docs/FRONTEND_ENTRY.md`**
  - Dashboard 文件结构
  - hash 路由 + Sidecar 模式
  - popup 单例按钮

- [ ] **更新 `PROJECT_MASTER_HANDOFF.md`**
  - Phase UI 技术栈和验收状态

- [ ] **更新 `CURRENT_PRIORITY.md` + `PROJECT_PRODUCT_STATUS.md`**
  - Phase UI 完成标记

### 检测

- [ ] 扩展加载无报错
- [ ] popup 单例逻辑正确
- [ ] 端到端流程通过
- [ ] 文档无死链接
- [ ] 文档描述与代码一致
- [ ] git log 显示 3 个清晰的 commit（Node A/B/C 各一个）

### 合并门禁

- 所有前序节点依赖完成
- 集成测试通过
- 文档与代码一致
- 工作树干净
- git commit：`feat(extension): update manifest and popup; docs: update BACKEND_ENTRY, FRONTEND_ENTRY, MASTER_HANDOFF`

---

## 附录：token 预算详细估算

### 估算模型说明

采用**级联上下文模型**（非线性求和），考虑：
- 每次工具调用的结果会驻留在对话历史中
- 大文件一旦读入，后续每轮都携带（直到压缩触发）
- 代码修改通常需要 2-3 轮迭代（写 → 测 → 修）
- 系统自动压缩会在上下文接近上限时生效（压缩率约 40-50%）
- 系统提示 + CLAUDE.md ≈ 15k token（每次请求都携带）

### Node A：后端基建（~250k）

| 阶段 | 操作 | 预估 token | 说明 |
|------|------|-----------|------|
| 读需求 | DIVERGENCE(233行) | ~8k | 含工具开销 + 后续驻留 |
| 读设计 | Q10/Q12/Q13 摘要 | ~3k | 从 DIVERGENCE 中提取 |
| 读源码 | db.js(961行) + server.js(982行) | ~55k | 两张大文件，驻留到会话结束 |
| 读配置 | package.json | ~2k | 小文件 |
| 执行-写 | jobs-db.js(300行) + resume-db.js(100行) | ~25k | 新文件写入 + 迭代修正 |
| 执行-改 | db.js(50行改动) + server.js(200行改动) | ~40k | 多次 Edit + 验证改动正确性 |
| 执行-装 | npm install formidable | ~5k | |
| 执行-写 | API 契约文档(100行) | ~5k | |
| 验证 | curl 10次 + 调试修复 | ~50k | 验证失败后的修复循环（预估 2-3 轮） |
| 推送 | git status/diff/commit | ~10k | |
| 累积开销 | 30 轮工具调用的上下文增长 | ~47k | 级联效应（非 30k 线性叠加） |
| **合计** | | **~250k** | |

### Node B：前端实现（~350k）

| 阶段 | 操作 | 预估 token | 说明 |
|------|------|-----------|------|
| 读需求 | DIVERGENCE Q2/Q3/Q4/Q11 | ~5k | 不读 server.js/db.js |
| 读设计 | API 契约文档(100行) | ~3k | Node A 产出，替代后端源码 |
| 读配置 | manifest.json(31行) | ~1k | |
| 执行-写 | dashboard.html(80行) | ~8k | 新文件 |
| 执行-写 | dashboard.css(400行) | ~50k | **最大开销项**：Grid+Glass+Toast+Micro+两页 |
| 执行-迭代 | CSS 视觉调整 | ~80k | 写完 → 浏览器验证 → 调整（预估 5-8 轮） |
| 执行-写 | dashboard.js(200行) | ~20k | 主逻辑 + hash 路由 + 模块交互 |
| 执行-写 | dashboard-api.js(80行) | ~8k | |
| 执行-写 | dashboard-resume.js(100行) | ~10k | 第二页逻辑 |
| 验证 | 加载扩展 + 控制台检查 | ~40k | 视觉验证 + JS 错误修复（预估 3-5 轮） |
| 推送 | git commit | ~10k | |
| 累积开销 | 35 轮工具调用的上下文增长 | ~60k | CSS 迭代导致轮次较多 |
| **合计** | | **~295k → 取整 ~350k** | |

### Node C：联调 + 收口（~300k）

| 阶段 | 操作 | 预估 token | 说明 |
|------|------|-----------|------|
| 读需求 | DIVERGENCE Q5/Q14 | ~3k | |
| 读源码 | popup.html(310行) + popup.js(284行) | ~20k | |
| 读文档 | MASTER_HANDOFF(393行) + BACKEND(61行) + FRONTEND(55行) + PRIORITY(100行) + STATUS(150行) | ~35k | 5 个文档需要更新 |
| 执行-改 | manifest.json + popup.html + popup.js | ~20k | 修改 + 验证 |
| 执行-创建 | liepin_content.js(1行) | ~2k | |
| 执行-写 | 更新 4 个文档 | ~40k | 每个 ~10k（写 + 读现有内容 + 改） |
| 验证 | 端到端测试 + 修复 | ~60k | 全流程测试 + 发现问题后修复（预估 3-5 轮） |
| 推送 | git commit | ~10k | |
| 累积开销 | 25 轮工具调用的上下文增长 | ~40k | |
| 读前端 | dashboard.html/css/js（验证用） | ~30k | 需要检查前端产出 |
| **合计** | | **~260k → 取整 ~300k** | |

### 汇总

| 方案 | 节点数 | 预估总 token | 单节点最大 | 安全余量 |
|------|--------|-------------|-----------|---------|
| v1.0（7 节点） | 7 | ~830k（线性模型，严重低估） | ~175k | 上下文重建 7 次 |
| **v2.1（3 节点）** | **3** | **~900k（级联模型）** | **~350k** | **Node B 最大，距上限 55%** |

### 风险点

- **Node B 是瓶颈**：CSS 视觉迭代是 token 消耗最大的环节（写 400 行 CSS + 5-8 轮浏览器验证调整）。如果 CSS 复杂度超预期，可能逼近上限。
- **Node C 文档更新**：需要读 5 个文档 + 写 4 个文档，文档量本身不大但轮次多。
- **缓解措施**：如果 Node B 超预算，可将 CSS 视觉迭代拆为独立节点（Node B1 骨架 + Node B2 视觉），但这会增加上下文重建开销。

## 附录：执行图

```
时间线 →

Node A [后端基建]     ████████████
                      ↓ 输出 API 契约文档
Node B [前端实现]               ██████████████████████
                               ↓ 产出 dashboard 全套
Node C [联调+收口]                                        ████████████████████
```

---

> **注意**：本文档（Node A/B/C 体系）已被 `docs/plans/dashboard-delivery/` 下的三级开工体系（M1/M2/M3 + nodes + workpacks）取代。
> 以下为开工体系审查过程中发现的未统一问题。

---

# 开工体系审查问题记录

> 日期：2026-03-25
> 审查范围：`docs/plans/dashboard-delivery/` 全部文档
> 审查方法：本地 AI 独立审查 + 上级顾问逐项讨论

## 已达成共识的问题

以下问题已与上级顾问讨论并达成统一，无需进一步决策：

1. **两套规划体系并行** → 废弃本文档（Node A/B/C），新体系完全接管。预算门禁继承到新体系 README。
2. **Q11 文件路径不一致** → Q11 的 `crawler/dashboard.*` 为笔误，正确路径为 `crawler/extension/dashboard.*`。
3. **M2/M3 里程碑过于简略** → 保持简洁，补充"核心依赖"和"宏观交付边界"（Out-of-Scope），30 行以内。执行 M(n) 最后一个节点时负责扩充 M(n+1)。
4. **预算门禁未传递** → 在新体系 README 中增加预算门禁章节，映射关系：M1≈NodeA, M2≈NodeB, M3≈NodeC。
5. **M1_N2/M1_N3 和 M2/M3 工作包缺失** → 已全部补全（共 26 个工作包文件）。

---

## 审查裁决（2026-03-25）

本轮对 `docs/plans/dashboard-delivery/` 的三级开工体系做了二次把关，裁决原则只有两条：

1. 开工单必须满足“执行者拿到后只需要执行”
2. 必须遵守最小改动原则，只完成当前 Dashboard 总需求，不预埋下阶段能力

### 裁决 1：废弃 `M1_N1_WP1` 作为独立工作包

结论：采用原问题中的**方案 A**。

原因：

- `M1_N1_WP1` 是纯阅读/摘要任务，不是“读文件 → 改代码 → 验收”的执行单。
- 对 AI 执行者而言，阅读摘要复用价值低，反而会把执行路径起点变成非交付型任务。
- 阅读要求应下沉到具体代码工作包的 `前置条件/读文件` 中，而不是单独占一个工作包编号。

落地调整：

- `README.md` 中“第一个工作包”改为 `M1_N1_WP2_SCRAPED_JOBS_SCHEMA.md`
- `M1_N1_DB_SCHEMA_AND_MIGRATION.md` 中移除 WP1 路径
- `M1_N1_WP1_REQUIREMENT_AND_SOURCE_READING.md` 删除，不再作为执行路径组成部分

### 裁决 2：回收超出本期范围的预埋改动

审查发现新体系里仍有两类不符合最小改动原则的倾向，已收口：

1. **预埋下阶段平台能力**
   - `M3_N1_WP1` 原先要求在 manifest 中新增猎聘 content script，并创建空的 `liepin_content.js`
   - 这不属于当前 Dashboard 交付范围，会增加权限面和后续维护噪音
   - 已裁决删除，只保留 Dashboard 所需的 `http://127.0.0.1:7893/*` host permission

2. **过早模块拆分**
   - `M2` 多个工作包原先默认允许新增 `dashboard-resume.js`，并在文档中写入 `Sidecar` 之类实现口径
   - 这会诱导执行者先做架构拆分，再做需求闭环
   - 已裁决改为：默认在 `dashboard.js` 内完成；只有复杂度明显失控时才拆模块，且拆后同步更新文档

### 当前推荐执行路径

总产品 PRD
→ 里程碑 M1：后端基建
→ 节点 M1_N1：DB Schema 与 Migration
→ 第一个可执行工作包 `M1_N1_WP2_SCRAPED_JOBS_SCHEMA.md`

这样处理后，三级体系仍然保留，但执行起点已经收敛为真正可开工的代码单，符合“方便 AI agent 连续执行”的目标。

说明：

- 本文档前半部分保留的 Node A/B/C 内容仅作为历史审阅记录。
- 其中涉及 `dashboard-resume.js`、`liepin_content.js`、`Sidecar` 的旧表述，不再作为当前执行依据。
- 当前执行、交流、继续细化工作包时，应以 `docs/plans/dashboard-delivery/` 下的新三级体系和本裁决段为准。

## v1.2 导航与状态规则复审结论（2026-03-25）

### 结论

**暂不同意直接定版。**

原因不是三级结构有问题，而是 v1.2 新增的“导航/状态维护”层里还有 3 处会误导执行者的地方。若现在直接固化，后续细化工作包时会出现“入口正确但状态失真”的问题。

### 不同意的原因

#### 1. PRD 超出了“只保留里程碑级状态”的边界

你们在第 3 轮讨论里已经定过：

- PRD 只含里程碑级状态
- 节点文档按角色分组 WP
- SSOT 在 WP checkbox 层

但当前 `PROJECT_PRD.md` 的 2.5 节除了里程碑进度面板，还新增了“各角色当前活跃任务”表，这已经把节点层的任务导航重新抬回 PRD 了。

这会带来两个问题：

1. **与既定导航架构冲突**
   - PRD 本应只告诉执行者“现在到哪个里程碑”
   - 角色级活跃任务应该留在节点文档，不应再次在 PRD 维护一份

2. **表内状态不真实**
   - 当前把“测试”写成 `M1-N1 WP4: DB 自检`
   - 但 WP4 的前置条件显然依赖 WP2/WP3 先完成，所以它并不是“当前活跃任务”
   - UI / 前端 / 文档行也都写着“待 M1 完成后开始”，这说明这些并不是活跃任务，而是排队任务

**希望的改动方案**：

- 把 PRD 2.5 节收回到“只保留里程碑进度面板 + README 跳转入口”
- 删除“各角色当前活跃任务”表
- 如果确实想保留角色视角，应改为 README 或节点文档内的导航，不放在 PRD

#### 2. SSOT 规则还不够硬，存在多层状态漂移风险

README 里已经写了“状态只在最底层工作包 checkbox 维护”，这是对的。  
但当前节点、里程碑、PRD 仍然各自保存一份 `状态：进行中/待开始/[done]`，并且没有把“冲突时谁说了算”写成硬规则。

这会导致：

- 工作包 checkbox 已完成，但节点头部还是“待开始”
- 节点已 `[done]`，PRD 面板还停留在“进行中”
- 执行者不知道该信哪一层

**希望的改动方案**：

- 在 `docs/plans/dashboard-delivery/README.md` 明确补一句：
  - “若上层状态与工作包 checkbox 冲突，一律以工作包 checkbox 为准”
- 将节点/里程碑/PRD 的状态描述统一定义为“人工快照，不是事实源”
- 后续若不做自动同步脚本，就不要把上层状态写成强事实语气

#### 3. 节点模板与实际落地不完全一致

你们刚新增了“节点模板”，目的是让多角色并行时结构稳定、低冲突。  
但实际节点文档里已经出现模板偏移：

- `M3_N2_E2E_DOCS_AND_MERGE.md` 里出现了两个 `### 测试/检验` 区块
- 这会让角色导航层的结构不稳定，也削弱“按固定角色分组找工作包”的价值

这不是大问题，但它说明模板还没有真正成为约束。

**希望的改动方案**：

- 所有节点文档统一为“每个角色只出现一次”
- `M3_N2` 应合并为：
  - `### 测试/检验` 下同时列出 WP1、WP3
  - `### 文档` 下列出 WP2

### 我的建议态度

我同意继续沿用这套三级体系，不建议回退。  
但我不同意把 v1.2 现状直接视为定版，建议先完成下面 3 个收口动作，再进入“逐个细化工作包”的阶段：

1. PRD 删掉“各角色当前活跃任务”表，只保留里程碑面板
2. README 把 “WP checkbox 是唯一事实源” 写成绝对规则
3. 节点文档按模板统一一遍，先修 `M3_N2` 的重复角色区块

完成这 3 项后，我会认为导航层已经足够稳，可以继续做工作包细化。

---

## v1.2 导航与状态规则复审回应（2026-03-25）

### 结论

同意专家全部 3 个判断，已完成 3 项收口动作。

### 收口动作 1：PRD 删除角色活跃任务表

**问题**：PRD 新增了"各角色当前活跃任务"表，超出"PRD 只含里程碑级状态"的边界。且表内状态不真实（WP4 依赖 WP2/WP3 但被标为"当前活跃"，UI/前端/文档均为排队任务非活跃任务）。

**执行**：已从 `PROJECT_PRD.md` 2.5 节删除"各角色当前活跃任务"表。PRD 现在只保留里程碑进度面板和 README 跳转入口。角色级任务导航留在节点文档内（通过"业务角色导航"区块）。

### 收口动作 2：README 补 SSOT 绝对规则

**问题**：WP checkbox、节点状态、里程碑状态、PRD 面板各自保存状态，没有"冲突时谁说了算"的硬规则，存在状态漂移风险。

**执行**：已在 `README.md` 状态维护规则章节增加"单一事实源（SSOT）绝对规则"：

> 若各层级状态发生冲突，**一律以工作包 checkbox 为准**。
> 节点、里程碑、PRD 面板中的状态均为"人工快照"，不是事实源。
> 状态推导方向：WP checkbox 状态 → 节点状态 → 里程碑状态 → PRD 面板。

### 收口动作 3：M3_N2 合并重复角色区块

**问题**：`M3_N2_E2E_DOCS_AND_MERGE.md` 出现两个"### 测试/检验"区块，违反"每个角色只出现一次"的模板约束。

**执行**：已合并为单一"### 测试/检验"区块，WP1（端到端检测）和 WP3（最终合并门禁）归入该区块，"### 文档"区块只保留 WP2（文档更新）。每个角色在节点内只出现一次。

### 当前状态

- 3 个收口动作全部完成并验证通过
- 导航层已收口，可以进入"逐个细化工作包"阶段
