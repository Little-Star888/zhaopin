# 后端接入文档入口

> 版本：1.0 | 日期：2026-03-24
> 作用：为 controller、SQLite、delivery、enrichment 相关工作提供总入口，具体实现细节通过路径渐进披露。

## 1. 当前后端是什么

当前后端是本地 controller，而不是独立云服务。

核心路径：

1. `controller/README.md`
2. `controller/server.js`
3. `controller/db.js`
4. `controller/delivery-worker.js`
5. `controller/feishu-client.js`
6. `controller/run_batch.js`

## 2. 当前后端职责

1. 任务编排与状态管理
2. SQLite 持久化
3. enrichment 推进
4. delivery queue 与 worker
5. 结果导出与统计

## 3. 当前接口与使用入口

### 3.1 采集与投递接口

1. `GET /status`
2. `GET /queue`
3. `GET /results`
4. `GET /export`
5. `GET /delivery/stats`
6. `GET /feishu/targets`

### 3.2 Dashboard 数据接口

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/jobs` | 分页 + 多条件过滤查询职位列表（platform / keyword / page / pageSize / selected） |
| `GET` | `/api/jobs/detail` | 获取单条职位详情（query: `id`） |
| `POST` | `/api/jobs/select` | 更新选中状态（body: `{ id, selected }`） |
| `GET` | `/api/delivery/selected` | 获取已选中职位列表（待投递） |
| `POST` | `/api/resume/upload` | 上传简历（formidable，最大 10MB） |
| `GET` | `/api/resume` | 获取最新简历信息 |
| `DELETE` | `/api/resume` | 删除简历（query: `id`） |

运行入口：

1. `bash controller/start.sh`
2. `node controller/run_batch.js controller/batches/sample_batch.json`
3. `node controller/run_multi_batch.js ...`

## 4. 多平台接入后端要求

后端未来仍应保持为共享底座，新增平台时不应把平台专属逻辑继续堆进 controller 主流程。

后端重点关注：

1. executor / adapter 输出如何进入 controller
2. UnifiedJobModel 如何落库
3. enrichment 与 delivery 如何复用

## 5. scraped_jobs 表

Dashboard 依赖的职位存储表（`db.js` → `migrateToV5`）：

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | INTEGER PK | 自增主键 |
| `platform` | TEXT | 招聘平台（boss / liepin / 51job / zhilian） |
| `platformJobId` | TEXT | 平台职位 ID |
| `title` | TEXT | 职位标题 |
| `company` | TEXT | 公司名称 |
| `location` | TEXT | 工作地点 |
| `url` | TEXT | 职位详情页 URL |
| `keywords` | TEXT | 关键词 |
| `salary` | TEXT | 薪资范围 |
| `experience` | TEXT | 经历要求 |
| `education` | TEXT | 学历要求 |
| `match_status` | TEXT | 匹配状态（默认 `not_ready`） |
| `selected` | BOOLEAN | 是否选中（默认 0） |
| `crawl_batch_id` | TEXT | 爬取批次 ID |
| `crawl_mode` | TEXT | 爬取模式 |
| `job_alive_status` | TEXT | 职位存活状态（默认 `unknown`） |
| `raw_payload` | TEXT | 原始数据 JSON |
| `crawled_at` | DATETIME | 爬取时间 |

唯一约束：`UNIQUE(platform, platformJobId)`

## 6. CORS 配置

白名单正则：`/^(chrome-extension:\/\/[a-z0-9]{32}|https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?)/`

允许的来源：
- Chrome 扩展（`chrome-extension://` + 32 位 ID）
- 本地前端（`localhost` / `127.0.0.1`，任意端口）

## 7. 简历上传（formidable）

实现文件：`controller/resume-handler.js`

- 使用 `formidable` 解析 `multipart/form-data`
- 最大文件大小：10MB
- 存储目录：`controller/uploads/resumes/`
- 文件命名：`{时间戳}-{UUID}{扩展名}`
- 简历元数据存储：`controller/resume-db.js`（SQLite）

## 8. 详细文档路径

1. 总体架构：`docs/ARCHITECTURE.md`
2. 总体产品定义：`PROJECT_PRD.md`
3. SQLite 主线：`docs/plans/EXECUTION_PLAN_SQLITE_DELIVERY_QUEUE.md`
4. enrichment 主线：`docs/plans/EXECUTION_PLAN_COMPANY_ENRICHMENT_FINAL.md`
5. 统一模型草案：`UNIFIED_JOB_MODEL_DRAFT.md`
6. 接口边界草案：`ADAPTER_EXECUTOR_INTERFACE_DRAFT.md`
