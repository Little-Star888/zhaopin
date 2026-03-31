# 节点 M13-N2：首页数据展示修复

> 状态：待开始 *(生命周期：待开始 → 进行中 → 阻塞 → [done])*
> 里程碑：[M13 Bug修复与交互重构](../milestones/M13_BUGFIX_AND_INTERACTION.md)
> 排障记录：[2.5 首页旧数据](../workpacks/M11_M12_MANUAL_CRAWL_DEBUG_REPORT_20260327.md)、[2.8 首页闪动](../workpacks/M11_M12_MANUAL_CRAWL_DEBUG_REPORT_20260327.md)

## 核心依赖

- M13-N1 通过（控制链路稳定，手动采集可执行）

## 宏观交付边界

- 首页从"全库视图"切换为"本次采集结果视图"
- 采集开始时自动进入批次模式，首页只展示当前 `crawl_batch_id` 的数据
- 保留"全部岗位"入口
- 静默刷新机制继续沿用，数据不变不重渲染
- 后端 `/api/jobs` 接口增加可选 `batch_id` 查询参数

## 工作包

| WP | 名称 | 角色 | 预估 | 跳转 |
|----|------|------|------|------|
| [WP1：首页批次视图](../workpacks/M13_N2_WP1_BATCH_VIEW.md) | 前端、后端 | ~40行JS+10行SQL | → 查看 |
| [WP2：静默刷新确认](../workpacks/M13_N2_WP2_SILENT_REFRESH.md) | 前端 | 验收 | → 查看 |
| [WP3：首页数据展示冒烟检测](../workpacks/M13_N2_WP3_HOME_DATA_SMOKE.md) | 测试 | 手动 | → 查看 |

## 完成判定

- [ ] 手动采集开始后，首页自动切换到当前批次视图
- [ ] 首页只展示当前 `crawl_batch_id` 的数据
- [ ] 用户可通过入口切换回"全部岗位"视图
- [ ] 5 秒轮询刷新时首页不闪动
- [ ] 数据不变时不触发 DOM 重渲染
