# 工作包 M15-N2-WP1：ai_configs UNIQUE 约束

> 目标：为 `ai_configs` 表 `provider` 字段增加 UNIQUE 约束
> 角色：后端
> 预估改动量：~1行DDL

## 1. 前置条件
- M15-N1 通过

## 2. 读文件
| 文件 | 读取目的 |
|------|---------|
| `controller/db.js` | `migrateToV8` 中 `ai_configs` 表定义 |
| `controller/db.js` | `INSERT OR IGNORE INTO ai_configs` 调用位置 |

## 3. 改动规格
- 在 `migrateToV8` 的 `CREATE TABLE IF NOT EXISTS ai_configs` 中：
  - `provider TEXT NOT NULL` → `provider TEXT NOT NULL UNIQUE`
- 新增迁移步骤（兼容已有数据）：
  - 检查表中是否已存在重复 provider 记录
  - 如有重复：保留最新一条，删除其余
  - 执行 `CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_configs_provider ON ai_configs(provider)`
- 确保 `INSERT OR IGNORE` 能正确去重

## 4. 验证
- [ ] `ai_configs` 表 `provider` 字段有 UNIQUE 约束
- [ ] 插入相同 provider 的记录被 IGNORE（不报错、不插入）
- [ ] 已有数据中无重复 provider 记录
