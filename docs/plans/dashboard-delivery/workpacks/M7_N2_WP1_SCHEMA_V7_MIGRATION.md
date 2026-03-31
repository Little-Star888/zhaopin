# 工作包 M7-N2-WP1：Schema v6→v7 迁移

> 目标：resumes 表新增 content_md 和 status 字段
> 角色：后端
> 预估改动量：修改 ~30 行

## 1. 前置条件

- M3-N1 数据库 Schema 稳定

## 2. 读文件（执行前必读）

| 文件 | 读取目的 |
|------|---------|
| `crawler/controller/db.js` | 当前 Schema 版本和迁移逻辑 |
| `crawler/controller/resume-db.js` | resumes 表操作方法 |

## 3. 改动规格

### 3.1 Schema 版本升级

将 `schemaVersion` 从 6 升级到 7。

### 3.2 新增迁移逻辑

```sql
ALTER TABLE resumes ADD COLUMN content_md TEXT;
ALTER TABLE resumes ADD COLUMN status VARCHAR(20) DEFAULT 'uploaded';
```

### 3.3 迁移安全规则

- 使用 `CREATE TABLE IF NOT EXISTS` 检查列是否存在
- 或用 PRAGMA table_info 检查列是否已存在，避免重复迁移报错
- 旧数据 `content_md` 默认为 NULL，`status` 默认为 'uploaded'

### 3.4 字段契约

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| content_md | TEXT | NULL | Markdown 格式简历全文，可空 |
| status | VARCHAR(20) | 'uploaded' | uploaded / parsed / parse_failed |

## 4. 验证

- [ ] 执行迁移脚本，resumes 表新增两列
- [ ] 旧记录 content_md 为 NULL，status 为 'uploaded'
- [ ] 重复执行迁移不报错（幂等性）
