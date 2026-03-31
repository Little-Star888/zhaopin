# 工作包 M7-N3-WP2：CSS Grid 4列 + SVG 图形

> 目标：实现 Suprematism 风格的 4 列网格布局和 12 个 SVG 几何图形
> 角色：前端
> 预估改动量：新增 ~150 行 CSS，修改 ~30 行 JS

## 1. 前置条件

- M7-N3-WP1 通过（Dashboard CSS 基础重写完成）

## 2. 读文件（执行前必读）

| 文件 | 读取目的 |
|------|---------|
| `crawler/extension/constructivism-mockup.html` | SVG 图形定义和 Grid 布局 |
| `crawler/extension/dashboard.js` renderJobGrid() 函数 | 当前 Grid 渲染逻辑 |

## 3. 改动规格

### 3.1 Grid 4 列布局

```css
.job-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 4px;
    background: var(--c-black);  /* 黑色间隙 */
    padding: 4px;
}
```

### 3.2 8 色 nth-child 循环

```css
.job-grid .job-card:nth-child(8n+1) { background: var(--c-red); color: var(--c-white); }
.job-grid .job-card:nth-child(8n+2) { background: var(--c-yellow); color: var(--c-black); }
.job-grid .job-card:nth-child(8n+3) { background: var(--c-white); color: var(--c-black); }
.job-grid .job-card:nth-child(8n+4) { background: var(--c-paper); color: var(--c-black); }
.job-grid .job-card:nth-child(8n+5) { background: var(--c-black); color: var(--c-white); }
.job-grid .job-card:nth-child(8n+6) { background: var(--c-red); color: var(--c-white); }
.job-grid .job-card:nth-child(8n+7) { background: var(--c-yellow); color: var(--c-black); }
.job-grid .job-card:nth-child(8n+8) { background: var(--c-gray); color: var(--c-white); }
```

### 3.3 SVG 图形注入

在 `dashboard.js` 的 `renderJobCard()` 中注入 SVG：
- 12 个独特 SVG 图形，使用 `i % 12` 循环选择
- SVG 使用 `position: absolute; right: 0; bottom: 0; width: 55%; height: 65%; opacity: 0.10`
- 卡片设置 `position: relative; overflow: hidden` 容纳 SVG

### 3.4 卡片尺寸变化

内容丰富的卡片 `grid-row: span 2`，标签多的卡片 `grid-column: span 2`。

## 4. 验证

- [ ] 首页显示 4 列网格，黑色间隙分隔
- [ ] 相邻卡片颜色不同
- [ ] 卡片右下角有 SVG 几何图形，占约 50% 面积
- [ ] 12 个不同图形循环出现（无重复）
- [ ] 卡片大小根据内容有差异（span 2 的卡片）
