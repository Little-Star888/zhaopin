# 工作包 M1-N1-WP3：resumes 表与 V6 migration

> 目标：建立简历元数据表（存文件路径，不存文件内容），完成 Schema V6 迁移。
> 角色：后端
> 预估改动量：新增 ~80 行（resume-db.js）+ 修改 ~15 行（db.js）
> 注意：原标题"V5"有误，V5 已被 WP2（scraped_jobs）占用，本 WP 为 V6。

## 1. 前置条件

- M1-N1-WP2（scraped_jobs 表）已完成
- `controller/db.js` 已有 V5 migration（SCHEMA_VERSION = 5）

## 2. 读文件（执行前必读）

| 文件 | 读取目的 |
|------|---------|
| `docs/plans/DIVERGENCE_DASHBOARD_AND_MULTIPLATFORM.md` Q1 章节 | "简历存原文件，数据库仅存路径；单份简历" |
| `controller/db.js` | 理解 V5 migration 后的代码位置，确定 V6 插入点 |

## 3. 写文件

| 文件 | 说明 |
|------|------|
| `controller/resume-db.js`（新建） | 简历元数据 CRUD 函数 |

## 4. 改文件

| 文件 | 改动位置 | 改动内容 |
|------|---------|---------|
| `controller/db.js` | `initDatabase` 函数内，V5 之后 | 新增 `if (currentVersion < 6)` 分支 |
| `controller/db.js` | 文件底部 | 新增 `migrateToV6(db)` 函数 |

## 5. 技术约束与改动规格

### 5.1 建表 SQL

```sql
CREATE TABLE IF NOT EXISTS resumes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER,
    upload_time DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**设计说明**（Q1 决策）：
- 只存元数据（文件名、路径、大小、上传时间），不存文件内容
- 单份简历：当前只支持一个简历文件，后续可扩展为多份
- 文件存储位置：`controller/uploads/resumes/`（WP3 负责创建目录和存文件逻辑）

### 5.2 Migration 风格

```javascript
if (currentVersion < 6) {
  migrateToV6(dbInstance);
  currentVersion = 6;
}

function migrateToV6(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS resumes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      file_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_size INTEGER,
      upload_time DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  db.prepare('INSERT INTO schema_version (version, description) VALUES (?, ?)')
    .run(6, 'Add resumes metadata table');
}
```

### 5.3 resume-db.js 函数清单

| 函数名 | 行为 | 备注 |
|--------|------|------|
| `insertResume({fileName, filePath, fileSize})` | 插入单条简历记录 | 返回 `{success, id}` |
| `getLatestResume()` | `SELECT * ORDER BY upload_time DESC LIMIT 1` | 单份简历场景 |
| `getAllResumes()` | `SELECT * ORDER BY upload_time DESC` | 历史记录 |
| `deleteResume(id)` | 按 id 删除记录 | 不删物理文件（API 层负责） |
| `getResumeCount()` | `SELECT COUNT(*)` | 统计 |

## 6. 测试上下文

- **测试数据库**：临时 `.db` 文件
- **mock 数据**：1-2 条简历记录，验证 CRUD 流程
- **目录前提**：`uploads/resumes/` 目录可能不存在，`getLatestResume` 不应因目录缺失报错

## 7. 验收标准（可执行命令）

```bash
# 1. 触发 migration
cd /home/xixil/kimi-code/zhaopin/controller
node -e "const db = require('./db'); db.initDatabase(); console.log('V6 migration OK');"

# 2. 验证表结构
sqlite3 data/zhaopin.db ".schema resumes"
# 预期：CREATE TABLE resumes (id, file_name, file_path, file_size, upload_time)

# 3. 验证 schema_version
sqlite3 data/zhaopin.db "SELECT * FROM schema_version WHERE version = 6;"
# 预期：1 行记录，description 含 'resumes'

# 4. 验证模块加载
node -e "const rdb = require('./resume-db'); console.log(Object.keys(rdb));"
# 预期：insertResume, getLatestResume, getAllResumes, deleteResume, getResumeCount
```

## 8. 影响范围（Blast Radius）

| 影响对象 | 影响程度 | 说明 |
|---------|---------|------|
| `db.js` 现有功能 | 无影响 | V6 只新增表 |
| `scraped_jobs` | 无冲突 | 独立表 |
| M1-N2-WP3（简历上传端点） | 下游依赖 | API handler 需调用 `resume-db.js` |

## 9. 契约变更

| 变更类型 | 内容 | 向后兼容 |
|---------|------|---------|
| 新增 DB 表 | `resumes` | 兼容 |
| 新增 schema_version | V6 | 兼容 |
| 新增模块 | `resume-db.js` | 兼容 |

## 10. 回退方案

- 删除 `schema_version` V6 记录 + `DROP TABLE IF EXISTS resumes`

## 11. 边界（不做什么）

- 不实现文件上传逻辑（M1-N2-WP3 负责）
- 不做简历解析
- 不做多份简历管理 UI（本期只支持单份）
- 不删物理文件
