# Adapter/Executor 接口设计 V2

> 版本：2.0 | 日期：2026-03-25 | 基于：ADAPTER_EXECUTOR_INTERFACE_DRAFT.md 升级
> 状态：Design Draft | 所属阶段：M5-N1 (Phase B - 纯设计文档)
> 前置文档：`ADAPTER_EXECUTOR_INTERFACE_DRAFT.md` v0.1、`UNIFIED_JOB_MODEL_V2.md` v2.0

---

## 1. 概述

### 1.1 为什么需要适配层

当前系统（zhaopin）以 Boss 直聘为唯一平台，数据采集链路从 `background.js` -> `content.js` -> Boss API 一路硬编码，字段映射逻辑散落在 `content.js` 的 `scrapeJobs()` / `getJobDetail()` 以及 `background.js` 的 `executeCrawlTask()` 中。当引入第二平台（猎聘/51job/智联）时，若不抽象出适配层和执行器，每新增一个平台都需要修改 Controller 主流程，违反开闭原则。

**适配层（Adapter）** 解决的问题：不同平台的 API 响应结构不同（Boss 返回 `jobName`/`brandName`，猎聘可能返回 `job_title`/`company_name`），需要一层标准化映射将平台原始数据转为 `UnifiedJobModel`（定义见 `UNIFIED_JOB_MODEL_V2.md`）。

**执行器（Executor）** 解决的问题：不同平台的运行环境不同（Boss 走 Chrome 扩展 + 页面内 fetch，猎聘可能走 HTTP API 或 Playwright），需要一层执行抽象将"在平台环境中发起采集动作"的具体实现封装起来。

### 1.2 目标

1. 定义 `PlatformAdapter` 和 `PlatformExecutor` 两个核心接口
2. 明确 Adapter 与 Executor 的职责边界，以及它们与 Controller 的交互关系
3. 为新平台接入提供清晰的注册路径和映射分析模板
4. 不提前把 Boss 主链路强行改造成抽象接口（遵循 V1 草案"先文档后代码"原则）

### 1.3 数据流总览

```
Controller（任务编排）
    |
    | 1. 分配 CrawlTaskInput
    v
PlatformExecutor（平台执行器）
    |
    | 2. 在平台环境中发起搜索/翻页/详情抓取
    | 3. 返回平台原始数据 (ExecutorResult)
    v
PlatformAdapter（平台适配器）
    |
    | 4. 字段映射 -> UnifiedJobModel
    | 5. 生成 platformDedupeKey
    | 6. 打包 platformMetadata
    | 7. 保留 rawPlatformPayload
    v
Controller（任务编排）
    |
    | 8. 去重检查、持久化、enrichment、delivery
    v
scraped_jobs 表
```

---

## 2. 接口定义

### 2.1 PlatformAdapter 接口

```ts
interface PlatformAdapter {
  /** 平台标识，与 UnifiedJobModel.platform 对应 */
  readonly platformId: string;

  /**
   * 将平台原始数据映射为 UnifiedJobModel 标准结构。
   *
   * 职责：
   * - 将平台字段名映射为统一字段名（如 Boss 的 jobName -> title）
   * - 生成 platformDedupeKey = (platform, platformJobId)
   * - 将平台特有字段打包到 platformMetadata
   * - 保留原始数据快照到 rawPlatformPayload
   * - 对缺失字段记录 adapterWarnings
   *
   * @param rawData - 来自 Executor 的平台原始数据（单条）
   * @returns 映射后的 UnifiedJob 标准结构
   */
  adapt(rawData: unknown): UnifiedJob;

  /**
   * 从平台原始数据中提取平台元信息（不执行标准化映射）。
   *
   * 适用场景：
   * - 列表页快速预览时，只需 platformJobId 做去重判断
   * - 需要平台原始字段做业务过滤（如 Boss 的 jobExperience 过滤）
   * - 日志/调试时需要查看平台原始字段
   *
   * @param rawData - 平台原始数据（单条）
   * @returns 平台元信息
   */
  extract(rawData: unknown): PlatformMetadata;
}
```

**UnifiedJob 结构**（引用自 `UNIFIED_JOB_MODEL_V2.md`）：

```ts
interface UnifiedJob {
  // Identity 层
  platform: string;
  platformJobId: string;
  platformCompanyId?: string;
  sourceUrl?: string;
  collectedAt: string;       // ISO 8601

  // Normalized Core 层
  title: string;
  company: string;
  location: string;
  salary?: string;
  experience?: string;
  education?: string;
  description?: string;

  // 扩展层
  platformMetadata?: Record<string, unknown>;

  // 原始快照
  rawPlatformPayload?: unknown;
}
```

**PlatformMetadata 结构**：

```ts
interface PlatformMetadata {
  /** 平台原始职位 ID（用于去重） */
  platformJobId: string;
  /** 平台原始公司 ID（可选） */
  platformCompanyId?: string;
  /** 平台原始响应中的其他业务字段（不映射到标准层） */
  rawFields?: Record<string, unknown>;
}
```

### 2.2 PlatformExecutor 接口

```ts
interface PlatformExecutor {
  /** 平台标识，与 PlatformAdapter.platformId 配对 */
  readonly platformId: string;

  /**
   * 判断当前 URL 是否属于本执行器可处理的平台。
   *
   * 适用场景：
   * - 多执行器并存时，Controller 根据目标 URL 路由到正确的执行器
   * - Boss Chrome 扩展场景下，判断当前标签页是否为 zhipin.com
   *
   * @param url - 目标页面 URL
   * @returns true 表示本执行器可以处理该 URL
   */
  canExecute(url: string): boolean;

  /**
   * 获取职位列表（搜索结果）。
   *
   * 职责：
   * - 在平台环境中发起搜索请求
   * - 处理翻页逻辑（可多页聚合）
   * - 处理登录态、反爬降级
   * - 返回平台原始数据，不做标准化映射
   *
   * @param params - 搜索参数
   * @returns 平台原始职位列表（每条为 unknown，由 Adapter 解析）
   */
  fetchJobList(params: FetchJobListParams): Promise<ExecutorResult>;

  /**
   * 获取单个职位的详细信息。
   *
   * 职责：
   * - 根据平台职位 ID 获取详情
   * - 支持多端点降级（如 Boss 的 card.json -> detail.json）
   * - 返回平台原始详情数据
   *
   * @param platformJobId - 平台原始职位 ID
   * @returns 平台原始详情数据
   */
  fetchJobDetail(platformJobId: string): Promise<ExecutorResult>;
}
```

**FetchJobListParams 结构**：

```ts
interface FetchJobListParams {
  keyword: string;            // 搜索关键词
  city: string;               // 城市（名称或代码，由执行器内部解析）
  experience?: string;        // 经验要求过滤（可选）
  page?: number;              // 起始页码（默认 1）
  pageSize?: number;          // 每页条数（默认 30）
  runtimeConfig?: Record<string, unknown>;  // 平台特有的运行时配置
}
```

**ExecutorResult 结构**：

```ts
interface ExecutorResult {
  /** 平台标识 */
  platform: string;
  /** 任务 ID（由 Controller 分配，原样返回用于追踪） */
  taskId?: string;
  /** 平台原始数据列表 */
  listItems: unknown[];
  /** 详情数据列表（fetchJobDetail 时使用） */
  detailItems: unknown[];
  /** 执行过程中的平台元信息（如反爬状态码、API 端点名等） */
  rawMeta?: Record<string, unknown>;
  /** 是否为部分结果（如翻页中途遇到反爬） */
  partial?: boolean;
  /** 部分结果原因 */
  partialReason?: string | null;
  /** 执行是否成功 */
  success: boolean;
  /** 错误信息 */
  error?: string;
}
```

### 2.3 类型签名补充说明

以上接口定义使用 TypeScript 类型签名作为描述语言，但当前阶段**不产出任何 .ts / .js 接口文件**。实现语言取决于各平台执行器的技术选型（Boss 为 Chrome 扩展 JS，未来平台可能为 Python/Node.js）。

接口定义的核心是**方法签名和语义契约**，而非具体语言绑定。

---

## 3. 职责划分

### 3.1 三方职责矩阵

| 职责 | Executor | Adapter | Controller |
|------|----------|---------|------------|
| 进入平台运行环境（打开标签页、建立会话） | **负责** | - | - |
| 发起搜索/翻页请求 | **负责** | - | - |
| 发起详情请求 | **负责** | - | - |
| 处理登录态/Cookie/认证 | **负责** | - | - |
| 反爬检测与降级 | **负责** | - | - |
| 多端点降级（如 card -> detail） | **负责** | - | - |
| 返回平台原始数据 | **负责** | - | - |
| 平台字段 -> 统一字段映射 | - | **负责** | - |
| 生成 platformDedupeKey | - | **负责** | - |
| 打包 platformMetadata | - | **负责** | - |
| 保留 rawPlatformPayload | - | **负责** | - |
| 字段缺失时记录 adapterWarnings | - | **负责** | - |
| 判断 URL 是否属于本平台 | **负责** | - | - |
| 任务编排（搜索 -> 详情 -> 持久化） | - | - | **负责** |
| 去重检查 | - | - | **负责** |
| 持久化到 scraped_jobs | - | - | **负责** |
| Enrichment（公司信息补全） | - | - | **负责** |
| Delivery（投递推进） | - | - | **负责** |
| 规则过滤（关键词评分） | - | - | **负责** |
| 反爬状态机管理（冷却/封禁） | - | - | **负责** |
| 结果摘要与可观测 | - | - | **负责** |

### 3.2 错误语义归属

| 错误类型 | 归属方 | 示例 |
|----------|--------|------|
| 登录态过期/缺失 | Executor | Boss Cookie 失效 |
| 反爬/风控拦截 | Executor | API 返回 code=35/37 |
| 页面/API 结构变化 | Executor | 接口字段名变更 |
| 网络异常/超时 | Executor | DNS 解析失败、连接超时 |
| 关键字段缺失 | Adapter | 响应中没有 `jobName` 字段 |
| 字段映射失败 | Adapter | 类型不匹配（期望 string，实际为 number） |
| 标准化失败 | Adapter | `platformJobId` 为空导致去重键生成失败 |
| 持久化失败 | Controller | SQLite 写入异常 |
| 去重冲突 | Controller | 同一 `platformJobId` 已存在 |

### 3.3 数据边界

| 层级 | 数据形态 | 示例 |
|------|----------|------|
| Executor 输出 | 平台原始 JSON | `{ jobName: "...", encryptJobId: "...", salaryDesc: "..." }` |
| Adapter 输出 | UnifiedJob 标准结构 | `{ title: "...", platformJobId: "...", salary: "..." }` |
| Controller 输出 | scraped_jobs 表行 | `{ platform: "boss", title: "...", raw_payload: "..." }` |

---

## 4. 注册机制

### 4.1 新平台注册流程

当需要接入新平台（如猎聘）时，按以下步骤操作：

```
步骤 1: 创建平台目录
  platforms/<platform-id>/
    ├── executor.<ext>      # 执行器实现
    └── adapter.<ext>       # 适配器实现

步骤 2: 实现 PlatformExecutor 接口
  - canExecute(url): 判断 URL 是否属于该平台
  - fetchJobList(params): 实现搜索+翻页
  - fetchJobDetail(id): 实现详情获取

步骤 3: 实现 PlatformAdapter 接口
  - adapt(rawData): 映射为 UnifiedJobModel
  - extract(rawData): 提取 PlatformMetadata

步骤 4: 在注册表中注册
  - 添加平台标识到 PlatformRegistry
  - 关联 executor 和 adapter 实例

步骤 5: 验证
  - 单条数据映射验证（手动或自动化）
  - 列表+详情全链路验证
  - 去重键唯一性验证
```

### 4.2 注册表示例（Boss）

以下为 Boss 直聘的注册表示例，展示现有代码如何映射到新接口（仅作为设计参考，不要求当前阶段改造）。

#### BossExecutor（对应 content.js + background.js）

| 接口方法 | Boss 当前实现位置 | 实现说明 |
|----------|-------------------|----------|
| `canExecute(url)` | `background.js` 第 651-654 行 | 创建 `https://www.zhipin.com/web/geek/job` 标签页，隐含判断逻辑为 URL 匹配 `zhipin.com` |
| `fetchJobList(params)` | `content.js` `scrapeJobs()` + `background.js` `scrapeJobListPages()` | content.js 调用 `wapi/zpgeek/search/joblist.json`，background.js 管理翻页和聚合 |
| `fetchJobDetail(id)` | `content.js` `getJobDetail()` + `background.js` `fetchJobDetailWithRetry()` | 双端点降级：card.json -> detail.json，background.js 管理重试 |

#### BossAdapter（对应 content.js 字段映射部分）

| 接口方法 | Boss 当前实现位置 | 实现说明 |
|----------|-------------------|----------|
| `adapt(rawData)` | `content.js` 第 102-120 行（列表映射）+ 第 204-241 行（详情映射） | 将 Boss API 字段（`jobName`, `brandName`, `salaryDesc` 等）映射为内部格式 |
| `extract(rawData)` | `content.js` 第 102-120 行（部分） | 提取 `encryptJobId`, `securityId`, `lid` 等平台原始标识 |

#### Boss 注册条目（设计参考）

```ts
// 伪代码，仅作为设计参考
PlatformRegistry.register({
  platformId: 'boss',

  executor: {
    // 运行环境：Chrome 扩展（Service Worker + Content Script）
    runtime: 'chrome-extension',
    canExecute: (url) => url.includes('zhipin.com'),
    fetchJobList: scrapeJobListPages,   // background.js
    fetchJobDetail: getJobDetail,       // content.js（经由 background.js 中转）
  },

  adapter: {
    adapt: (rawData) => {
      // 列表数据映射（content.js 第 102-120 行的逻辑）
      return {
        platform: 'boss',
        platformJobId: rawData.encryptJobId,
        title: rawData.jobName,
        company: rawData.brandName,
        location: rawData.locationName || rawData.cityName,
        salary: rawData.salaryDesc,
        experience: rawData.jobExperience,
        education: rawData.jobDegree,
        platformMetadata: {
          areaDistrict: rawData.areaDistrict,
          bossName: rawData.bossName,
          bossTitle: rawData.bossTitle,
          skills: rawData.skills,
          brandIndustry: rawData.brandIndustry,
          brandStageName: rawData.brandStageName,
          brandScaleName: rawData.brandScaleName,
        },
        rawPlatformPayload: rawData,
      };
    },
    extract: (rawData) => ({
      platformJobId: rawData.encryptJobId,
      platformCompanyId: rawData.encryptBrandId,
      rawFields: { securityId: rawData.securityId, lid: rawData.lid },
    }),
  },
});
```

### 4.3 Controller 路由逻辑（设计参考）

```ts
// 伪代码：Controller 如何根据平台 ID 路由到正确的 Executor 和 Adapter
function resolvePlatform(platformId: string): { executor: PlatformExecutor; adapter: PlatformAdapter } | null {
  const registration = PlatformRegistry.get(platformId);
  if (!registration) return null;
  return { executor: registration.executor, adapter: registration.adapter };
}
```

---

## 5. Boss 实现映射分析

以下分析基于 `content.js` 和 `background.js` 的现有代码，评估将 Boss 当前实现映射到 `PlatformAdapter` / `PlatformExecutor` 接口的难度。

| 接口方法 | Boss 当前实现 | 映射难度 | 备注 |
|----------|--------------|----------|------|
| `canExecute(url)` | `background.js` 第 651 行硬编码 `https://www.zhipin.com/web/geek/job` | **低** | 当前为常量 URL，改为 `url.includes('zhipin.com')` 即可。无需拆分现有逻辑。 |
| `fetchJobList(params)` | `background.js` `scrapeJobListPages()`（翻页编排）+ `content.js` `scrapeJobs()`（单页请求） | **中** | 核心逻辑已在 `scrapeJobListPages()` 中封装为独立函数，但当前依赖 `sendMessageToTab()` 与 Content Script 通信。需将通信层抽象为执行器内部细节，对外暴露 `fetchJobList(params)` 签名。翻页逻辑、反爬延迟、去重聚合已在 `scrapeJobListPages()` 内完成，可直接复用。 |
| `fetchJobDetail(platformJobId)` | `content.js` `getJobDetail()`（双端点降级）+ `background.js` `fetchJobDetailWithRetry()`（重试管理） | **中** | `getJobDetail()` 接收 `securityId` + `lid` 两个参数，但接口定义接收单个 `platformJobId`。需在执行器内部维护 `securityId`/`lid` 与 `encryptJobId` 的映射关系（当前在列表数据中已包含这两个字段）。双端点降级逻辑完善，可直接封装。重试逻辑在 `fetchJobDetailWithRetry()` 中已实现。 |
| `adapt(rawData)` | `content.js` 第 102-120 行（列表映射）+ 第 204-241 行（详情映射） | **低** | 字段映射关系清晰，已在 `UNIFIED_JOB_MODEL_V2.md` 第 3.1 节定义完整的字段对照表。主要工作是将散落在两处的映射逻辑合并为一个 `adapt()` 函数，并补充 `platformMetadata` 打包和 `rawPlatformPayload` 保留。 |
| `extract(rawData)` | `content.js` 第 102-120 行（部分字段提取） | **低** | 提取 `encryptJobId`、`encryptBrandId`、`securityId`、`lid` 等原始标识字段。当前逻辑中已隐含此步骤（列表映射时提取了这些字段），只需独立抽离。 |

### 5.1 难度总结

| 难度 | 方法数 | 说明 |
|------|--------|------|
| 低 | 3 | `canExecute`、`adapt`、`extract` - 逻辑简单，几乎可直接提取 |
| 中 | 2 | `fetchJobList`、`fetchJobDetail` - 需要抽象通信层，但核心业务逻辑已封装 |
| 高 | 0 | 无 |

### 5.2 当前不做的事项

遵循 V1 草案原则，当前阶段**不执行**以下操作：

1. 不创建 `adapters/` 或 `executors/` 目录
2. 不把 Boss `content.js` / `background.js` 改造为接口实现
3. 不创建 PlatformRegistry 注册表代码
4. 不编写任何 .ts / .js 接口定义文件
5. 不修改 Boss 主链路的任何可运行代码

以上事项将在第二平台 PoC 阶段，根据实际需求再启动实施。

---

## 附录 A：与相关文档的关系

| 文档 | 版本 | 关系 |
|------|------|------|
| `ADAPTER_EXECUTOR_INTERFACE_DRAFT.md` | v0.1 | 本文档的上一版本，定义了 Executor/Adapter/Controller 的职责边界和类型草案 |
| `UNIFIED_JOB_MODEL_V2.md` | v2.0 | 定义了 Adapter 输出的目标数据结构（UnifiedJobModel） |
| `MULTI_PLATFORM_PHASE_PRD.md` | - | 定义了 4 个目标平台和全平台阶段产品形态 |
| `PROJECT_PRD.md` | - | 项目总纲 |
| `docs/ARCHITECTURE.md` | - | 架构边界文档 |

## 附录 B：版本变更记录

| 版本 | 日期 | 变更内容 |
|------|------|----------|
| v0.1 | 2026-03-24 | 初始草案（ADAPTER_EXECUTOR_INTERFACE_DRAFT.md），定义三方职责和类型草案 |
| v2.0 | 2026-03-25 | 升级为 V2，补充完整接口定义（含方法级 JSDoc）、三方职责矩阵、错误语义归属、注册机制、Boss 映射分析表 |
