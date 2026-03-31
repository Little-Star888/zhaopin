# 节点 M14-N4：51job 列表规模化

> 状态：待开始 *(生命周期：待开始 → 进行中 → 阻塞 → [done])*
> 里程碑：[M14 工具栏按钮修复与多平台爬虫稳定化](../milestones/M14_TOOLBAR_BUTTON_FIX.md)
> 来源：[智联/51job 稳定爬取方案 §阶段0+阶段3](../workpacks/M14_51JOB_STABILITY_STRATEGY.md)

## 核心依赖

- M14-N2 通过（detail_status 状态机 + 页码任务表可用）

## 宏观交付边界

- **修复 51job SPA 分页 Bug**：当前 `curr=N` URL 参数方式已被证实无效（51job 是 SPA，点击页码后 URL 不变），需改为页内点击翻页 + DOM 刷新校验
- **修复 jobId 提取 Bug**：移除 `extractJobId(window.location.href)` 错误 fallback
- **修复详情 URL 生成**：基于卡片 `sensorsdata` 字段还原详情 URL（jobId/pageCode/requestId/jobArea）
- 51job 列表支持基于页码任务表的 p1→pN 分页
- 列表去重生效
- 详情初始标记 `detail_status = 'skipped'`，但架构为后续状态化补抓预留
- DOM 结构签名校验防止页面改版导致静默空数据
- **当前阶段不尝试自动抓取 51job 详情**（风控触发率 > 80%）

## 已证实的真实发现（来自新版方案 §第二轮深度分析）

1. 51job 是 SPA 页面，翻页依赖前端状态切换而非 URL 参数
2. 列表卡片 `sensorsdata` 中稳定包含 `jobId / jobArea / pageCode / requestId / pageNum`
3. 详情 URL 关键参数映射已验证：
   - `jobId -> /{jobId}.html`
   - `pageCode = sou|sou|soulb -> s=sou_sou_soulb`
   - `requestId -> req=...`
   - `jobArea` 需映射到路径 slug（如 `北京·通州区 -> beijing-tzq`）
4. 当前代码 L444 的 `extractJobId(window.location.href)` 是错误 fallback（提取的是搜索页 URL 而非卡片）

## 工作包

| WP | 名称 | 角色 | 预估 | 跳转 |
|----|------|------|------|------|
| [WP1：51job SPA 分页修复与列表分页](../workpacks/M14_N4_WP1_51JOB_PAGINATION.md) | 后端 | ~60行JS | → 查看 |
| [WP2：51job 详情 URL 还原与状态化跳过](../workpacks/M14_N4_WP2_51JOB_DETAIL_SKIP.md) | 后端 | ~40行JS | → 查看 |
| [WP3：51job 列表规模化冒烟检测](../workpacks/M14_N4_WP3_51JOB_SMOKE.md) | 测试 | 手动 | → 查看 |

## 完成判定

- [ ] 51job 翻页使用页内点击方式，非 URL 参数方式
- [ ] 翻页后 DOM 刷新校验生效（等待 sensorsdata.pageNum 变化）
- [ ] 移除 `extractJobId(window.location.href)` 错误 fallback
- [ ] 51job 可稳定抓取多页列表（默认 p1，可配置 pN）
- [ ] 重复入库被唯一约束拦截
- [ ] 51job 岗位 `detail_status` 初始标记为 `skipped`
- [ ] 详情 URL 基于 sensorsdata 字段正确还原（验证生成格式）
- [ ] DOM 结构签名变化时触发告警而非静默返回空数据
