# 节点 M14-N2：数据与调度基础设施

> 状态：**DDL 已完成，待运行时验证** *(生命周期：待开始 → 进行中 → 阻塞 → [done])*
> 里程碑：[M14 工具栏按钮修复与多平台爬虫稳定化](../milestones/M14_TOOLBAR_BUTTON_FIX.md)
> 来源：[智联/51job 稳定爬取方案 §统一后实施方案-四](../workpacks/M14_51JOB_STABILITY_STRATEGY.md)

## 核心依赖

- M13 全部通过

## 宏观交付边界

- ~~新增 `detail_status` 状态机组（5 个字段）到 `scraped_jobs` 表~~ ✅ v11 migration 已实现
- ~~新增页码任务表（`crawl_page_tasks`）~~ ✅ v12 migration 已实现
- ~~`platform + platformJobId` 唯一约束去重~~ ✅ v12 migration 已实现
- 基于 localStorage 的断点恢复机制
- **不修改现有入库流程的核心逻辑**

## 已实现内容（2026-03-28 核实）

经核对 `controller/db.js`，以下 migration 已全部实现：

| migration | 位置 | 内容 | 状态 |
|-----------|------|------|------|
| v11 | L1047-1075 | detail_status 5 字段 + 2 索引 | ✅ 已实现 |
| v12 | L1077-1110 | crawl_page_tasks 表 + scraped_jobs 唯一索引 | ✅ 已实现 |

migration 链完整调用（L120-127），服务启动时会自动执行。

## 工作包

| WP | 名称 | 角色 | 预估 | 状态 | 跳转 |
|----|------|------|------|------|------|
| [WP1：detail_status 状态机](../workpacks/M14_N2_WP1_DETAIL_STATUS.md) | 后端 | ~20行DDL+10行JS | ✅ DDL已完成 | → 查看 |
| [WP2：页码任务表与去重](../workpacks/M14_N2_WP2_PAGE_TASK_DEDUP.md) | 后端 | ~30行DDL+20行JS | ✅ DDL已完成 | → 查看 |
| [WP3：基础设施冒烟检测](../workpacks/M14_N2_WP3_INFRA_SMOKE.md) | 测试 | 手动 | 待验证 | → 查看 |

## 完成判定

- [x] `scraped_jobs` 表包含 `detail_status`、`detail_attempt_count`、`last_detail_attempt_at`、`next_detail_retry_at`、`detail_error_code` 五个字段（v11）
- [x] `crawl_page_tasks` 表 DDL 已定义，支持 pending/running/done/failed 四种状态（v12）
- [x] 重复入库唯一约束 `idx_scraped_jobs_platform_job_id` 已定义（v12）
- [ ] 数据库 schema 已在生产环境生效（需启动服务验证）
- [ ] 断点恢复可在扩展刷新后继续未完成的页码任务（需运行时验证）
