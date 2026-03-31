# 节点 M7-N1：Popup Constructivism 风格 PoC

> 状态：待开始
> 归属里程碑：M7
> 目标：将 Popup 从 PANTONE+Neumorphism 重写为 Constructivism 风格，作为全量改造的 PoC

---

## 业务角色导航

### 前端
- [ ] [M7-N1-WP1 Constructivism 色彩体系替换](../workpacks/M7_N1_WP1_CONSTRUCTIVISM_COLOR_SYSTEM.md)
- [ ] [M7-N1-WP2 Popup CSS 完全重写](../workpacks/M7_N1_WP2_POPUP_CSS_REWRITE.md)
- [ ] [M7-N1-WP3 Popup JS 类名迁移](../workpacks/M7_N1_WP3_POPUP_JS_CLASSNAME_MIGRATION.md)

### 测试/检验
- [ ] [M7-N1-WP4 Popup 冒烟检测](../workpacks/M7_N1_WP4_POPUP_SMOKE_CHECK.md)

## 前置条件

- M6-N2 全部工作包通过
- `popup.css` 中 PANTONE 变量存在且生效

## 边界

- 只修改 `popup.css`、`popup.js`、`popup.html`
- 不修改 `dashboard.*` 文件
- 不修改后端代码
- 不引入任何新依赖

## 验收标准

- [ ] Popup 打开后呈现 Constructivism 风格（红/黑/黄/米白配色）
- [ ] 所有 `box-shadow`、`backdrop-filter`、`border-radius` 已清除
- [ ] 全局应用 `border: 3px solid #1A1A1A`、`border-radius: 0`
- [ ] JS 中无 `.neu-*`、`.glass-*` 类名引用残留
- [ ] 现有功能（采集启动、配置、Cookie刷新）不受影响
