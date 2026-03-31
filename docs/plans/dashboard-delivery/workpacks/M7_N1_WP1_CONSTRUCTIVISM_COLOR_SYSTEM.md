# 工作包 M7-N1-WP1：Constructivism 色彩体系替换

> 目标：将 popup.css 中的 PANTONE 6 色变量替换为 Constructivism 6 色
> 角色：前端
> 预估改动量：修改 ~15 行

## 1. 前置条件

- M6-N2 全部通过

## 2. 读文件（执行前必读）

| 文件 | 读取目的 |
|------|---------|
| `crawler/extension/popup.css` 第 1-15 行 | 当前 PANTONE 变量定义 |

## 3. 改动规格

### 3.1 替换 CSS 变量

**旧代码**：
```css
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
```

**新代码**：
```css
:root {
    /* Constructivism 6 色 */
    --c-red: #E62B1E;
    --c-black: #1A1A1A;
    --c-paper: #F4F0EA;
    --c-yellow: #FFC72C;
    --c-gray: #8E8E8E;
    --c-white: #FFFFFF;

    /* 文字色 */
    --c-text-primary: #1A1A1A;
    --c-text-secondary: #8E8E8E;
}
```

### 3.2 全局样式重置

在 `*` 选择器中添加：
```css
* {
    border-radius: 0 !important;
    box-shadow: none !important;
}
```

## 4. 验证

- [ ] 全局搜索 `--c-aquamarine`、`--c-radiant-yellow` 等 PANTONE 变量，确认无残留
- [ ] 在浏览器中打开 Popup，确认背景色变为 `#F4F0EA`
