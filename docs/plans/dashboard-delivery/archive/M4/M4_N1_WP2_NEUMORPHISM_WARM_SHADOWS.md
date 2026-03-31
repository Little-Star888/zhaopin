> **[DEPRECATED]** 本方案已于 M7 阶段废弃。
> 最新方案请参考 [M7-N3-WP1 Dashboard CSS 完全重写](../../workpacks/M7_N3_WP1_DASHBOARD_CSS_REWRITE.md)

# 工作包 M4-N1-WP2：Neumorphism 暖色阴影实现

> 目标：更新 Neumorphism 工具类，使用 PANTONE 暖色调阴影
> 角色：前端
> 预估改动量：修改 ~60 行

## 1. 前置条件

- M4-N1-WP1 通过（新色值变量已生效）

## 2. 读文件（执行前必读）

| 文件 | 读取目的 |
|------|---------|
| `crawler/extension/dashboard.css` 第 59-81 行 | 当前 Neumorphism 工具类 |
| `crawler/extension/dashboard.css` 第 595-604 行 | 简历面板阴影 |
| `crawler/extension/dashboard.css` 第 730-737 行 | 投递面板阴影 |
| `crawler/extension/dashboard.css` 第 765-778 行 | 投递项展开阴影 |

## 3. 改动规格

### 3.1 更新 Neumorphism 工具类

**旧代码**（第 63-81 行）：
```css
.neu-raised {
    box-shadow:
        4px 4px 8px rgba(100, 102, 103, 0.15),
        -4px -4px 8px rgba(255, 255, 255, 0.9);
}

.neu-pressed {
    box-shadow:
        inset 3px 3px 6px rgba(100, 102, 103, 0.18),
        inset -3px -3px 6px rgba(255, 255, 255, 0.85);
}
```

**新代码**（PANTONE 暖色调阴影）：
```css
/* 外凸效果 - 用于按钮、控件等 */
.neu-raised {
    box-shadow:
        8px 8px 16px rgba(199, 91, 74, 0.15),      /* Orange Rust 暗影 */
        -8px -8px 16px rgba(253, 231, 152, 0.7);    /* Primrose Yellow 高光 */
}

/* 内凹效果 - 用于 active 状态、输入框等 */
.neu-pressed {
    box-shadow:
        inset 8px 8px 16px rgba(199, 91, 74, 0.15),
        inset -8px -8px 16px rgba(253, 231, 152, 0.7);
}

/* 浅色 Neumorphism 背景容器 */
.neu-container {
    background: var(--c-citron);
    border-radius: 12px;
}
```

### 3.2 更新面板阴影

**简历面板**（约第 597-604 行）：
```css
.resume-panel {
    background: var(--c-citron);
    border-radius: 16px;
    padding: 24px;
    box-shadow:
        6px 6px 12px rgba(199, 91, 74, 0.12),
        -6px -6px 12px rgba(253, 231, 152, 0.6);
}
```

**投递面板**（约第 730-737 行）：
```css
.delivery-panel {
    background: var(--c-citron);
    border-radius: 16px;
    padding: 24px;
    box-shadow:
        6px 6px 12px rgba(199, 91, 74, 0.12),
        -6px -6px 12px rgba(253, 231, 152, 0.6);
}
```

**投递项展开**（约第 765-778 行）：
```css
.delivery-item[open] {
    box-shadow:
        inset 2px 2px 4px rgba(199, 91, 74, 0.1),
        inset -2px -2px 4px rgba(253, 231, 152, 0.5);
}
```

### 3.3 更新 Tab 凹陷态

**导航 Tab active**（约第 129-136 行）：
```css
.nav-tab.active {
    color: var(--c-text-primary);
    font-weight: 500;
    box-shadow:
        inset 3px 3px 6px rgba(199, 91, 74, 0.15),
        inset -3px -3px 6px rgba(253, 231, 152, 0.6);
    background: rgba(230, 230, 161, 0.5);
}
```

### 3.4 更新上传区域

```css
.upload-zone:hover {
    border-color: var(--c-radiant-yellow);
    box-shadow:
        inset 2px 2px 4px rgba(199, 91, 74, 0.1),
        inset -2px -2px 4px rgba(253, 231, 152, 0.5);
}

.upload-zone.drag-over {
    border-color: var(--c-aquamarine);
    box-shadow:
        inset 3px 3px 6px rgba(199, 91, 74, 0.12),
        inset -3px -3px 6px rgba(253, 231, 152, 0.6);
}
```

### 3.5 更新环境光斑

```css
body::before {
    background: radial-gradient(circle, var(--c-orange-rust) 0%, transparent 70%);
}

body::after {
    background: radial-gradient(circle, var(--c-aquamarine) 0%, transparent 70%);
}
```

## 4. 验收标准

1. 所有 `rgba(100, 102, 103, ...)` 引用已替换为 `rgba(199, 91, 74, ...)` 或 `rgba(51, 51, 51, ...)`
2. 所有 `rgba(255, 255, 255, ...)` 高光引用已替换为 `rgba(253, 231, 152, ...)`
3. `.neu-raised` 和 `.neu-pressed` 使用 PANTONE 暖色阴影
4. Chrome 加载无 CSS 报错
5. 面板呈现暖色调新拟态效果

## 5. 边界

- 不修改布局（M4-N2 处理）
- 不修改 HTML 结构
- 不修改 JS 逻辑
- Glassmorphism 效果（卡片、Modal）保持独立的阴影体系，不强制改为暖色调

## 6. 回退方案

- `git checkout -- crawler/extension/dashboard.css` 恢复旧阴影
