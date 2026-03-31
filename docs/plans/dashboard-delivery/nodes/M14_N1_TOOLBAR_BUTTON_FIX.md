# 节点 M14-N1：工具栏按钮视觉与状态修复

> 状态：待开始 *(生命周期：待开始 → 进行中 → 阻塞 → [done])*
> 里程碑：[M14 工具栏按钮修复](../milestones/M14_TOOLBAR_BUTTON_FIX.md)
> 来源：[工具栏按钮状态 Bug 分析](../workpacks/M16_BUTTON_STATE_BUG_ANALYSIS.md)

## 核心依赖

- M13 全部通过

## 宏观交付边界

- `.res-btn` 基础类统一 2px 透明边框占位
- `.res-btn--ai` 默认色从红色降为黑色/黄色
- JS 层添加防御性状态清理（可选）
- **不修改工具栏 HTML 结构**
- **不引入新的 CSS 状态类**（`--toggled`、`--flash` 等留后续里程碑）

## 工作包

| WP | 名称 | 角色 | 预估 | 跳转 |
|----|------|------|------|------|
| [WP1：CSS 样式修复](../workpacks/M14_N1_WP1_CSS_FIX.md) | 前端 | ~10行CSS | → 查看 |
| [WP2：JS 防御性逻辑](../workpacks/M14_N1_WP2_JS_DEFENSE.md) | 前端 | ~5行JS | → 查看 |
| [WP3：视觉回归冒烟检测](../workpacks/M14_N1_WP3_VISUAL_SMOKE.md) | 测试 | 手动 | → 查看 |

## 完成判定

- [ ] 所有按钮 `offsetHeight` 一致
- [ ] 首屏仅"编辑"为红色
- [ ] AI 按钮默认黑色，hover 变红
- [ ] disabled 态边框灰化
- [ ] 默认工具栏与分屏工具栏一致
- [ ] `toggleResumeMode()` 含决策边界注释
