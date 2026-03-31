# 节点 M13-N1：采集控制修复

> 状态：待开始 *(生命周期：待开始 → 进行中 → 阻塞 → [done])*
> 里程碑：[M13 Bug修复与交互重构](../milestones/M13_BUGFIX_AND_INTERACTION.md)
> 排障记录：[2.1 停止按钮](../workpacks/M11_M12_MANUAL_CRAWL_DEBUG_REPORT_20260327.md)、[2.2 自动采集](../workpacks/M11_M12_MANUAL_CRAWL_DEBUG_REPORT_20260327.md)

## 核心依赖

- M12 全部通过

## 宏观交付边界

- 新增 `ENABLE_AUTO_BOOTSTRAP` 配置开关，控制是否注册自动 alarm
- 停止采集从"改状态位"升级为"可中断执行流程"（循环内检查标志位）
- 手动/自动模式的冷却和过滤策略初步拆分
- **不改 M10/M11/M12 的任何已完成功能**

## 工作包

| WP | 名称 | 角色 | 预估 | 跳转 |
|----|------|------|------|------|
| [WP1：ENABLE_AUTO_BOOTSTRAP 配置开关](../workpacks/M13_N1_WP1_AUTO_BOOTSTRAP_SWITCH.md) | 后端 | ~10行JS | → 查看 |
| [WP2：停止采集真实中断](../workpacks/M13_N1_WP2_STOP_CRAWL_FIX.md) | 后端 | ~15行JS | → 查看 |
| [WP3：手动/自动模式区分](../workpacks/M13_N1_WP3_MODE_SEPARATION.md) | 后端 | ~20行JS | → 查看 |
| [WP4：采集控制冒烟检测](../workpacks/M13_N1_WP4_CRAWL_CONTROL_SMOKE.md) | 测试 | 手动 | → 查看 |

## 完成判定

- [ ] `ENABLE_AUTO_BOOTSTRAP: false` 时，扩展刷新后不自动拉起采集
- [ ] `ENABLE_AUTO_BOOTSTRAP: true` 时，自动调度行为不受影响
- [ ] 点击停止后，详情循环和 sleep 可在下一个检查点中断
- [ ] 手动模式使用用户输入关键词，自动模式使用预设规则
- [ ] 手动模式冷却时间缩短到 3-5 分钟
