# 节点 M15-N1：delivery_queue 性能优化

> 状态：待开始 *(生命周期：待开始 → 进行中 → 阻塞 → [done])*
> 里程碑：[M15 代码质量优化](../milestones/M15_CODE_QUALITY_OPTIMIZATION.md)
> 来源：排障报告 [7.1 全表内存溢出](../workpacks/M11_M12_MANUAL_CRAWL_DEBUG_REPORT_20260327.md)、[7.2 索引失效](../workpacks/M11_M12_MANUAL_CRAWL_DEBUG_REPORT_20260327.md)

## 核心依赖

- M13 全部通过

## 宏观交付边界

- `updateDeliveryPayloadCompanyFieldsByNormalizedName` 改为分页处理
- `ORDER BY datetime(created_at)` 全部替换为 `ORDER BY created_at`
- **不修改 delivery_queue 表结构**

## 工作包

| WP | 名称 | 角色 | 预估 | 跳转 |
|----|------|------|------|------|
| [WP1：全表查询分页改造](../workpacks/M15_N1_WP1_DELIVERY_PAGINATION.md) | 后端 | ~30行JS | → 查看 |
| [WP2：datetime 索引修复](../workpacks/M15_N1_WP2_INDEX_FIX.md) | 后端 | ~10行SQL | → 查看 |
| [WP3：delivery_queue 性能冒烟检测](../workpacks/M15_N1_WP3_DELIVERY_PERF_SMOKE.md) | 测试 | 手动 | → 查看 |

## 完成判定

- [ ] `updateDeliveryPayloadCompanyFieldsByNormalizedName` 使用分页查询
- [ ] 数据量 5000 条时调用无内存飙升
- [ ] `getDeliveryStats` 等查询命中 `idx_delivery_created` 索引
