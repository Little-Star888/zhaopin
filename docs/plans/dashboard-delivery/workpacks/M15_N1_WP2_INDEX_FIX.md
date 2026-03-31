# 工作包 M15-N1-WP2：datetime 索引修复

> 目标：移除 `ORDER BY` 中多余的 `datetime()` 函数包装，恢复索引命中
> 角色：后端
> 预估改动量：~10行SQL（8处 ORDER BY + 1处 WHERE）

## 1. 前置条件
- M15-N1-WP1 通过（分页改造完成，L403 已修复）

## 2. 读文件
| 文件 | 读取目的 |
|------|---------|
| `controller/db.js` | 全局搜索 `ORDER BY datetime(` 和 `datetime(...) <= datetime(` |

## 3. 改动规格

### delivery_queue 表（6 处 ORDER BY + 1 处 WHERE）

| 行号 | 原始 | 修改后 |
|------|------|--------|
| L181 | `ORDER BY datetime(created_at) ASC` | `ORDER BY created_at ASC` |
| L195 | `ORDER BY datetime(COALESCE(sent_at, updated_at)) DESC` | `ORDER BY COALESCE(sent_at, updated_at) DESC` |
| L206 | `ORDER BY datetime(updated_at) DESC` | `ORDER BY updated_at DESC` |
| L245 | `ORDER BY datetime(created_at) DESC, id DESC` | `ORDER BY created_at DESC, id DESC` |
| L309 | `ORDER BY datetime(created_at) ASC, id ASC` | `ORDER BY created_at ASC, id ASC` |
| L346 | `ORDER BY datetime(created_at) ASC, id ASC` | `ORDER BY created_at ASC, id ASC` |
| L308 | `datetime(next_retry_at) <= datetime('now')` | `next_retry_at IS NULL OR next_retry_at <= datetime('now')` |

### company_profile_cache 表（2 处 ORDER BY）

| 行号 | 原始 | 修改后 |
|------|------|--------|
| L477 | `ORDER BY datetime(updated_at) DESC, id DESC` | `ORDER BY updated_at DESC, id DESC` |
| L649 | `ORDER BY datetime(updated_at) DESC` | `ORDER BY updated_at DESC` |

### 原理
- ISO8601 格式字符串天然支持字典序比较，`datetime()` 包装是多余的
- `datetime()` 函数包装会导致 SQLite 无法使用 B-tree 索引，退化为全表扫描
- L195 的 `COALESCE(sent_at, updated_at)` 不能用 `id` 替代（sent_at 是后续更新的），但去掉了 `datetime()` 包装即可命中索引

## 4. 验证
- [ ] `EXPLAIN QUERY PLAN` 确认关键查询命中索引
- [ ] 查询结果顺序与修改前一致
- [ ] 全局无 `ORDER BY datetime(` 残留
- [ ] `next_retry_at` 的 WHERE 条件比较逻辑正确
