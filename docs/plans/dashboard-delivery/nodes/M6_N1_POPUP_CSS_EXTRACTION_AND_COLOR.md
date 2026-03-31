# 节点 M6-N1：CSS 提取 + PANTONE 换色

> 状态：待开始
> 归属里程碑：M6
> 目标：将 popup.html 内联样式提取为 popup.css，并替换为 6 PANTONE 色体系

---

## 业务角色导航

### 前端
- [ ] [M6-N1-WP1 CSS 提取与 PANTONE 换色](../workpacks/M6_N1_WP1_POPUP_CSS_EXTRACTION_AND_COLOR.md)
- [ ] [M6-N1-WP2 功能冒烟检测](../workpacks/M6_N1_WP2_POPUP_SMOKE_CHECK.md)

## 前置条件

- M3-N1 全部通过（manifest 和 popup 单例已实现）

## 边界

- 只修改 popup.html 和新建 popup.css
- 不修改 popup.js 的业务逻辑（仅调整样式引用）
- 不修改 background.js 或 content.js
