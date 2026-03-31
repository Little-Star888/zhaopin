# 节点 M4-N1：PANTONE 色值体系 + Neumorphism 暖色阴影

> 状态：待开始
> 归属里程碑：M4
> 目标：替换 8 色变量为 6 PANTONE 色，实现基于 Citron 的暖色调 Neumorphism

---

## 业务角色导航

### 前端
- [ ] [M4-N1-WP1 PANTONE 色值体系替换](../workpacks/M4_N1_WP1_PANTONE_COLOR_SYSTEM.md)
- [ ] [M4-N1-WP2 Neumorphism 暖色阴影实现](../workpacks/M4_N1_WP2_NEUMORPHISM_WARM_SHADOWS.md)

## 前置条件

- M3-N2 全部工作包通过
- 当前 `dashboard.css` 中 8 色变量存在且生效

## 边界

- 只修改 `dashboard.css` 中的 CSS 变量和阴影参数
- 不修改 HTML 结构（布局在 M4-N2 处理）
- 不修改 JS 逻辑
