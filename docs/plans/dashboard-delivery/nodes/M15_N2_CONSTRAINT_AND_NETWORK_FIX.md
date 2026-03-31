# 节点 M15-N2：数据约束与网络优化

> 状态：待开始 *(生命周期：待开始 → 进行中 → 阻塞 → [done])*
> 里程碑：[M15 代码质量优化](../milestones/M15_CODE_QUALITY_OPTIMIZATION.md)
> 来源：排障报告 [7.3 UNIQUE 约束](../workpacks/M11_M12_MANUAL_CRAWL_DEBUG_REPORT_20260327.md)、[7.4 fetch 泄漏](../workpacks/M11_M12_MANUAL_CRAWL_DEBUG_REPORT_20260327.md)

## 核心依赖

- M15-N1 通过（delivery_queue 性能问题已修复）

## 宏观交付边界

- `ai_configs` 表增加 UNIQUE 约束
- `executeInPageContext` 的 fetch 绑定 AbortController
- **不修改 ai_configs 的业务逻辑**

## 工作包

| WP | 名称 | 角色 | 预估 | 跳转 |
|----|------|------|------|------|
| [WP1：ai_configs UNIQUE 约束](../workpacks/M15_N2_WP1_UNIQUE_CONSTRAINT.md) | 后端 | ~1行DDL | → 查看 |
| [WP2：fetch AbortController 绑定](../workpacks/M15_N2_WP2_FETCH_ABORT.md) | 后端 | ~10行JS | → 查看 |
| [WP3：约束与网络冒烟检测](../workpacks/M15_N2_WP3_CONSTRAINT_NETWORK_SMOKE.md) | 测试 | 手动 | → 查看 |

## 完成判定

- [ ] `ai_configs` 表 `provider` 字段有 UNIQUE 约束
- [ ] 重复插入 `INSERT OR IGNORE` 正确去重
- [ ] `executeInPageContext` 超时后底层 fetch 被 abort
- [ ] Chrome DevTools Network 面板无僵尸 pending 请求
