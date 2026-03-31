# UnifiedJobModel V2

> 版本：2.0 | 日期：2026-03-25 | 基于：UNIFIED_JOB_MODEL_DRAFT.md 升级
> 状态：Design Draft | 所属阶段：M5-N1 (Phase B - 纯设计文档)
> 前置文档：`UNIFIED_JOB_MODEL_DRAFT.md` v0.1、`ADAPTER_EXECUTOR_INTERFACE_DRAFT.md` v0.1、`MULTI_PLATFORM_PHASE_PRD.md`

---

## 1. 概述

本项目（zhaopin）正在从 Boss 单平台采集扩展为多平台采集。当前系统以 Boss 直聘为主力平台，数据模型围绕 Boss API 字段自然生长，缺少跨平台标准化设计。UnifiedJobModel 的目标是为 Boss 直聘、猎聘、51job、智联招聘四个目标平台定义一套统一的职位数据模型，使得后续新增平台只需编写 Adapter 映射逻辑，而不需要修改 Controller 主流程或数据库 schema。

本模型遵循以下原则：

1. **文档先行，代码后置**：V2 阶段只产出设计文档，不编写任何代码
2. **保留现有 Boss 数据完整性**：现有 scraped_jobs 表中的 Boss 数据不做破坏性变更
3. **渐进式标准化**：标准字段覆盖所有平台共有信息，平台特有字段存入扩展层
4. **第二平台真实数据到手前，不定死最终字段**：猎聘字段映射待 PoC 数据验证

适用范围：所有通过 Crawler Executor 采集并经 Adapter 标准化后的招聘职位数据。

---

## 2. 核心字段定义

### 2.1 标准字段（所有平台必须提供）

这些字段构成 Normalized Core 层，每个平台的 Adapter 必须产出这些字段。

| 字段名 | 类型 | 必填 | 说明 | Boss 对应字段 |
|--------|------|------|------|---------------|
| `title` | string | 是 | 职位标题 | `jobName` |
| `company` | string | 是 | 公司名称 | `brandName` |
| `location` | string | 是 | 工作城市 | `locationName` / `cityName` |
| `salary` | string | 否 | 薪资范围（原始文本） | `salaryDesc` |
| `experience` | string | 否 | 经验要求（原始文本） | `jobExperience` |
| `education` | string | 否 | 学历要求（原始文本） | `jobDegree` |
| `description` | string | 否 | 职位描述/详情 | `postDescription` / `jobDescription`（详情 API） |
| `sourceUrl` | string | 否 | 职位原始链接 | 由 `encryptJobId` 拼接生成 |
| `platform` | string | 是 | 来源平台标识（`boss` / `liepin` / `51job` / `zhaopin`） | 硬编码 `boss` |
| `platformJobId` | string | 是 | 平台原始职位 ID | `encryptJobId` |
| `platformCompanyId` | string | 否 | 平台原始公司 ID | `encryptBrandId` |
| `collectedAt` | string | 是 | 采集时间（ISO 8601） | 采集时生成 |

### 2.2 扩展字段（平台特有，存入 platformMetadata）

以下字段不要求所有平台提供，Adapter 将平台特有字段打包存入 `platformMetadata` JSON 对象。

#### Boss 直聘特有字段

| 字段名 | 类型 | 说明 | 来源 |
|--------|------|------|------|
| `areaDistrict` | string | 区域/商圈 | `job.areaDistrict` |
| `bossName` | string | 招聘者姓名 | `job.bossName` |
| `bossTitle` | string | 招聘者职位 | `job.bossTitle` |
| `skills` | string[] | 技能标签 | `job.skills` |
| `brandIndustry` | string | 公司所属行业 | `job.brandIndustry` |
| `brandStageName` | string | 融资阶段 | `job.brandStageName` |
| `brandScaleName` | string | 公司规模 | `job.brandScaleName` |
| `welfareList` | string[] | 福利标签 | 详情 API `welfareList` |
| `address` | string | 工作地址 | 详情 API `address` |
| `hardRequirements` | string | 硬性要求标签 | 详情 API `jobLabels` |
| `securityId` | string | 安全 ID（详情请求用） | `job.securityId` |
| `lid` | string | 列表 ID（详情请求用） | `job.lid` |

#### 猎聘 / 51job / 智联（待 PoC 数据验证后补充）

以下为根据公开 API 信息预判的可能字段，最终以 PoC 实际数据为准：

| 预估字段名 | 类型 | 说明 |
|------------|------|------|
| `jobType` | string | 职位类别 |
| `workYears` | string | 工作年限（平台原始） |
| `degree` | string | 学历要求（平台原始） |
| `companyType` | string | 公司类型（民营/外企等） |
| `companySize` | string | 公司规模 |
| `industry` | string | 行业 |
| `publishDate` | string | 发布日期 |
| `salaryMin` | number | 最低月薪（结构化） |
| `salaryMax` | number | 最高月薪（结构化） |

### 2.3 Enrichment 层字段

这些字段由 enrichment 流程补充，不属于采集层输出。

| 字段名 | 类型 | 说明 |
|--------|------|------|
| `companyType` | string | 公司类型（enrichment 补充） |
| `companyDescription` | string | 公司简介（enrichment 补充） |
| `enrichmentSource` | string | 补全来源（如 `company_profile_cache`） |
| `enrichmentConfidence` | number | 补全置信度（0-1） |
| `enrichmentUpdatedAt` | string | 补全更新时间 |

---

## 3. 字段映射表

### 3.1 标准字段映射

| 统一字段 | Boss 直聘 | 猎聘（待验证） | 51job（待验证） | 智联招聘（待验证） |
|----------|-----------|--------------|----------------|-------------------|
| `title` | `jobName` | 待定 | 待定 | 待定 |
| `company` | `brandName` | 待定 | 待定 | 待定 |
| `location` | `locationName` / `cityName` | 待定 | 待定 | 待定 |
| `salary` | `salaryDesc` | 待定 | 待定 | 待定 |
| `experience` | `jobExperience` | 待定 | 待定 | 待定 |
| `education` | `jobDegree` | 待定 | 待定 | 待定 |
| `description` | `postDescription`（card API）/ `jobDescription`（detail API） | 待定 | 待定 | 待定 |
| `sourceUrl` | `https://www.zhipin.com/job_detail/{encryptJobId}.html` | 待定 | 待定 | 待定 |
| `platform` | `boss` | `liepin` | `51job` | `zhaopin` |
| `platformJobId` | `encryptJobId` | 待定 | 待定 | 待定 |
| `platformCompanyId` | `encryptBrandId` | 待定 | 待定 | 待定 |

### 3.2 scraped_jobs 表字段与统一模型对照

当前 `scraped_jobs` 表（Schema V5 定义）字段与统一模型的映射关系：

| scraped_jobs 列 | 统一模型层 | 对应统一字段 |
|-----------------|-----------|-------------|
| `platform` | Identity | `platform` |
| `platformJobId` | Identity | `platformJobId` |
| `title` | Normalized Core | `title` |
| `company` | Normalized Core | `company` |
| `location` | Normalized Core | `location` |
| `url` | Identity | `sourceUrl` |
| `keywords` | Normalized Core | `skills`（归并） |
| `salary` | Normalized Core | `salary` |
| `experience` | Normalized Core | `experience` |
| `education` | Normalized Core | `education` |
| `match_status` | 业务状态（非模型字段） | - |
| `selected` | 业务状态（非模型字段） | - |
| `crawl_batch_id` | 采集元数据 | - |
| `crawl_mode` | 采集元数据 | - |
| `job_alive_status` | 业务状态（非模型字段） | - |
| `raw_payload` | Raw Source | `rawPlatformPayload` |
| `crawled_at` | Identity | `collectedAt` |

### 3.3 Boss 详情数据字段对照

Boss 详情 API 返回的字段与统一模型的映射：

| Boss 详情字段 | 统一模型字段 | 说明 |
|--------------|-------------|------|
| `postDescription` / `jobDescription` | `description` | 职位描述（双端点兼容） |
| `skills` / `showSkills` / `skillList` | `skills`（扩展层） | 技能标签 |
| `welfareList` / `welfare` | `welfareList`（扩展层） | 福利标签 |
| `address` / `location` | `address`（扩展层） | 工作地址 |
| `experienceName` / `jobExperience` | `experience` | 经验要求 |
| `degreeName` / `jobDegree` | `education` | 学历要求 |
| `jobLabels` | `hardRequirements`（扩展层） | 硬性要求 |
| `bossInfo.name` | `bossName`（扩展层） | HR 姓名 |
| `bossInfo.title` | `bossTitle`（扩展层） | HR 职位 |

---

## 4. 去重键设计

### 4.1 候选方案

#### 方案 A：平台职位 ID 联合键（当前方案）

**组合**：`(platform, platformJobId)`

**优势**：
- 当前 scraped_jobs 表已使用 `UNIQUE(platform, platformJobId)` 约束
- 精确去重，无误判
- 实现简单，已在生产验证

**劣势**：
- 仅适用于平台内去重
- 无法处理跨平台同一职位的情况
- 依赖平台提供稳定的职位 ID

**适用场景**：平台内去重（当前 Boss 已满足）

#### 方案 B：标题 + 公司 + 城市 + 薪资组合键

**组合**：`(normalize(title), normalize(company), normalize(location), salary)`

**优势**：
- 可用于跨平台候选去重
- 不依赖平台特定 ID
- 语义维度更丰富

**劣势**：
- 薪资可能随时间变化导致去重失败
- 标题和公司名需要标准化处理（去除空格、标点、大小写等）
- 同一公司同一职位在不同平台可能标题略有差异
- 可能产生误判（不同职位但信息相似）

**适用场景**：跨平台候选去重（第二平台数据到手后验证）

#### 方案 C：标题 + 公司 + 城市（无薪资）

**组合**：`(normalize(title), normalize(company), normalize(location))`

**优势**：
- 比方案 B 更稳定（不受薪资变动影响）
- 实现简单
- 覆盖面广

**劣势**：
- 误判率比方案 B 高（不同职位可能标题和公司相同但薪资/要求不同）
- 需要配合人工确认

**适用场景**：跨平台候选去重的粗筛阶段

### 4.2 推荐方案

**平台内去重**：采用方案 A `(platform, platformJobId)`

理由：
1. 当前已验证可用，scraped_jobs 表已有 UNIQUE 约束
2. Boss、猎聘等主流平台均提供稳定的职位 ID
3. 精确去重，零误判

**跨平台候选去重**：采用方案 B `(normalize(title), normalize(company), normalize(location), salary)` 作为候选规则，但当前阶段不实现自动合并

理由：
1. 草案原则明确"第二平台数据到手前，不定死跨平台去重算法"
2. 方案 B 提供足够的语义区分度
3. 候选去重结果仅用于提示用户，不做自动合并
4. 待猎聘 PoC 数据验证后，根据实际数据质量调整权重和匹配阈值

**去重键生成位置**：由 Adapter 层负责生成，Controller 层负责执行去重检查。

---

## 5. 数据迁移策略

### 5.1 现有 Boss 数据现状

当前系统中的 Boss 数据分布在两个位置：

#### scraped_jobs 表（Schema V5）
- 存储：经过初步标准化的职位快照数据
- 字段：`platform`, `platformJobId`, `title`, `company`, `location`, `url`, `keywords`, `salary`, `experience`, `education`, `match_status`, `selected`, `crawl_batch_id`, `crawl_mode`, `job_alive_status`, `raw_payload`, `crawled_at`
- 去重约束：`UNIQUE(platform, platformJobId)`
- 数据量：已有生产数据

#### delivery_queue 表（Schema V1-V3）
- 存储：待投递/已投递的职位数据（以 JSON payload 形式）
- payload 格式：使用中文字段名（如 `职位名称`, `公司名称`, `薪资范围` 等）
- enrichment 字段：`enrichment_status`, `enrichment_updated_at`, `enrichment_deadline_at`
- 关联：通过 `company_profile_cache` 表存储公司 enrichment 结果

### 5.2 迁移原则

1. **不破坏现有数据**：迁移过程不删除或覆盖任何现有记录
2. **渐进式迁移**：新字段以 ALTER TABLE ADD COLUMN 方式新增，不重建表
3. **向后兼容**：现有 API 和查询逻辑在迁移后继续正常工作
4. **零停机**：迁移在应用启动时自动执行（沿用现有 schema_version 机制）

### 5.3 迁移逻辑

#### 阶段一：scraped_jobs 表扩展（Schema V7）

新增列（所有新列允许 NULL，不影响现有数据）：

| 新增列 | 类型 | 说明 | 默认值 |
|--------|------|------|--------|
| `platform_company_id` | TEXT | 平台原始公司 ID | NULL |
| `description` | TEXT | 职位描述（详情） | NULL |
| `platform_metadata` | TEXT | 平台特有字段 JSON | NULL |
| `district` | TEXT | 区域/商圈 | NULL |

**迁移操作**：
- 使用 `ALTER TABLE scraped_jobs ADD COLUMN` 添加新列
- 现有 Boss 数据的 `platform_company_id` 可从 `raw_payload` 中回填 `encryptBrandId`
- `description` 字段初始为 NULL，后续通过详情抓取补充

#### 阶段二：现有 Boss 数据回填

对现有 scraped_jobs 中的 Boss 记录：

1. **platform_company_id 回填**：从 `raw_payload` JSON 中提取 `encryptBrandId` 写入 `platform_company_id`
2. **platform_metadata 回填**：将现有 Boss 特有字段（`areaDistrict`, `bossName`, `bossTitle`, `skills`, `brandIndustry`, `brandStageName`, `brandScaleName`）从 `raw_payload` 提取并打包为 JSON 写入 `platform_metadata`
3. **description 不回填**：历史数据可能未抓取详情，description 保持 NULL，避免数据不完整

#### 阶段三：delivery_queue payload 字段名标准化（可选，独立于本模型）

delivery_queue 中的 payload 当前使用中文字段名。统一模型定义的是采集层的标准字段名（英文），与 delivery_queue 的 payload 格式是独立的。

建议：
- delivery_queue 的 payload 格式变更属于 delivery 层改造，不在本模型范围内
- 未来 delivery 层改造时，可考虑将 payload 字段名与统一模型对齐
- 当前阶段不修改 delivery_queue 的 payload 格式

### 5.4 迁移时间线

| 阶段 | 触发条件 | 内容 | 风险 |
|------|----------|------|------|
| 阶段一 | Schema V7 迁移脚本 | 新增 4 列 | 低风险，ADD COLUMN 不影响现有数据 |
| 阶段二 | 迁移脚本或手动脚本 | 回填 Boss 数据 | 中风险，需验证 raw_payload 格式一致性 |
| 阶段三 | 未来 delivery 层改造 | payload 字段名标准化 | 高风险，涉及下游消费者 |

---

## 6. 与 Adapter/Executor 的关系

### 6.1 数据流

```
Executor（平台执行层）
    |
    | 返回平台原始数据 (unknown[])
    v
Adapter（平台适配层）
    |
    | 字段映射 + 标准化
    | 生成 platformDedupeKey
    | 打包 platformMetadata
    | 保留 rawPlatformPayload
    v
Controller（任务编排层）
    |
    | 去重检查 (platformDedupeKey)
    | 持久化到 scraped_jobs
    | 触发 enrichment
    | 推进 delivery
    v
scraped_jobs 表（事实层）
```

### 6.2 职责边界

| 组件 | 职责 | 不负责 |
|------|------|--------|
| **Executor** | 进入平台环境、发起搜索/翻页/详情抓取、处理登录态、返回平台原始数据 | 标准化、持久化、去重 |
| **Adapter** | 将平台原始数据映射为统一模型字段、生成去重键、打包扩展字段、保留原始快照 | 浏览器执行、Controller 状态管理、delivery |
| **Controller** | 任务编排、调用去重检查、持久化、触发 enrichment、推进 delivery | 平台执行、字段映射 |

### 6.3 Adapter 输入输出

**输入**（来自 Executor）：
```ts
{
  platform: string;        // 平台标识
  taskId: string;          // 任务 ID
  listItems: unknown[];    // 列表页原始数据
  detailItems: unknown[];  // 详情页原始数据
  rawMeta?: Record<string, unknown>;
}
```

**输出**（交给 Controller）：
```ts
{
  platform: string;
  taskId: string;
  jobs: Array<{
    // Identity 层
    platform: string;
    platformJobId: string;
    platformCompanyId?: string;
    sourceUrl?: string;

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
  }>;
  adapterWarnings?: string[];
}
```

### 6.4 当前 Boss 的 Adapter 位置

当前 Boss 的 Adapter 逻辑隐含在以下位置：

1. **列表数据映射**：`crawler/extension/content.js` 中的 `scrapeJobs()` 函数，将 Boss API 响应映射为内部格式（`jobName` -> `encryptJobId`, `brandName`, `salaryDesc` 等）
2. **入库映射**：`controller/jobs-db.js` 中的 `insertOrUpdateJob()` / `batchInsertJobs()` 函数，将内部格式写入 scraped_jobs 表
3. **详情数据映射**：`crawler/extension/content.js` 中的 `getJobDetail()` 函数，将 Boss 详情 API 响应映射为标准化字段

**当前不做**：不为 Boss 提前抽象出独立的 Adapter 模块。Boss 的 Adapter 职责在第二平台 Adapter 实现时再同步提取。

### 6.5 与相关文档的关系

| 文档 | 关系 |
|------|------|
| `UNIFIED_JOB_MODEL_DRAFT.md` v0.1 | 本文档的上一版本，定义了 4 层模型和标准化规则 |
| `ADAPTER_EXECUTOR_INTERFACE_DRAFT.md` v0.1 | 定义了 Executor/Adapter/Controller 的职责边界和接口草案 |
| `MULTI_PLATFORM_PHASE_PRD.md` | 定义了 4 个目标平台和全平台阶段产品形态 |
| `PROJECT_PRD.md` | 项目总纲 |
| `docs/ARCHITECTURE.md` | 架构边界文档 |

---

## 附录 A：术语表

| 术语 | 说明 |
|------|------|
| UnifiedJobModel | 统一职位数据模型，跨平台标准化的职位数据结构 |
| Executor | 平台执行器，负责在平台环境中发起采集动作 |
| Adapter | 平台适配器，负责将平台原始数据映射为统一模型 |
| Normalized Core | 标准化核心层，所有平台必须提供的共有字段 |
| platformMetadata | 平台元数据，平台特有的扩展字段，以 JSON 存储 |
| Raw Source | 原始数据层，平台原始响应快照 |
| Enrichment | 数据补全，为职位/公司补充额外信息 |
| platformDedupeKey | 平台内去重键，基于 `(platform, platformJobId)` |
| crossPlatformCandidateKey | 跨平台候选去重键，基于标题+公司+城市+薪资 |

## 附录 B：版本变更记录

| 版本 | 日期 | 变更内容 |
|------|------|----------|
| v0.1 | 2026-03-24 | 初始草案（UNIFIED_JOB_MODEL_DRAFT.md），定义 4 层模型 |
| v2.0 | 2026-03-25 | 升级为 V2，补充完整字段映射表、去重键候选方案与推荐、数据迁移策略、与 Adapter/Executor 关系 |
