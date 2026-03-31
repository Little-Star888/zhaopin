# 工作包 M14-N2-WP2：页码任务表与去重

> 目标：新增页码任务表 + platform+platformJobId 唯一约束去重
> 角色：后端
> 预估改动量：~30行DDL + ~20行JS
> 状态：**已完成** ✅（v12 migration 已在 `controller/db.js` 中实现）

## 1. 前置条件
- M14-N2-WP1 通过（detail_status 字段可用）

## 2. 读文件
| 文件 | 读取目的 |
|------|---------|
| `controller/db.js` 搜索 `migrateToV12` | `crawl_page_tasks` 表 migration（v12），已实现 |
| `controller/jobs-handler.js` | batch-insert 接口，需要集成去重逻辑 |
| `crawler/extension/background.js` | 采集主流程，需要集成页码任务状态更新 |

## 3. 已实现的改动

### DDL（`controller/db.js` migration v12，L1077-1110）

```sql
CREATE TABLE IF NOT EXISTS crawl_page_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    platform TEXT NOT NULL,
    city TEXT NOT NULL,
    keyword TEXT NOT NULL,
    page_number INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'pending',
    jobs_found INTEGER DEFAULT 0,
    jobs_new INTEGER DEFAULT 0,
    started_at DATETIME,
    completed_at DATETIME,
    error TEXT,
    created_at DATETIME DEFAULT (datetime('now', 'localtime')),
    UNIQUE(platform, city, keyword, page_number)
);

CREATE INDEX IF NOT EXISTS idx_crawl_page_tasks_status
  ON crawl_page_tasks(status);
CREATE INDEX IF NOT EXISTS idx_crawl_page_tasks_lookup
  ON crawl_page_tasks(platform, city, keyword, status);

-- scraped_jobs 去重唯一索引
CREATE UNIQUE INDEX IF NOT EXISTS idx_scraped_jobs_platform_job_id
  ON scraped_jobs(platform, platformJobId);
```

### 状态值

| 值 | 含义 |
|----|------|
| `pending` | 待执行 |
| `running` | 执行中 |
| `done` | 已完成 |
| `failed` | 执行失败 |

## 4. 验证
- [x] `crawl_page_tasks` 表 DDL 已定义（migration v12）
- [x] 唯一索引 `idx_scraped_jobs_platform_job_id` 已定义（migration v12）
- [ ] 重复 `platformJobId` 入库时被忽略（需运行时验证）
- [ ] 页码任务状态流转正确（需运行时验证）
- [ ] 扩展刷新后 `running` 任务被重置为 `pending`（需运行时验证）
