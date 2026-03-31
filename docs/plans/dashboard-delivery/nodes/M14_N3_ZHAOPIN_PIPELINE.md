# 节点 M14-N3：智联完整链路

> 状态：待开始 *(生命周期：待开始 → 进行中 → 阻塞 → [done])*
> 里程碑：[M14 工具栏按钮修复与多平台爬虫稳定化](../milestones/M14_TOOLBAR_BUTTON_FIX.md)
> 来源：[智联/51job 稳定爬取方案 §阶段2](../workpacks/M14_51JOB_STABILITY_STRATEGY.md)

## 核心依赖

- M14-N2 通过（detail_status 状态机 + 页码任务表可用）

## 宏观交付边界

- 智联列表支持基于页码任务表的 p1→pN 分页（URL `/p{N}` 已验证可行）
- 数据提取以 `__INITIAL_STATE__` 为主数据源（已验证最可靠，20 条/页，100+ 字段/条）
- 岗位唯一键使用 `positionList[N].number` 字段（CC/CCL...J... 格式）
- 详情补全基于 `detail_status` 的 backlog 队列
- 连续失败熔断 + 指数退避自动降级
- 详情页数据从 `__INITIAL_STATE__.jobInfo.jobDetail` 提取（已验证 3/3 成功，描述 5K+ 字符）
- 抓取参数（每批预算、间隔）可通过 runtime_config 调整
- **不修改 51job 采集代码**

## 已证实的真实发现（来自新版方案 §第四轮实际爬取尝试）

1. `__INITIAL_STATE__` 长度 208K+ 字符，包含完整的 `positionList` 数组
2. 每个岗位 100+ 字段（name, number, companyName, salary60, salaryReal, workCity, education, workingExp, jobSummary, positionUrl 等）
3. 分页 p1→p2→p3 已验证：共 60 条，去重后 58 唯一，p2 仅 2 条与 p1 重复
4. 详情页 3/3 成功：`detailedPosition.description` 纯文本 5K+ 字符，`detailedCompany.companyDescription` 500-1000 字
5. 单 session 7 页面（3 列表 + 3 详情 + 1 搜索）未触发风控
6. requests 直接请求和 AJAX API 直取均已验证失败（需浏览器渲染）

## 工作包

| WP | 名称 | 角色 | 预估 | 跳转 |
|----|------|------|------|------|
| [WP1：智联列表分页与数据提取](../workpacks/M14_N3_WP1_ZHAOPIN_PAGINATION.md) | 后端 | ~50行JS | → 查看 |
| [WP2：智联详情 backlog 与自动降级](../workpacks/M14_N3_WP2_ZHAOPIN_BACKLOG.md) | 后端 | ~50行JS | → 查看 |
| [WP3：智联完整链路冒烟检测](../workpacks/M14_N3_WP3_ZHAOPIN_SMOKE.md) | 测试 | 手动 | → 查看 |

## 完成判定

- [ ] 智联可稳定抓取多页列表（默认 p1，可配置 pN）
- [ ] 列表数据从 `__INITIAL_STATE__.positionList` 提取
- [ ] 页终止条件生效（空页/高重复率/连续无新）
- [ ] 详情 backlog 按 `pending > anti_bot > error` 优先级消费
- [ ] 详情页描述从 `__INITIAL_STATE__.jobInfo.jobDetail.detailedPosition.description` 提取
- [ ] 连续 2-3 次详情失败后自动降级为列表模式
- [ ] 指数退避策略生效（5min → 30min → 2h → 24h）
- [ ] 每批详情预算参数可通过 runtime_config 调整
