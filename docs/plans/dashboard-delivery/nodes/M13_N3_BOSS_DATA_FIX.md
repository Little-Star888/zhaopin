# 节点 M13-N3：Boss 数据修复

> 状态：待开始 *(生命周期：待开始 → 进行中 → 阻塞 → [done])*
> 里程碑：[M13 Bug修复与交互重构](../milestones/M13_BUGFIX_AND_INTERACTION.md)
> 排障记录：[2.3 Boss链接](../workpacks/M11_M12_MANUAL_CRAWL_DEBUG_REPORT_20260327.md)、[2.4 统计口径](../workpacks/M11_M12_MANUAL_CRAWL_DEBUG_REPORT_20260327.md)

## 核心依赖

- M13-N1 通过（控制链路稳定，可正常触发采集进行验证）

## 宏观交付边界

- content.js 构造 Boss 详情页 URL（`encryptJobId + securityId`）
- 统计口径需先做数据验证，确认根因后再修复
- **不修改 scraped_jobs 表结构**

## 工作包

| WP | 名称 | 角色 | 预估 | 跳转 |
|----|------|------|------|------|
| [WP1：Boss URL 构造](../workpacks/M13_N3_WP1_BOSS_URL_BUILD.md) | 后端 | ~5行JS | → 查看 |
| [WP2：统计口径验证与修正](../workpacks/M13_N3_WP2_STATS_FIX.md) | 后端 | ~15行JS | → 查看 |
| [WP3：Boss 数据修复冒烟检测](../workpacks/M13_N3_WP3_BOSS_DATA_SMOKE.md) | 测试 | 手动 | → 查看 |

## 完成判定

- [ ] Boss 岗位显示可访问的原链接（无链接时显示"暂无原链接"）
- [ ] "入库 N 条"的统计与 UI 展示一致
- [ ] 如果"含描述条数"统计仍不准确，已临时隐藏该统计项
- [ ] 构造 URL 在实际环境中可正常访问（或已切换到 DOM 提取方案）
