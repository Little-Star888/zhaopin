# 工作包 M1-N1-WP2：scraped_jobs 表结构

> 目标：落地 `scraped_jobs` 表（V5 migration）与 `jobs-db.js` CRUD 函数。
> 角色：后端
> 预估改动量：新增 ~200 行（jobs-db.js）+ 修改 ~30 行（db.js）

## 1. 前置条件

- M1-N1 节点已启动
- `controller/db.js` 已有 V4 migration（`SCHEMA_VERSION = 4`）
- `better-sqlite3` 已安装（现有依赖）
- Node.js 运行环境可用

## 2. 读文件（执行前必读）

| 文件 | 读取目的 |
|------|---------|
| `docs/plans/DIVERGENCE_DASHBOARD_AND_MULTIPLATFORM.md` Q10 章节 | 表结构、清空策略、崩溃恢复、幂等规则的唯一决策源 |
| `controller/db.js` | 理解现有 migration 风格（schema_version 表 + migrateToVN 函数模式） |
| `controller/db.js` 中 `insertDeliveryRecord` 函数 | 参考 `INSERT OR IGNORE` + `dedupe_key` 的幂等写法 |

## 3. 写文件

| 文件 | 说明 |
|------|------|
| `controller/jobs-db.js`（新建） | scraped_jobs 全部 CRUD 函数 |

## 4. 改文件

| 文件 | 改动位置 | 改动内容 |
|------|---------|---------|
| `controller/db.js` | `initDatabase` 函数内，V4 migration 之后 | 新增 `if (currentVersion < 5)` 分支调用 `migrateToV5` |
| `controller/db.js` | 文件底部（`migrateToV4` 函数之后） | 新增 `migrateToV5(db)` 函数 |

## 5. 技术约束与改动规格

### 5.1 建表 SQL（Q10 决策，不可删减字段）

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
CREATE INDEX IF NOT EXISTS idx_scraped_jobs_platform_job
    ON scraped_jobs(platform, platformJobId);
```

### 5.2 Migration 风格（沿用现有模式）

```javascript
// 在 initDatabase 函数中 V4 之后添加：
if (currentVersion < 5) {
  migrateToV5(dbInstance);
  currentVersion = 5;
}

// 在文件底部新增：
function migrateToV5(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS scraped_jobs ( ... );  -- 完整建表SQL
    CREATE INDEX IF NOT EXISTS idx_scraped_jobs_status ...;
    CREATE INDEX IF NOT EXISTS idx_scraped_jobs_platform_job ...;
  `);
  db.prepare('INSERT INTO schema_version (version, description) VALUES (?, ?)')
    .run(5, 'Add scraped_jobs snapshot table');
}
```

### 5.3 jobs-db.js 函数清单

| 函数名 | 行为 | 备注 |
|--------|------|------|
| `insertJob(jobData)` | `INSERT INTO` 单条，利用 UNIQUE 约束自然去重 | 失败抛异常 |
| `insertOrUpdateJob(jobData)` | `INSERT ... ON CONFLICT(platform, platformJobId) DO UPDATE` | upsert |
| `batchInsertJobs(jobs[])` | 事务内批量 `insertJob` | 用 `db.transaction()` 包裹 |
| `getJobs({platform, keyword, selected, page, pageSize})` | 分页 + 多条件动态过滤 | `LIMIT/OFFSET`，keyword 用 `LIKE` |
| `getJobById(id)` | 按 `id` 查单条 | 返回 `undefined` 如果不存在 |
| `getJobByPlatformKey(platform, platformJobId)` | 按联合唯一键查 | 用于去重检查 |
| `updateSelected(id, selected)` | 更新单条 `selected` 字段 | 布尔值 |
| `batchSelect(ids[], selected)` | 批量更新 `selected` | 事务内 |
| `getSelectedJobs()` | `SELECT * WHERE selected = 1` | 用于待投递列表 |
| `clearUnselectedJobs()` | `DELETE WHERE selected = 0` | 条件清理，不做全表 DELETE |
| `clearSelectedAfterDelivery(keys[])` | 按 `platform + platformJobId` 删除已投递记录 | 事务内，投递成功后调用 |
| `getJobCount({platform, selected})` | `SELECT COUNT(*)` | 统计用 |
| `getJobsByBatch(batchId)` | 按 `crawl_batch_id` 查询 | 单轮结果查看 |

### 5.4 关键业务规则（来自 Q10）

1. **清空边界**：`clearUnselectedJobs` 只删 `selected=false`，不碰已选中记录
2. **崩溃恢复幂等**：投递入队前必须用 `INSERT OR IGNORE` + 检查 `rows_affected`（参考 `insertDeliveryRecord` 现有写法）
3. **dedupe_key 格式**：`platform + ':' + platformJobId`，加分隔符防碰撞
4. **不做外键**：`delivery_queue` 不得引用 `scraped_jobs.id`，冗余 `platform + platformJobId`
5. **VACUUM**：建表后执行一次 `PRAGMA incremental_vacuum`（SQLite DELETE 不释放磁盘空间）

## 6. 测试上下文

- **测试数据库**：使用临时 `.db` 文件，不碰生产数据
- **mock 数据**：至少 3 条不同 platform 的记录（如 boss/liepin），验证 UNIQUE 约束
- **环境状态**：Controller 不需要启动，直接用 `node -e "require('./jobs-db')"` 验证模块加载

## 7. 验收标准（可执行命令）

```bash
# 1. 触发 migration
cd /home/xixil/kimi-code/zhaopin/controller
node -e "const db = require('./db'); db.initDatabase(); console.log('V5 migration OK');"

# 2. 验证表结构
sqlite3 data/zhaopin.db ".schema scraped_jobs"
# 预期：看到 CREATE TABLE 和全部 18 个字段 + UNIQUE 约束

# 3. 验证索引
sqlite3 data/zhaopin.db ".indices scraped_jobs"
# 预期：idx_scraped_jobs_status, idx_scraped_jobs_platform_job

# 4. 验证 schema_version
sqlite3 data/zhaopin.db "SELECT * FROM schema_version WHERE version = 5;"
# 预期：1 行记录，description 含 'scraped_jobs'

# 5. 验证 jobs-db.js 模块加载
node -e "const jobsDb = require('./jobs-db'); console.log(Object.keys(jobsDb));"
# 预期：输出全部 13 个函数名
```

## 8. 影响范围（Blast Radius）

| 影响对象 | 影响程度 | 说明 |
|---------|---------|------|
| `db.js` 现有功能 | 无影响 | V5 migration 只新增表，不改现有表结构 |
| `delivery_queue` | 无影响 | 无外键关联，独立运行 |
| M1-N1-WP3（resumes 表） | 无冲突 | 各自建表，但共享 `initDatabase` 入口，需注意执行顺序 |
| M1-N2（API 层） | 下游依赖 | API handler 需要调用 `jobs-db.js` 的函数，但本 WP 不涉及 API |

## 9. 契约变更

| 变更类型 | 内容 | 向后兼容 |
|---------|------|---------|
| 新增 DB 表 | `scraped_jobs` | 兼容，`CREATE TABLE IF NOT EXISTS` |
| 新增 schema_version | V5 | 兼容，渐进升级 |
| 新增模块 | `jobs-db.js` | 兼容，新增文件不影响现有模块 |
| API 契约 | 无变更 | 本 WP 不涉及 API 层 |

## 10. 回退方案

- 如果 migration 出错：删除 `schema_version` 中 V5 记录 + `DROP TABLE IF EXISTS scraped_jobs`，重启应用回到 V4
- 如果 `jobs-db.js` 函数有 bug：不影响现有功能，该模块是新增的，未导入则不执行

## 11. 边界（不做什么）

- 不实现 `job_alive_status` 的跨轮对比逻辑（本期仅预留字段）
- 不添加 API handler（M1-N2 负责）
- 不做 `VACUUM` 定时任务（只做一次性 `PRAGMA incremental_vacuum`）
- 不修改 `delivery_queue` 表结构
