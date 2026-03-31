# Boss 专用逻辑边界标注

> 日期：2026-03-25 | 基于：Adapter/Executor 接口 V2 (`ADAPTER_EXECUTOR_V2.md`)
> 状态：Design Reference | 所属阶段：M5-N1 (Phase B - 纯设计文档)

---

## 1. 标注概览

| 文件 | P0 标注数 | P1 标注数 | P2 标注数 | SHARED 标注数 |
|------|-----------|-----------|-----------|---------------|
| `crawler/extension/content.js` | 6 | 1 | 2 | 0 |
| `crawler/extension/background.js` | 8 | 4 | 2 | 3 |
| `crawler/extension/manifest.json` | 3 | 0 | 0 | 0 |
| `controller/server.js` | 2 | 1 | 0 | 12 |
| `controller/jobs-handler.js` | 0 | 0 | 0 | 4 |
| `controller/jobs-db.js` | 0 | 0 | 0 | 11 |
| `controller/db.js` | 0 | 0 | 0 | 10 |
| `crawler/extension/dashboard.js` | 0 | 0 | 1 | 5 |
| **合计** | **19** | **6** | **5** | **45** |

---

## 2. P0 标注详情（阻塞主流程 -- 必须抽象）

### 2.1 content.js（6 处）

| 行号范围 | 逻辑描述 | 硬编码内容 | 抽象建议 |
|----------|----------|-----------|----------|
| 70 | 搜索 API URL 构造 | `` `https://www.zhipin.com/wapi/zpgeek/search/joblist.json?${params}` `` | 抽象为 Executor 内部的 `buildSearchUrl(params)` 方法，URL 模板放入平台配置 |
| 57-64 | 搜索请求参数名 | `scene`, `query`, `city`, `page`, `pageSize`, `_`, `experience` | 参数名是 Boss wapi 规范，抽象为 Executor 内部的参数映射逻辑 |
| 76-81 | 请求头设置 | `Referer: 'https://www.zhipin.com/web/geek/job'`, `X-Requested-With`, `credentials: 'include'` | Boss 特有的 Cookie/Referer 策略，抽象到 Executor 的请求构造器 |
| 87-97 | 错误码判断 | `data.code !== 0` 判断，`code=35/37` 反爬码（在 background.js 进一步处理） | 抽象到 Executor 的错误分类逻辑 |
| 99-120 | 列表字段映射 | `jobName`, `brandName`, `salaryDesc`, `locationName`, `encryptJobId`, `encryptBrandId`, `bossName`, `bossTitle`, `securityId`, `lid`, `jobExperience`, `jobDegree`, `skills`, `brandIndustry`, `brandStageName`, `brandScaleName` | **核心 P0** -- 这是 `BossAdapter.adapt()` 的主体，需完整提取为字段映射表 |
| 149-158, 173-178 | 详情 API URL 构造 | `https://www.zhipin.com/wapi/zpgeek/job/card.json` 和 `detail.json` | 抽象为 Executor 内部的端点列表配置，双端点降级逻辑封装到 `fetchJobDetail()` |

### 2.2 background.js（8 处）

| 行号范围 | 逻辑描述 | 硬编码内容 | 抽象建议 |
|----------|----------|-----------|----------|
| 651-654 | 标签页创建 -- 目标 URL | `url: 'https://www.zhipin.com/web/geek/job'` | 抽象为 Executor 的 `getEntryPoint()` 方法 |
| 1046-1048 | Content Script 恢复 -- URL 检查 | `tab.url.startsWith('https://www.zhipin.com/')` | 抽象为 Executor 的 `canExecute(url)` 方法 |
| 667-672 | 搜索参数传递 | `cityCode`, `pageSize`, `experience` 参数格式（Boss wapi 规范） | 抽象为 Executor 的搜索参数映射 |
| 1701-1708 | Content Script 消息协议 | `{ type: 'SCRAPE_JOBS', keyword, cityCode, pageSize, experience, page }` | 消息协议是 Boss Chrome 扩展特有的，抽象为 Executor 内部通信细节 |
| 1801-1805 | 详情请求参数 | `{ type: 'GET_JOB_DETAIL', securityId, lid }` | 同上，`securityId`/`lid` 是 Boss 特有的详情定位参数 |
| 1213-1257 | 飞书字段标准化（`normalizeForFeishu`） | 直接读取 Boss 字段名：`job.jobName`, `job.brandName`, `job.salaryDesc`, `job.bossName`, `job.encryptJobId` 等 | **核心 P0** -- 这是 `BossAdapter` 的输出格式化逻辑，需与 `adapt()` 协同抽象 |
| 1225-1227 | 职位链接构造 | `` `https://www.zhipin.com/job_detail/${job.encryptJobId}.html` `` | Boss 特有的 URL 格式，抽象到 Adapter 的 `sourceUrl` 生成逻辑 |
| 2244-2257 | 反爬错误关键词检测 | `'环境异常'`, `'环境存在异常'`, `'操作频繁'`, `'请稍后重试'`, `'访问过快'` | Boss 特有的反爬关键词，抽象到 Executor 的错误分类模块 |

### 2.3 manifest.json（3 处）

| 行号范围 | 逻辑描述 | 硬编码内容 | 抽象建议 |
|----------|----------|-----------|----------|
| 13-16 | host_permissions | `"https://www.zhipin.com/*"`, `"https://open.feishu.cn/*"` | Boss 扩展权限声明，多平台时需为每个平台创建独立扩展或动态权限 |
| 22-24 | content_scripts.matches | `"https://www.zhipin.com/*"` | Boss 域名匹配规则，多平台时需扩展 |
| 4-5 | 扩展名称和描述 | `"Boss直聘职位采集器"` | 需泛化为平台无关的名称 |

### 2.4 server.js（2 处）

| 行号范围 | 逻辑描述 | 硬编码内容 | 抽象建议 |
|----------|----------|-----------|----------|
| 50-61 | 城市代码映射 | `CITY_CODE_MAP` 使用 Boss 城市编码格式（如 `101010100` 代表北京） | **关键 P0** -- 城市代码是 Boss wapi 规范，其他平台使用不同编码。应抽象为 `PlatformExecutor` 的城市参数解析逻辑，Controller 只传递城市名称 |
| 774-788 | `/report-detail` 端点 -- Boss 字段引用 | `job.encryptJobId`, `job.payload` 中的 Boss 原始字段名 | 依赖 Boss Adapter 的输出格式。抽象后此处应使用 `UnifiedJob.platformJobId` 而非 `encryptJobId` |

---

## 3. P1 标注详情（影响功能但可降级处理）

### 3.1 content.js（1 处）

| 行号范围 | 逻辑描述 | 硬编码内容 | 抽象建议 |
|----------|----------|-----------|----------|
| 203-218 | 详情字段兼容映射 | `postDescription || jobDescription`, `skills || showSkills || skillList`, `welfareList || welfare`, `address || location`, `experienceName || jobExperience`, `degreeName || jobDegree` | Boss `card.json` 和 `detail.json` 两个端点的字段差异兼容。降级方案：优先使用稳定端点，仅当数据缺失时尝试备选 |

### 3.2 background.js（4 处）

| 行号范围 | 逻辑描述 | 硬编码内容 | 抽象建议 |
|----------|----------|-----------|----------|
| 48-56 | 反爬策略配置 | `ANTI_CRAWL_CODES: [35, 37]`, `COOLDOWN_TIME: 30000`, `BASE_DELAY: 8000` | Boss 特有的反爬阈值。其他平台可能有不同的错误码和延迟策略，抽象到 Executor 的反爬配置 |
| 2035-2068 | 反爬状态机 | `cooldown_1h -> cooldown_4h -> blocked_today` 逐级升级逻辑 | Boss 特有的反爬恢复策略。其他平台可能有不同的封禁模式，抽象到 Executor |
| 1798-1829 | 详情重试策略 | `maxRetries = 2`, 重试延迟 `8000 + random * 5000` | Boss 特有的重试参数，抽象到 Executor 的重试配置 |
| 1218 | 来源平台硬编码 | `this.matchSingleSelect('Boss直聘', optionDict['来源平台'])` | 飞书选项字典中硬编码平台名称，应从 Adapter 的 `platformId` 动态获取 |

### 3.3 server.js（1 处）

| 行号范围 | 逻辑描述 | 硬编码内容 | 抽象建议 |
|----------|----------|-----------|----------|
| 64-76 | 城市名标准化 | `normalizeCity()` 依赖 `CITY_CODE_MAP`（Boss 编码） | 当引入新平台时，城市标准化需支持多种编码体系。建议 Controller 统一使用城市名称，由 Executor 内部解析为平台编码 |

---

## 4. P2 标注详情（边缘场景）

### 4.1 content.js（2 处）

| 行号范围 | 逻辑描述 | 硬编码内容 | 抽象建议 |
|----------|----------|-----------|----------|
| 6-12 | 日志前缀 | `[BossScraper]` | 调试日志标识，低优先级。多平台时可改为 `[PlatformScraper]` |
| 9 | DEBUG 开关 | `const DEBUG = false` | 开发调试配置，不影响平台抽象 |

### 4.2 background.js（2 处）

| 行号范围 | 逻辑描述 | 硬编码内容 | 抽象建议 |
|----------|----------|-----------|----------|
| 24 | CODE_VERSION | `crawler-extension-v${version}-20260321-p6-qfix` | 版本标识包含日期和修复标记，低优先级 |
| 330 | 启动日志 | `CODE_VERSION`, `PIPELINE_VERSION`, `JOB_FILTER_MODE` | 启动信息输出，低优先级 |

### 4.3 dashboard.js（1 处）

| 行号范围 | 逻辑描述 | 硬编码内容 | 抽象建议 |
|----------|----------|-----------|----------|
| 98-103, 178-183, 439-450 | 平台名称映射 | `platformNames = { 'boss': 'Boss直聘', 'liepin': '猎聘', '51job': '前程无忧', 'zhilian': '智联招聘' }` | 已有多平台映射表（含 liepin/51job/zhilian），但当前仅 `boss` 有实际数据。建议提取为独立配置模块 |

---

## 5. 共享代码清单

### 5.1 可直接复用的代码（无需抽象）

| 文件 | 代码/模块 | 说明 |
|------|-----------|------|
| `controller/server.js` | HTTP 服务器框架、CORS 处理（行 278-289） | 服务器基础设施，与平台无关 |
| `controller/server.js` | 任务队列管理（`/enqueue`, `/queue`, `/claim`, `/report`） | 队列编排逻辑已使用通用 task 结构，不依赖平台 |
| `controller/server.js` | `/runtime-config` 端点 | 运行时配置管理，平台无关 |
| `controller/server.js` | `/pause`, `/resume`, `/status`, `/start` 端点 | 调度控制，平台无关 |
| `controller/server.js` | `/reset`, `/seed`, `/export` 测试端点 | 测试工具，平台无关 |
| `controller/server.js` | 投递告警系统（行 235-276） | 通用告警框架，基于 `delivery_queue` 状态 |
| `controller/jobs-handler.js` | 全部 4 个 API 端点 | 完全基于 `scraped_jobs` 表操作，使用通用字段名（`platform`, `platformJobId`, `title`, `company`） |
| `controller/jobs-db.js` | 全部 CRUD 函数 | 使用 `platform` + `platformJobId` 作为联合唯一键，已平台无关 |
| `controller/db.js` | 数据库初始化和 Schema 迁移 | `delivery_queue`, `company_profile_cache`, `scraped_jobs`, `resumes` 表均为通用结构 |
| `controller/db.js` | `delivery_queue` 状态机 | `pending -> sending -> sent/failed/retrying/abandoned`，平台无关 |
| `controller/db.js` | 公司信息补全（enrichment）相关函数 | 基于 `company_profile_cache` 表，平台无关 |
| `controller/db.js` | 工具函数（`normalizeSqliteDate`, `safeJsonParse`, `normalizePositiveInteger` 等） | 纯工具函数，平台无关 |
| `crawler/extension/dashboard.js` | 路由系统、Toast、Modal、文件上传 | 前端 UI 框架，与数据来源无关 |
| `crawler/extension/dashboard.js` | 职位卡片渲染（`renderJobCard`） | 使用通用字段（`title`, `company`, `location`, `salary`, `experience`, `education`） |
| `crawler/extension/dashboard.js` | 待投递列表（`renderDeliveryItem`） | 使用通用字段，已包含多平台名称映射 |

### 5.2 已按多平台设计的结构

| 位置 | 说明 |
|------|------|
| `scraped_jobs` 表（db.js 行 846-866） | 已包含 `platform` 字段和 `UNIQUE(platform, platformJobId)` 约束 |
| `dashboard.js` `platformNames` 映射 | 已预留 `boss`/`liepin`/`51job`/`zhilian` 四个平台 |
| `jobs-db.js` 所有查询函数 | 已支持 `platform` 过滤参数 |
| `jobs-handler.js` `handleGetJobs` | 已支持 `platform` 查询参数 |

---

## 6. 抽象风险点

| 风险 | 涉及文件 | 原因 | 应对 |
|------|----------|------|------|
| **R1: content.js 与 background.js 的消息协议紧耦合** | `content.js` (行 15-51), `background.js` (行 1701-1708, 1801-1805) | `SCRAPE_JOBS` / `GET_JOB_DETAIL` 消息类型和参数结构是 Boss Chrome 扩展特有的。若新平台不走 Chrome 扩展（如 Playwright/HTTP），消息协议完全不同 | 将消息协议封装为 Executor 内部实现细节。对外暴露 `fetchJobList()` / `fetchJobDetail()` 标准接口。Chrome 扩展通信层仅作为 BossExecutor 的私有实现 |
| **R2: normalizeForFeishu 既是 Adapter 又包含 Controller 逻辑** | `background.js` (行 1213-1257) | 该函数同时完成：(1) Boss 字段到飞书字段的映射（Adapter 职责），(2) 飞书选项字典白名单过滤（Delivery 职责）。两步耦合在一个函数中 | 拆分为两步：Adapter 只输出 `UnifiedJob`；Controller 侧的 Delivery Worker 负责将 `UnifiedJob` 映射为飞书字段格式并执行选项过滤 |
| **R3: 城市代码体系不可通用** | `server.js` (行 50-61), `background.js` (行 29-34) | Boss 使用天气编码格式的城市代码（如 `101010100`），其他平台可能使用不同编码。`CITY_CODE_MAP` 在两处重复定义 | Controller 统一使用城市名称（如 "北京"），由各平台 Executor 内部维护城市名称到平台编码的映射表。消除 `CITY_CODE_MAP` 的重复定义 |
| **R4: 反爬策略平台差异大** | `background.js` (行 48-56, 2244-2257, 2035-2068) | Boss 的反爬错误码（35/37）、关键词（"环境异常"等）、状态机升级策略是 Boss 特有的。其他平台可能有完全不同的风控机制 | 将反爬策略抽象为 Executor 的 `AntiCrawlStrategy` 配置对象，包含：错误码列表、关键词列表、延迟参数、状态机升级规则。Controller 只关心 Executor 返回的 `partial/partialReason` 标志 |
| **R5: delivery_queue 的 payload 字段包含 Boss 原始结构** | `background.js` (行 1213-1257), `server.js` (行 774-788) | 当前 `delivery_queue.payload` 存储的是 `normalizeForFeishu()` 的输出，其中字段名是 Boss 特有的中文名（如 "职位名称"、"公司名称"）。这是飞书多维表格的 schema，而非 Boss API schema | 该 payload 是飞书 Delivery Worker 的输入格式，与平台无关（已通过 Adapter 转换）。但 `encryptJobId` 仍作为 `dedupeKey` 使用（server.js 行 783），应改为 `platformJobId` |
| **R6: Chrome 扩展运行环境不可复用** | `manifest.json`, `background.js` 全文 | Boss 走 Chrome 扩展（Service Worker + Content Script），依赖 `chrome.tabs`, `chrome.scripting`, `chrome.storage` 等 API。其他平台可能走 Playwright 或 HTTP API | 运行环境差异是 Executor 的核心抽象点。BossExecutor 封装 Chrome 扩展细节，其他平台实现各自的 Executor。Controller 通过统一的 `PlatformExecutor` 接口交互，不感知底层运行环境 |

---

## 附录 A：Boss 字段映射速查表

基于 `content.js` 的字段映射逻辑，供 `BossAdapter.adapt()` 实现参考。

### 列表映射（content.js 行 102-120）

| Boss API 字段 | UnifiedJob 字段 | 说明 |
|---------------|-----------------|------|
| `encryptJobId` | `platformJobId` | Boss 加密职位 ID，用于去重 |
| `encryptBrandId` | `platformCompanyId` | Boss 加密公司 ID |
| `jobName` | `title` | 职位名称 |
| `brandName` | `company` | 公司名称 |
| `salaryDesc` | `salary` | 薪资描述 |
| `locationName` / `cityName` | `location` | 工作地点 |
| `areaDistrict` | `platformMetadata.areaDistrict` | 区域（Boss 特有） |
| `jobExperience` | `experience` | 经验要求 |
| `jobDegree` | `education` | 学历要求 |
| `bossName` | `platformMetadata.bossName` | HR 姓名（Boss 特有） |
| `bossTitle` | `platformMetadata.bossTitle` | HR 头衔（Boss 特有） |
| `skills` | `platformMetadata.skills` | 技能标签 |
| `brandIndustry` | `platformMetadata.brandIndustry` | 行业领域 |
| `brandStageName` | `platformMetadata.brandStageName` | 融资阶段 |
| `brandScaleName` | `platformMetadata.brandScaleName` | 公司规模 |
| `securityId` | `rawFields.securityId` | 详情请求参数（Boss 特有） |
| `lid` | `rawFields.lid` | 详情请求参数（Boss 特有） |

### 详情映射（content.js 行 204-241）

| Boss API 字段 | UnifiedJob 字段 | 说明 |
|---------------|-----------------|------|
| `postDescription` / `jobDescription` | `description` | 职位描述（两个端点字段名不同） |
| `jobLabels` (join ' \| ') | `platformMetadata.hardRequirements` | 硬性要求 |
| `skills` / `showSkills` / `skillList` | `platformMetadata.skills` | 技能标签（三个端点字段名不同） |
| `address` / `location` | `platformMetadata.address` | 工作地址 |
| `welfareList` / `welfare` | `platformMetadata.welfareList` | 福利标签 |
| `experienceName` / `jobExperience` | `experience` | 经验要求（两个端点字段名不同） |
| `degreeName` / `jobDegree` | `education` | 学历要求（两个端点字段名不同） |
| `zpData.bossInfo.name` | `platformMetadata.bossName` | HR 姓名（仅 detail.json） |
| `zpData.bossInfo.title` | `platformMetadata.bossTitle` | HR 头衔（仅 detail.json） |

---

## 附录 B：与 ADAPTER_EXECUTOR_V2.md 的对照

本文档的 P0 标注与 `ADAPTER_EXECUTOR_V2.md` 第 5 节 "Boss 实现映射分析" 完全对齐：

| 本文档 P0 标注 | ADAPTER_EXECUTOR_V2 接口方法 | 映射难度 |
|---------------|---------------------------|----------|
| content.js 行 70, 149-158（URL 构造） | `BossExecutor.fetchJobList()` / `fetchJobDetail()` | 中 |
| content.js 行 99-120, 204-241（字段映射） | `BossAdapter.adapt()` / `extract()` | 低 |
| background.js 行 651-654（标签页 URL） | `BossExecutor.canExecute()` | 低 |
| background.js 行 1046-1048（URL 检查） | `BossExecutor.canExecute()` | 低 |
| background.js 行 1213-1257（飞书标准化） | `BossAdapter` 输出 + Delivery Worker | 中 |

`ADAPTER_EXECUTOR_V2.md` 结论：5 个接口方法中 3 个为低难度，2 个为中难度，0 个高难度。本边界标注验证了该评估。
