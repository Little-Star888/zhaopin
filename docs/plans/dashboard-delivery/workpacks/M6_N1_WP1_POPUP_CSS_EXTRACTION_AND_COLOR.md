# 工作包 M6-N1-WP1：CSS 提取与 PANTONE 换色

> 目标：将 popup.html 内联样式提取为 popup.css，并替换为 6 PANTONE 色体系
> 角色：前端
> 预估改动量：新建 ~250 行（popup.css），修改 ~10 行（popup.html）

## 1. 前置条件

- M3-N1 全部通过

## 2. 读文件（执行前必读）

| 文件 | 读取目的 |
|------|---------|
| `crawler/extension/popup.html` | 当前内联样式（第 7-238 行 `<style>` 块） |
| `crawler/extension/manifest.json` | 确认 popup.css 引用方式 |
| `crawler/extension/popup.js` | 确认是否有 JS 操作样式的逻辑 |

## 3. 改动规格

### 3.1 新建 popup.css

从 popup.html 提取全部内联样式，替换颜色为 PANTONE 色体系：

```css
/* popup.css - PANTONE 色值体系 */
:root {
    --c-aquamarine: #A8D0E6;
    --c-radiant-yellow: #F9A825;
    --c-pink-dogwood: #F8BBD9;
    --c-primrose-yellow: #FDE798;
    --c-orange-rust: #C75B4A;
    --c-citron: #E6E6A1;
    --c-text-primary: #333333;
    --c-text-secondary: #666666;
}

body {
    width: 360px;
    min-height: 400px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: var(--c-citron);
    color: var(--c-text-primary);
}

.header {
    background: linear-gradient(135deg, var(--c-orange-rust) 0%, var(--c-pink-dogwood) 100%);
    padding: 20px;
    color: white;
    text-align: center;
}

/* 以下按原 popup.html 样式逐项提取并替换颜色 */
/* ... 完整内容从 popup.html 第 8-238 行提取 ... */

/* 颜色替换规则 */
/* #00b578 → var(--c-orange-rust)  主色 */
/* #f5f5f5 → var(--c-citron)       背景 */
/* #333 → var(--c-text-primary)     正文 */
/* #666 → var(--c-text-secondary)   次要文字 */
/* #999 → var(--c-text-secondary)   页脚 */
/* #ff6b35 → var(--c-radiant-yellow) 警告 */
/* #f0f0f0 → rgba(230,230,161,0.3) 分割线（Citron 半透明） */
/* #eee → rgba(230,230,161,0.2)   分割线（Citron 半透明） */
/* #e0e0e0 → rgba(230,230,161,0.4) hover 态 */
/* #ccc → rgba(199,91,74,0.3)     disabled 态 */
/* #00a066 → var(--c-orange-rust)  hover 深化 */
/* #e6f7ed → rgba(168,208,230,0.2) 成功背景 */
/* #b7eb8f → rgba(168,208,230,0.4) 成功边框 */
/* #fff2f0 → rgba(253,231,152,0.2) 错误背景 */
/* #ffccc7 → rgba(253,231,152,0.4) 错误边框 */
```

### 3.2 修改 popup.html

删除 `<style>...</style>` 块（第 7-239 行），添加 CSS 引用：

```html
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Boss直聘职位采集器</title>
  <link rel="stylesheet" href="popup.css">
</head>
```

### 3.3 确认 manifest.json

检查 `manifest.json` 中 popup.html 的引用是否正确。popup.css 与 popup.html 同目录，相对路径引用即可。

## 4. 验收标准

1. `popup.css` 文件存在且包含完整样式
2. `popup.html` 中无内联 `<style>` 块
3. Chrome 加载扩展 → 点击 popup → 无 CSP 报错
4. 所有元素显示正确（Header、按钮、Toggle、进度条等）
5. 颜色为 PANTONE 色系（背景 Citron、主色 Orange Rust）

## 5. 影响范围

| 影响对象 | 影响程度 | 说明 |
|---------|---------|------|
| popup 功能 | 无影响 | 仅换色，不改逻辑 |
| popup.js | 可能微调 | 如有 JS 直接设置颜色需更新 |
| Dashboard | 无影响 | M4 独立处理 |
| background.js | 无影响 | Service Worker 无 UI |

## 6. 回退方案

- 删除 popup.css
- `git checkout -- crawler/extension/popup.html`
