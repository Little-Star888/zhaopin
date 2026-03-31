# 工作包 M8-N1-WP1：ai_configs 表设计与迁移

> 目标：新建 ai_configs 表，Schema v7→v8
> 角色：后端
> 预估改动量：修改 ~30 行

## 1. 前置条件

- M7 全部通过（Schema 稳定在 v7）

## 2. 读文件（执行前必读）

| 文件 | 读取目的 |
|------|---------|
| `crawler/controller/db.js` | 当前 Schema 版本和迁移逻辑 |

## 3. 改动规格

### 3.1 Schema 版本升级

将 `schemaVersion` 从 7 升级到 8。

### 3.2 新建 ai_configs 表

```sql
CREATE TABLE IF NOT EXISTS ai_configs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    provider TEXT NOT NULL,
    api_key_encrypted TEXT NOT NULL,
    base_url TEXT NOT NULL,
    model_name TEXT NOT NULL,
    is_active INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);
```

### 3.3 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| provider | TEXT | 厂商标识：zhipu / kimi / openai / groq |
| api_key_encrypted | TEXT | AES 加密后的 API Key |
| base_url | TEXT | API 基础 URL |
| model_name | TEXT | 模型名称 |
| is_active | INTEGER | 1=当前激活配置，0=未激活 |

### 3.4 预置厂商

可选：在迁移时插入默认厂商配置（base_url预填，api_key为空，需用户自行填写）：
- 智谱AI：`https://open.bigmodel.cn/api/coding/paas/v4`
- Kimi：`https://api.moonshot.cn/v1`
- OpenAI：`https://api.openai.com/v1`

## 4. 验证

- [ ] Schema 版本为 8
- [ ] ai_configs 表存在
- [ ] 重复迁移不报错（幂等性）
