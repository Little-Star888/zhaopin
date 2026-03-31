# 工作包 M3-N2-WP2：文档更新

> 目标：同步所有相关文档，反映 Dashboard 功能已完成的状态。
> 角色：文档
> 预估改动量：修改 ~100 行（5 个文档文件）

## 1. 前置条件

- M3-N2-WP1（端到端检测）通过

## 2. 读文件（执行前必读）

| 文件 | 读取目的 |
|------|---------|
| `docs/BACKEND_ENTRY.md` | 了解现有结构，确定新增内容位置 |
| `docs/FRONTEND_ENTRY.md` | 了解现有结构，确定新增内容位置 |
| `PROJECT_MASTER_HANDOFF.md` | 了解现有结构，确定新增内容位置 |
| `CURRENT_PRIORITY.md` | 了解现有结构 |
| `PROJECT_PRODUCT_STATUS.md` | 了解现有结构 |

## 3. 改文件

| 文件 | 改动内容 |
|------|---------|
| `docs/BACKEND_ENTRY.md` | 新增：scraped_jobs 表说明、7 个 Dashboard API 端点、CORS 白名单、formidable 简历上传 |
| `docs/FRONTEND_ENTRY.md` | 新增：Dashboard 文件结构（按实际产物填写）、hash 路由说明、popup 单例入口 |
| `PROJECT_MASTER_HANDOFF.md` | 更新：Dashboard 交付物清单、技术栈、验收状态 |
| `CURRENT_PRIORITY.md` | 更新：Dashboard 完成标记 |
| `PROJECT_PRODUCT_STATUS.md` | 更新：Dashboard 功能状态 |

## 4. 技术约束

- 只更新已有文档，不新增文档
- 新增内容格式与现有文档风格一致
- 文件路径和名称按实际产物填写（不预填可能不存在的文件）

## 5. 测试上下文

- 纯文档工作，无需运行环境

## 6. 验收标准

```bash
# 1. 文档中无死链接
# 操作：检查所有文档中的文件路径引用，确认文件存在

# 2. 文档描述与实际代码一致
# 操作：逐项比对文档中的端点列表、文件路径、函数名

# 3. 格式一致
# 操作：检查新增内容的 Markdown 格式与现有内容一致
```

## 7. 影响范围（Blast Radius）

| 影响对象 | 影响程度 | 说明 |
|---------|---------|------|
| 代码文件 | 无修改 | 纯文档更新 |
| 其他文档 | 无影响 | 只更新上述 5 个文档 |

## 8. 契约变更

无。

## 9. 回退方案

- `git checkout` 恢复 5 个文档文件

## 10. 边界（不做什么）

- 不改功能代码
- 不新增文档文件
- 不重写现有文档内容（只追加/更新）
