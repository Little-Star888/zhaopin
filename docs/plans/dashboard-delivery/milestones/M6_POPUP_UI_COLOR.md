# 里程碑 M6：插件 Popup UI 色调与样式重构

> 状态：待开始
> 对应 PRD 阶段：Phase A 补充（UI 统一）
> 前置里程碑：M4（Dashboard UI 重构）、M3（扩展入口与收口）
> 规划日期：2026-03-25

---

## 1. 里程碑目标

将插件 Popup UI 从当前的绿色主题替换为 6 PANTONE 色体系，与 Dashboard 视觉统一：
1. 提取 popup.html 内联样式为独立 popup.css
2. 替换为 6 PANTONE 色体系 + Orange Rust 主色
3. 引入轻量级 Neumorphism 风格
4. 保持所有功能不变

## 2. 范围边界

### 允许修改

| 文件 | 说明 |
|------|------|
| `crawler/extension/popup.html` | 删除内联样式，引用 popup.css |
| `crawler/extension/popup.js` | 如需调整样式相关的 JS 逻辑 |
| `crawler/extension/manifest.json` | 如需引用新的 popup.css（确认是否已引用） |

### 新增文件

| 文件 | 说明 |
|------|------|
| `crawler/extension/popup.css` | 从 popup.html 提取的独立样式文件 |

### 禁止修改

| 范围 | 原因 |
|------|------|
| `background.js` | Service Worker 无 UI |
| `content.js` | 内容脚本无 Popup UI |
| `controller/` 目录 | 后端不属于 M6 |
| `dashboard.*` 文件 | Dashboard 属于 M4 |
| M1-M5 文档 | 已冻结 |

## 3. 节点列表

| 节点 | 标题 | 状态 |
|------|------|------|
| [M6-N1](../nodes/M6_N1_POPUP_CSS_EXTRACTION_AND_COLOR.md) | CSS 提取 + PANTONE 换色 | 待开始 |
| [M6-N2](../nodes/M6_N2_POPUP_NEUMORPHISM_AND_VALIDATION.md) | 轻量 Neumorphism + 功能回归检测 | 待开始 |

## 4. 设计决策记录

### 4.1 主色选择

- Orange Rust (#C75B4A) 替代绿色 (#00b578) 作为 Popup 主色
- 理由：popup 是操作入口，需要清晰主按钮色；Rust 更稳、更有主操作感

### 4.2 颜色映射

| 用途 | 新色值 |
|------|--------|
| 页面背景 | Citron #E6E6A1 |
| 主色 | Orange Rust #C75B4A |
| 成功状态 | Aquamarine #A8D0E6 |
| 警告状态 | Radiant Yellow #F9A825 |
| Header 渐变 | Orange Rust → Pink Dogwood |
| 正文 | #333333（独立） |
| 次要文字 | #666666（独立） |

### 4.3 Neumorphism

- 轻量级：阴影偏移量 4px，扩散 8px（比 Dashboard 的 8px/16px 更小）
- 不使用 Glassmorphism（popup 面积小，玻璃效果收益低）

### 4.4 CSS 提取

- 将 popup.html 中 ~240 行内联 `<style>` 提取为 popup.css
- popup.html 中添加 `<link rel="stylesheet" href="popup.css">`
- manifest.json 确认 popup.css 在 web_accessible_resources 中（如需要）

## 5. 通过标准

- 所有工作包 checkbox 通过
- 功能回归检测无回退（所有按钮、Toggle、进度条正常工作）
- 不触碰禁止修改的文件

## 6. 讨论文档

完整讨论记录：[M6_PLANNING_DISCUSSION.md](../M6_PLANNING_DISCUSSION.md)
