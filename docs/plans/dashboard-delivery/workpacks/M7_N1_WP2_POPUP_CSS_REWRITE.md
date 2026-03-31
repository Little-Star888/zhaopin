# 工作包 M7-N1-WP2：Popup CSS 完全重写

> 目标：将 popup.css 全部视觉样式重写为 Constructivism 风格
> 角色：前端
> 预估改动量：重写 ~250 行

## 1. 前置条件

- M7-N1-WP1 通过（色彩变量已替换）

## 2. 读文件（执行前必读）

| 文件 | 读取目的 |
|------|---------|
| `crawler/extension/popup.css` 全文 | 所有需要重写的样式 |
| `crawler/extension/popup.html` 全文 | HTML 结构和类名引用 |
| `crawler/extension/constructivism-mockup.html` | 设计稿中 Popup 部分的样式参考 |

## 3. 改动规格

### 3.1 需要清除的旧模式

全局搜索并删除以下模式：
- `box-shadow`（所有阴影效果）
- `backdrop-filter`（毛玻璃效果）
- `border-radius`（圆角）
- `linear-gradient`（渐变背景）
- `rgba()` 半透明色（改为纯色）

### 3.2 全局风格规则

```css
* { border-radius: 0 !important; box-shadow: none !important; }

body {
    width: 360px;
    min-height: 400px;
    font-family: -apple-system, BlinkMacSystemFont, sans-serif;
    background: var(--c-paper);
    color: var(--c-black);
}
```

### 3.3 各组件 Constructivism 化

| 组件 | 旧风格 | 新风格 |
|------|-------|-------|
| `.header` | 渐变背景 | 纯色 `var(--c-red)` + 白色文字 |
| `.section` | Neumorphism 阴影卡片 | `border: 3px solid var(--c-black)` + 纯色背景 |
| `.btn-primary` | 凸起阴影 | `border: 3px solid var(--c-black)` + `background: var(--c-red)` + 白色文字 |
| `.btn-secondary` | 凹陷阴影 | `border: 2px solid var(--c-gray)` + `background: var(--c-white)` |
| `.toggle` | 圆形药丸 | 方形（border-radius: 0），红色激活态 |
| `.section-title` | 左侧彩色竖条 | `border-bottom: 3px solid var(--c-black)` + 全大写 Courier New |
| `.footer` | 浅色分隔 | `border-top: 3px solid var(--c-black)` |
| `.progress-bar` | 圆角进度条 | `border-radius: 0` + `background: var(--c-red)` |
| `.message` | 柔和背景 | `border: 2px solid var(--c-black)` + 纯色背景 |

### 3.4 字体规范

```css
.header h1, .section-title {
    font-family: 'Courier New', monospace;
    text-transform: uppercase;
    letter-spacing: 2px;
}
```

## 4. 验证

- [ ] 全局搜索 `box-shadow`、`backdrop-filter`、`border-radius`、`linear-gradient`，确认无残留
- [ ] Popup 打开后视觉效果符合 Constructivism 风格
