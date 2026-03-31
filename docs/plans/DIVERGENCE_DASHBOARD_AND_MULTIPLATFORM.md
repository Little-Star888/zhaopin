# 方案决策与待讨论：Dashboard Web UI + 多平台扩展

> 版本：1.3 | 日期：2026-03-25
> 状态：**两轮决策 + 专家修订均已完成**

---

## A. 用户核心需求

1. Chrome 扩展弹出独立 Web UI 工作台（dashboard.html）
2. 主页：Bento Grid 展示岗位卡片（名称、城市、平台、关键词、AI匹配度占位），卡片大小有对比
3. 点击卡片：Glassmorphism 浮窗（强模糊 + 噪点纹理），展示详情 + 跳转链接 + "加入待投递"按钮
4. 第二页：左侧简历管理（上传 + 将来在线编辑），右侧待投递岗位列表（内联展开详情）
5. 交互：Toast 替代 alert，所有可点击元素有 Micro-interactions
6. 色值：rgb(43,44,48) / rgb(240,239,235) / rgb(159,35,54) / rgb(151,99,124) / rgb(42,93,105) / rgb(85,84,59) / rgb(148,138,118) / rgb(100,102,103)
7. 四平台采集：Boss + 猎聘 + 51job + 智联
8. 爬取模式支持两种：全平台爬取、固定单平台爬取
9. 每次爬取结束后清空“本轮岗位快照数据”并重写，降低内存和硬盘占用；接受岗位变化快、历史数据非强保留

## B. 硬约束

- 纯 HTML/CSS/JS，零构建工具、零框架依赖
- Sidecar 模式（独立全屏标签页），popup 只加"打开工作台"按钮
- 不改动 background.js 现有采集链路
- Dashboard 直接调 Controller API（127.0.0.1:7893），不经过 background.js
- AI 评分本期只做接口占位，MatchInfo 契约：`{matchScore: number|null, matchStatus: 'not_ready'|'pending'|'done'|'failed', matchReason: string|null, matchUpdatedAt: string|null}`
- 猎聘先走 Chrome 扩展 PoC，51job/智联先做可行性探测
- 简历存原文件（Controller 侧本地），不做 base64
- 方案设计需考虑未来迁移到 Windows：路径、脚本、启动方式尽量保持跨平台兼容，并预留一键安装方案
- SQLite 按“当前轮结果缓存”设计，不按长期归档设计；岗位失效快，允许每轮结束清空 `scraped_jobs` 后重写，但**不清空**简历、配置、投递队列等非快照数据

## C. 顾问协作备忘

1. **sync_context 无效**：顾问无法读取上传文件，所有信息必须直接写入 `answers_to_questions`（500 字以内）
2. **采纳架构方向，校验细节**：顾问行号/色值/API 细节常错，本地验证后再用
3. **主动收边界**：顾问倾向扩大范围，每次对照用户需求裁剪
4. **框架引入倾向**：已明确零构建零框架，再推 React/Vue 直接拒绝
5. **表达绝对化**：将"坚决走 X"翻译为"在条件 A 下推荐 X"
6. **最佳对话方式**：每次只问 1 个聚焦问题，信息压缩到 200 字以内，一次性提供所有上下文（包括数据库类型、量级、约束条件）
7. **multer 陷阱**：顾问在 Q12 中推荐了 multer，但 multer 依赖 Express 中间件模型，不能在原生 http 模块中使用；正确选型是 formidable 或 busboy
8. **正则路由反模式**：在原生 http 模块中用正则做 RESTful 路径匹配是反模式，应保持精确匹配 + query/body 传参
9. **CORS `*` 有安全风险**：即使单机部署，`Access-Control-Allow-Origin: *` 也允许公网恶意网页读取本地 API；应改为动态白名单

## D. 第一轮已决策（Q1-Q9）

> 完整决策记录见 `docs/plans/DIVERGENCE_DASHBOARD_AND_MULTIPLATFORM_v1.md`

| 项 | 结论 |
|----|------|
| Q1 API | 新增 `scraped_jobs` 浏览表，与 `delivery_queue` 分离；简历存原文件，数据库仅存路径；单份简历 |
| Q2 Grid | CSS Grid 明确列规则；大卡片绑"最近入库/已选中"；兼容 1024px+；平台用文字标签+固定色值 |
| Q3 Glass | `blur(20px) saturate(150%)`，rgba(43,44,48,0.7)；CSS 伪元素噪点；ESC+遮罩关闭；含"加入待投递"按钮 |
| Q4 第二页 | 显式点击加入（不自动）；`<details>` 内联展开；单份简历+预留编辑入口；AI按钮灰色占位 |
| Q5 manifest | content_scripts 静态注册；每平台独立条目；host_permissions 逐步加 |
| Q6 路由 | 方案 A 配置字典过渡，按平台收口到配置和少量函数 |
| Q7 城市 | Controller 端统一 city_mapping.json |
| Q8 猎聘 | 先做手动页面分析再写代码，PoC 分两步 |
| Q9 文档 | 优先更新 MASTER_HANDOFF 和 BACKEND_ENTRY |
| Q10 表结构 | 快照表，自增 id + UNIQUE(platform, platformJobId)，核心列 + raw_payload；清空仅限 scraped_jobs 且条件清理（`WHERE selected=false`）；原子事务 + 崩溃恢复；定期 VACUUM |
| Q11 文件结构 | 单 HTML + hash 路由，ESM 模块拆分（dashboard.html/css/js/api.js） |
| Q12 API 实现 | 路由不拆，Handler 函数抽离；DB 按领域拆（jobs-db.js）；multipart 用 formidable；路由保持精确匹配，ID 通过 query/body 传递 |
| Q13 Sidecar | 只连 Controller，CORS 改为动态白名单正则（匹配 chrome-extension:// + localhost），manifest 加 localhost host_permissions |
| Q14 注册 | 保留 default_popup，chrome.tabs.create + 单例模式，不注册 options_page |

---

## E. 第二轮已决策（Q10-Q14）

### Q10：scraped_jobs 表结构设计 ✅

Q1 决定新增 `scraped_jobs` 表，需要确定具体字段。

**决策**：采用”当前轮快照表”设计，核心列 + raw_payload 折中方案。

**建表 SQL**：

```sql
CREATE TABLE IF NOT EXISTS scraped_jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    platform TEXT NOT NULL,
    platformJobId TEXT NOT NULL,
    title TEXT NOT NULL,
    company TEXT NOT NULL,
    location TEXT,
    url TEXT,
    keywords TEXT,
    salary TEXT,
    experience TEXT,
    education TEXT,
    match_status TEXT DEFAULT 'not_ready',
    selected BOOLEAN DEFAULT 0,
    crawl_batch_id TEXT,
    crawl_mode TEXT,
    job_alive_status TEXT DEFAULT 'unknown',
    raw_payload TEXT,
    crawled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(platform, platformJobId)
);

CREATE INDEX IF NOT EXISTS idx_scraped_jobs_status
    ON scraped_jobs(match_status, selected);
```

**关键设计点**：
- 主键：自增 `id`（对内稳定） + `UNIQUE(platform, platformJobId)`（对外去重）
- 核心字段独立列，平台差异字段放 `raw_payload`（TEXT JSON）
- `selected` 布尔字段跟随快照表清空，已投递记录进入独立的 `delivery_queue`
- `delivery_queue` **不得**使用 `scraped_jobs.id` 作外键，必须冗余 `platform` + `platformJobId`
- `job_alive_status` 本轮仅预留（default 'unknown'），不实现跨轮对比
- 清空范围仅限 `scraped_jobs` 快照表，不做整库清空；否则会误伤简历路径、配置和待投递数据
- **清空策略**：不做无条件全表 DELETE，改为条件清理 `DELETE FROM scraped_jobs WHERE selected = false`；`selected=true` 的记录在成功进入 `delivery_queue` 后再删除（原子事务）
- **崩溃恢复**：每轮开始前先检查 `SELECT * FROM scraped_jobs WHERE selected = true`，如有遗留则补入 `delivery_queue`，再执行清理
- **恢复幂等**：崩溃恢复补队列前，必须按 `platform + platformJobId`（或等价业务键）检查 `delivery_queue` 是否已有对应记录，避免重复入队；实现上用 `INSERT OR IGNORE` 利用 `dedupe_key` UNIQUE 约束做原子幂等（不做 check-then-act），检查 `rows_affected` 判断是新插入还是已存在
- **dedupe_key 格式**：拼接时必须加分隔符（如 `platform + ':' + platformJobId`），防止 `'A' + 'BC'` 与 `'AB' + 'C'` 碰撞
- SQLite `DELETE` 不释放磁盘空间，需开启 `PRAGMA auto_vacuum = INCREMENTAL` 或定期 `VACUUM`
- migration：新增表，不迁老数据

---

### Q11：Dashboard 文件结构与页面路由 ✅

**决策**：单 HTML 入口 + hash 路由，CSS/JS 轻量模块拆分。

**文件结构**：
```
crawler/
  dashboard.html          # 单入口，<script type=”module”>
  dashboard.css           # 全部样式
  dashboard.js            # 主逻辑 + hash 路由
  dashboard-api.js        # API 调用封装（fetch 封装）
  dashboard-resume.js     # 第二页逻辑（按需加载）
```

**关键设计点**：
- 使用 `<script type=”module”>` 原生 ESM，零构建下支持 import/export，避免全局变量污染
- hash 路由只做 DOM 显隐切换（`#home` / `#resume`），不引入状态机
- 两个主容器 `<div id=”view-home”>` 和 `<div id=”view-resume”>`，监听 `hashchange` 事件
- 静态资源全部使用相对路径，兼容 Windows 迁移
- MV3 CSP 要求禁止内联脚本，按文件拆分已规避此限制

---

### Q12：Controller 增量 API 的具体实现位置 ✅

**决策**：路由不拆，DB 层按领域拆分，multipart 用 formidable。

**关键设计点**：
- 路由：继续在 `handleRequest` 中添加 if 分支，但业务逻辑抽为独立 Handler 函数（如 `handleGetJobs`、`handleResumeUpload`），if/else 中仅做路由分发
- DB 层：新增 `jobs-db.js`（scraped_jobs CRUD）和 `resume-db.js`（简历路径管理），不继续堆进 `db.js`
- multipart 解析：**使用 `formidable`**（不使用 multer，multer 依赖 Express 中间件模型，无法在原生 http 模块中使用）
- 文件路径：统一使用 Node `path.join(__dirname, ...)` 处理，不写死 Linux 风格路径
- 安装入口：后续收敛到 `install.sh` + `install.ps1` 双入口，不继续只加 shell 能力

**server.js 路由模式**：
```javascript
// 保持现有精确匹配风格，不用正则
const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
const pathname = parsedUrl.pathname;

if (req.method === 'GET' && pathname === '/api/jobs') {
    handleGetJobs(req, res);
} else if (req.method === 'POST' && pathname === '/api/jobs/select') {
    handleSelectJob(req, res);
    // ID 通过 parsedUrl.searchParams.get('id') 或 request body 获取
}
```

---

### Q13：Sidecar 模式对现有架构的影响边界 ✅

**决策**：Dashboard 只连 Controller，不反向依赖 background.js；CORS 在 Controller 侧显式处理。

**关键设计点**：
- Dashboard 与 Controller 是唯一的读写通道，采集状态通过 Controller 侧暴露
- 不依赖 background.js 运行时状态，保持 Sidecar 边界清晰
- manifest.json 需新增 `host_permissions: [“http://127.0.0.1:7893/*”]`
- Controller 侧 CORS 处理：现有 `setCORS(res)` 设置了 `Access-Control-Allow-Origin: *`，需改为动态 Origin 白名单
- **CORS 白名单正则**：匹配 `chrome-extension://` 和 `localhost/127.0.0.1`，不硬编码单个扩展 ID，兼容开发版 ID 变化
- 状态 API 返回：`crawl_mode`、`active_platform`、`batch_timestamp`，Dashboard 表达为”本轮抓取快照”

**Controller CORS 模式（动态白名单）**：
```javascript
function setCORS(req, res) {
    const origin = req.headers.origin;
    const allowed = /^(chrome-extension:\/\/[a-z]{32}|https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?)/;
    if (origin && allowed.test(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    }
}
// 注意：现有 setCORS(res) 需改为 setCORS(req, res)
```

---

### Q14：manifest.json 中 dashboard.html 的注册方式 ✅

**决策**：保留 `default_popup`，Dashboard 通过 `chrome.tabs.create` 打开，实现单例模式。

**关键设计点**：
- popup 保留为轻量控制面，Dashboard 通过 popup 按钮 + `chrome.tabs.create` 打开全屏标签页
- 不注册为 `options_page`（Dashboard 是工作台，不是设置页）
- **单例模式**：点击”打开工作台”时先 `chrome.tabs.query({url: dashboardUrl})`，已打开则聚焦，未打开则新建
- 打开后自动关闭 popup（`window.close()`）
- manifest 层无需特别改平台逻辑，系统差异控制在 Controller 启动方式和安装文档

---

## 关联文档

- 产品总纲：`PROJECT_PRD.md`
- 当前优先级：`CURRENT_PRIORITY.md`（v1.2）
- 产品状态：`PROJECT_PRODUCT_STATUS.md`（v1.2）
- 决策记录：`PROJECT_DECISIONS.md`（v1.2）
- 阅读指南：`docs/READING_BY_STAGE.md`（v1.2）
- 多平台 PRD：`MULTI_PLATFORM_PHASE_PRD.md`
- 统一职位模型：`UNIFIED_JOB_MODEL_DRAFT.md`
- 接口草案：`ADAPTER_EXECUTOR_INTERFACE_DRAFT.md`
- 第一轮完整决策：`docs/plans/DIVERGENCE_DASHBOARD_AND_MULTIPLATFORM_v1.md`

---

## F. 下一步行动

两轮决策（Q1-Q14）全部完成，可进入实施阶段：

1. **Controller 增量 API**：在 server.js 中新增 6 个端点（岗位列表/详情、简历上传与读取、匹配占位、加入待投递），创建 jobs-db.js 和 resume-db.js，引入 formidable
2. **Dashboard UI 实现**：创建 dashboard.html/css/js/api.js，实现 hash 路由、Bento Grid、Glassmorphism 浮窗、Toast、Micro-interactions
3. **manifest.json 更新**：新增 localhost host_permissions + 猎聘 content_scripts 条目
4. **popup.html 更新**：新增"打开工作台"按钮，实现单例模式
5. **文档更新**：MASTER_HANDOFF、BACKEND_ENTRY、FRONTEND_ENTRY 同步最新决策
