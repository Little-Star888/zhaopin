# 工作包 M7-N3-WP1：Dashboard CSS 完全重写

> 目标：将 dashboard.css 全部视觉样式重写为 Constructivism 风格
> 角色：前端
> 预估改动量：重写 ~800 行

## 1. 前置条件

- M7-N1 通过（Popup CSS 模式已验证，可复用相同的设计模式）

## 2. 读文件（执行前必读）

| 文件 | 读取目的 |
|------|---------|
| `crawler/extension/dashboard.css` 全文 | 所有需要重写的样式 |
| `crawler/extension/dashboard.html` 全文 | HTML 结构和类名 |
| `crawler/extension/constructivism-mockup.html` | 最终设计稿（CSS 部分） |

## 3. 改动规格

### 3.1 CSS 变量替换

```css
:root {
    --c-red: #E62B1E;
    --c-black: #1A1A1A;
    --c-paper: #F4F0EA;
    --c-yellow: #FFC72C;
    --c-gray: #8E8E8E;
    --c-white: #FFFFFF;
    --c-text-primary: #1A1A1A;
    --c-text-secondary: #8E8E8E;
    --border-heavy: 3px solid var(--c-black);
}
```

### 3.2 全局清除

删除所有：
- `box-shadow`
- `backdrop-filter`
- `border-radius`（替换为 0）
- `linear-gradient`
- `rgba()` 半透明色

### 3.3 组件重写清单

| 组件 | 新风格 |
|------|-------|
| `body` | background: var(--c-paper) |
| `.main-nav` | border-bottom: 3px solid var(--c-black)，按钮全大写 Courier New |
| `.nav-tab` | border: 2px solid transparent，active 时 border-bottom: 3px solid var(--c-red) |
| `.job-card` | border: 3px solid var(--c-black)，background: 纯色 |
| `.modal-overlay` | 改为手风琴遮罩背景 |
| `.modal-content` | border: 4px solid var(--c-black)，background: var(--c-white) |
| `.delivery-panel` | border: 3px solid var(--c-black) |
| `.resume-panel` | border: 3px solid var(--c-black) |
| `.toast` | border: 2px solid var(--c-black) |
| `.empty-state` | 大写 Courier New 文字 |

## 4. 验证

- [ ] 全局搜索确认无 `box-shadow`、`backdrop-filter` 残留
- [ ] Dashboard 打开后背景为米白色
- [ ] 所有卡片/面板有黑色边框、无圆角、无阴影
