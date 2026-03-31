# 工作包 M10-N1-WP1：Grid CSS 与8色循环

> 目标：dashboard.css 首页 Grid 布局完全对齐设计稿
> 角色：前端
> 预估改动量：~40行CSS

## 1. 前置条件

- M9 全部通过

## 2. 读文件（执行前必读）

| 文件 | 读取目的 |
|------|---------|
| `crawler/extension/dashboard.css` | 当前 Grid 样式 |
| `crawler/extension/constructivism-mockup.html` | 设计稿 Grid 样式（L30-L68） |

## 3. 改动规格

### 3.1 Grid 容器样式

将 `.job-grid` 的样式对齐设计稿 `.grid`：

```css
/* 设计稿参考 */
.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:4px;background:#1A1A1A}
@media(max-width:1000px){.grid{grid-template-columns:repeat(2,1fr)}}
@media(max-width:600px){.grid{grid-template-columns:1fr}}
```

### 3.2 8色nth-child循环

直接从设计稿复制8色循环规则（L52-L67），应用到 `.card` 选择器：

- 8n+1: 红色背景，白色文字，跨2行
- 8n+2: 米白背景，黑色文字
- 8n+3: 黑色背景，米白文字
- 8n+4: 黄色背景，黑色文字，跨2列
- 8n+5: 米白背景，黑色文字
- 8n+6: 红色背景，白色文字
- 8n+7: 黑色背景，米白文字
- 8n+8: 米白背景，黑色文字，跨2行

### 3.3 SVG颜色随nth-child变化

从设计稿复制 SVG fill/stroke 规则（L47-L50）。

## 4. 验证

- [ ] Grid 4列渲染正确
- [ ] 8色循环与设计稿一致
- [ ] 跨行/跨列卡片正确（8n+1和8n+8跨2行，8n+4跨2列）
- [ ] 响应式断点正确（1000px→2列，600px→1列）
- [ ] SVG 颜色随nth-child变化
