# 里程碑 M15：代码质量优化

> 状态：待开始 *(生命周期：待开始 → 进行中 → 阻塞 → [done])*
> 前置：[M14 工具栏按钮修复](./M14_TOOLBAR_BUTTON_FIX.md)
> 来源：M13 代码审查发现的 4 个隐患（排障报告 §7.1~7.4）

## 核心依赖

- M14 全部通过（视觉修复完成后再做优化）

## 宏观交付边界

- **不动 M10~M13 的已完成成果**
- **仅优化性能和修复数据约束**，不引入新功能
- **分 2 节点串行推进**：delivery_queue 性能 → 约束与网络优化
- 改动集中在 `controller/db.js` 和 `crawler/content.js`

## 节点路径与状态

| 节点 | 状态 | 角色 | 依赖 | 跳转 |
|------|------|------|------|------|
| [M15-N1：delivery_queue 性能优化](../nodes/M15_N1_DELIVERY_QUEUE_PERF.md) | 待开始 | 后端 | M13 全部 | → WP1~WP3 |
| [M15-N2：数据约束与网络优化](../nodes/M15_N2_CONSTRAINT_AND_NETWORK_FIX.md) | 待开始 | 后端 | M15-N1 | → WP1~WP3 |

## 执行拓扑

```
M13 全部 ──→ M15-N1（delivery_queue 性能优化，3 WP）──→ M15-N2（约束与网络优化，3 WP）
```

## 完成判定

### delivery_queue 性能
- [ ] `updateDeliveryPayloadCompanyFieldsByNormalizedName` 改为分页处理，不加载全表
- [ ] `ORDER BY datetime(created_at)` 全部替换为 `ORDER BY created_at`，命中索引
- [ ] 数据量 5000 条时调用无内存飙升

### 数据约束与网络
- [ ] `ai_configs` 表 `provider` 字段有 UNIQUE 约束
- [ ] `INSERT OR IGNORE` 能正确去重
- [ ] `executeInPageContext` 超时后底层 fetch 被 abort，无僵尸请求
