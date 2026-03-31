# 工作包 M5-N1-WP2：Adapter/Executor 接口草案

> 目标：产出平台适配器和执行器的接口设计文档
> 角色：文档
> 预估改动量：新增 1 个 Markdown 文件（~200 行）

## 1. 前置条件

- M5-N1-WP1 通过（UnifiedJobModel 文档已产出）

## 2. 读文件（执行前必读）

| 文件 | 读取目的 |
|------|---------|
| `ADAPTER_EXECUTOR_INTERFACE_DRAFT.md` | 已有草案（项目根目录，184 行） |
| `crawler/extension/content.js` | Boss 执行器实现 |
| `crawler/extension/background.js` | 扩展后台逻辑 |
| `docs/plans/UNIFIED_JOB_MODEL_V2.md` | WP1 产出的统一模型文档 |

## 3. 产出规格

### 3.1 文档路径

`docs/plans/ADAPTER_EXECUTOR_V2.md`

### 3.2 产出模板（执行者必须按此结构产出）

```markdown
# Adapter/Executor 接口设计 V2

> 版本：2.0 | 日期：YYYY-MM-DD | 基于：ADAPTER_EXECUTOR_INTERFACE_DRAFT.md 升级

## 1. 概述
<!-- 一段话说明：为什么需要适配层、执行器、目标是什么 -->

## 2. 接口定义

### 2.1 PlatformAdapter 接口

```typescript
interface PlatformAdapter {
  readonly platformId: string;

  /** 将平台原始数据适配为 UnifiedJobModel */
  adapt(rawData: unknown): UnifiedJob;

  /** 从 UnifiedJobModel 反向生成平台特有字段 */
  extract(rawData: unknown): PlatformMetadata;
}
```

### 2.2 PlatformExecutor 接口

```typescript
interface PlatformExecutor {
  readonly platformId: string;

  /** 检查是否可以在此页面执行 */
  canExecute(url: string): boolean;

  /** 执行列表抓取 */
  fetchJobList(params: { keyword: string; city: string; page: number }): Promise<unknown[]>;

  /** 执行详情抓取 */
  fetchJobDetail(platformJobId: string): Promise<unknown>;
}
```

## 3. 职责划分

### 3.1 Adapter vs Executor 边界

| 职责 | Adapter | Executor |
|------|---------|----------|
| 数据转换 | ✅ | ❌ |
| 页面交互 | ❌ | ✅ |
| 网络请求 | ❌ | ✅ |
| 平台特有逻辑 | ❌ | ✅ |
| 统一模型产出 | ✅ | ❌ |

## 4. 注册机制

### 4.1 新平台注册流程
<!-- 描述：提供 platformId → Adapter + Executor 的注册方式 -->

### 4.2 注册表示例
<!-- 用 Boss 作为示例展示如何注册 -->

## 5. Boss 实现映射分析

| 接口方法 | Boss 当前实现 | 映射难度 | 备注 |
|---------|-------------|---------|------|
| canExecute | `content.js` 中检查 URL 包含 `zhipin.com` | 低 | URL 匹配即可 |
| fetchJobList | `content.js` 中 `scrapeList()` | 中 | 需要提取为独立函数 |
| fetchJobDetail | `content.js` 中 `scrapeDetail()` | 中 | 需要提取为独立函数 |
| adapt | 尚无（直接写入 scraped_jobs） | 高 | 需要新建适配层 |
```

### 3.3 禁止

- 不编写任何可执行代码
- 不创建 `.ts` / `.js` 接口文件
- 只描述接口签名和行为规范

## 4. 验收标准

- [ ] 文档存在且按模板结构产出（至少包含上述 5 个章节）
- [ ] Adapter 接口定义包含 `adapt()` 和 `extract()` 方法
- [ ] Executor 接口定义包含 `canExecute()`、`fetchJobList()`、`fetchJobDetail()` 方法
- [ ] 职责划分表清晰区分 Adapter 和 Executor
- [ ] Boss 映射分析表列出至少 4 个接口方法的映射难度
- [ ] 注册机制描述了新平台的接入路径

## 5. 回退方案

- 删除 `docs/plans/ADAPTER_EXECUTOR_V2.md`
