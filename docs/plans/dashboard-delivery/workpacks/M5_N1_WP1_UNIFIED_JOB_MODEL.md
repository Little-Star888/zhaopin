# 工作包 M5-N1-WP1：UnifiedJobModel 文档草案

> 目标：产出统一职位数据模型的设计文档
> 角色：文档
> 预估改动量：新增 1 个 Markdown 文件（~200 行）

## 1. 前置条件

- M4 全部通过
- Boss 单平台数据模型稳定（scraped_jobs 表）

## 2. 读文件（执行前必读）

| 文件 | 读取目的 |
|------|---------|
| `controller/db.js` | 当前 scraped_jobs 表结构 |
| `controller/jobs-db.js` | 当前职位数据操作 |
| `UNIFIED_JOB_MODEL_DRAFT.md` | 已有草案（项目根目录，175 行） |
| `PRD.md` 第 1.4.1 节 | 4 个目标平台 |

## 3. 产出规格

### 3.1 文档路径

`docs/plans/UNIFIED_JOB_MODEL_V2.md`

### 3.2 产出模板（执行者必须按此结构产出）

```markdown
# UnifiedJobModel V2

> 版本：2.0 | 日期：YYYY-MM-DD | 基于：UNIFIED_JOB_MODEL_DRAFT.md 升级

## 1. 概述
<!-- 一段话说明：为什么需要统一模型、目标是什么、适用范围 -->

## 2. 核心字段定义

### 2.1 标准字段（所有平台必须提供）

| 字段名 | 类型 | 必填 | 说明 | Boss 对应字段 |
|--------|------|------|------|-------------|
| title | string | 是 | 职位标题 | jobName |
| company | string | 是 | 公司名称 | companyName |
| location | string | 是 | 工作城市 | city |
| salary | string | 否 | 薪资范围 | salary |
| experience | string | 否 | 经验要求 | experience |
| description | string | 否 | 职位描述 | description |
| sourceUrl | string | 是 | 原始链接 | url |
| platform | string | 是 | 来源平台标识 | platform |

### 2.2 扩展字段（平台特有，存入 platformMetadata）

| 字段名 | 类型 | 适用平台 | 说明 |
|--------|------|---------|------|
| ... | ... | ... | 执行者从源码中提取 |

## 3. 字段映射表

| 统一字段 | Boss 字段 | 猎聘字段 | 51job 字段 | 智联字段 |
|---------|---------|---------|-----------|---------|
| title | jobName | ... | ... | ... |
| ... | ... | ... | ... | ... |

## 4. 去重键设计

### 4.1 候选方案

| 方案 | 键组成 | 优点 | 缺点 |
|------|--------|------|------|
| 方案 A | `{platform}:{platformJobId}` | 简单、唯一 | 无法跨平台去重 |
| 方案 B | `{title}:{company}:{location}` | 部分跨平台 | 同名同岗同城不同平台会误合并 |
| 方案 C | 混合键（优先方案A，fallback 方案B的哈希） | 兼顾 | 复杂度高 |

### 4.2 推荐方案
<!-- 执行者分析后推荐 -->

## 5. 数据迁移策略

### 5.1 现有 Boss 数据
<!-- 现有 scraped_jobs 表中的数据如何映射到新模型 -->

### 5.2 迁移 SQL（伪代码）
<!-- 不需要真实 SQL，只需描述迁移逻辑 -->

## 6. 与 Adapter/Executor 的关系
<!-- 简要说明本模型如何在适配层中使用 -->
```

### 3.3 禁止

- 不编写任何代码
- 不修改数据库 schema
- 不定义具体的 SQL 或 API

## 4. 验收标准

- [ ] 文档存在且按模板结构产出（至少包含上述 6 个章节）
- [ ] 标准字段表覆盖所有平台共有字段
- [ ] 字段映射表包含 Boss 列的完整映射
- [ ] 去重键至少列出 2 个候选方案并给出推荐
- [ ] 数据迁移策略描述了现有 Boss 数据的处理方式

## 5. 回退方案

- 删除 `docs/plans/UNIFIED_JOB_MODEL_V2.md`
