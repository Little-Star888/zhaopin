# 节点 M7-N3：Dashboard CSS+JS 全面重构

> 状态：待开始
> 归属里程碑：M7
> 目标：将 Dashboard 从 PANTONE+Neumorphism 重构为 Constructivism 风格，含手风琴展开、SVG 图形、简历双模式编辑

---

## 业务角色导航

### 前端
- [ ] [M7-N3-WP1 Dashboard CSS 完全重写](../workpacks/M7_N3_WP1_DASHBOARD_CSS_REWRITE.md)
- [ ] [M7-N3-WP2 CSS Grid 4列 + SVG 图形](../workpacks/M7_N3_WP2_GRID_LAYOUT_AND_SVG.md)
- [ ] [M7-N3-WP3 手风琴展开交互](../workpacks/M7_N3_WP3_ACCORDION_EXPANSION.md)
- [ ] [M7-N3-WP4 简历双模式编辑](../workpacks/M7_N3_WP4_RESUME_DUAL_MODE.md)

### 前后端联调
- [ ] [M7-N3-WP5 前后端简历编辑联调](../workpacks/M7_N3_WP5_RESUME_EDIT_INTEGRATION.md)

### 测试/检验
- [ ] [M7-N3-WP6 Dashboard 视觉回归检测](../workpacks/M7_N3_WP6_VISUAL_REGRESSION_CHECK.md)

## 前置条件

- M7-N1 通过（Popup CSS 模式已验证）
- M7-N2 通过（后端简历解析就绪）

## 边界

- 只修改 `dashboard.css`、`dashboard.js`、`dashboard.html`
- 不修改 `dashboard-api.js`（现有接口不动）
- 不修改后端代码
- 不引入任何新前端依赖

## 验收标准

- [ ] 首页呈 Suprematism 风格，CSS Grid 4列，黑色间隙
- [ ] 相邻卡片颜色不同（8色循环）
- [ ] 12个独特 SVG 图形占卡片约 50% 面积
- [ ] 点击卡片手风琴展开，同时只展开一个，占页面 40-50% 居中
- [ ] 简历区域支持结构化 HTML 渲染 ↔ Markdown 编辑切换
- [ ] 两个视图（默认缩小版、放大版）都可编辑简历
- [ ] 旧 Modal 弹窗逻辑已完全移除
- [ ] JS 中无 `.neu-*`、`.glass-*` 类名残留
