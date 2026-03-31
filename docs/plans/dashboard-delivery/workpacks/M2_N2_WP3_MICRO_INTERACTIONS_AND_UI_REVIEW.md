# 工作包 M2-N2-WP3：Micro-interactions 与 UI 审查

> 目标：为所有可交互元素添加过渡动效，完成首页视觉审查。
> 角色：UI
> 预估改动量：修改 ~60 行（仅 CSS）

## 1. 前置条件

- M2-N2-WP2（Glassmorphism 浮窗与 Toast）通过

## 2. 读文件（执行前必读）

| 文件 | 读取目的 |
|------|---------|
| `crawler/extension/dashboard.css` | 现有样式，添加过渡效果 |
| `docs/plans/DIVERGENCE_DASHBOARD_AND_MULTIPLATFORM.md` Q3 | 交互要求：Toast 替代 alert、Micro-interactions |
| `PROJECT_PRD.md` 2.5 | 当前 UI 新要求：非卡片区域走 Neumorphism 语义 |

## 3. 改文件

| 文件 | 改动位置 | 改动内容 |
|------|---------|---------|
| `crawler/extension/dashboard.css` | `.job-card` 样式 | 添加 hover 过渡效果 |
| `crawler/extension/dashboard.css` | 按钮样式 | 添加 hover 微交互 |
| `crawler/extension/dashboard.css` | `.nav-tab` 样式 | 添加 active 的 Neumorphism 凹陷反馈 |
| `crawler/extension/dashboard.css` | `.modal-overlay` / `.modal-content` | 添加打开/关闭过渡动画 |

## 4. 技术约束与改动规格

### 4.1 卡片 Hover

```css
.job-card {
    transition: transform 200ms ease-out, box-shadow 200ms ease-out;
}
.job-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}
```

### 4.2 按钮 Hover

```css
button, .nav-tab {
    transition: background-color 200ms ease-out, transform 100ms ease-out;
}
button:hover {
    transform: scale(1.02);
}
```

### 4.3 导航 Tab Active（Neumorphism 凹陷）

```css
.nav-tab.active {
    box-shadow:
        inset 3px 3px 6px rgba(100, 102, 103, 0.18),
        inset -3px -3px 6px rgba(255, 255, 255, 0.85);
}
```

### 4.4 浮窗过渡

```css
.modal-overlay {
    transition: opacity 200ms ease-out;
}
.modal-content {
    transition: transform 200ms ease-out, opacity 200ms ease-out;
}
```

## 5. 测试上下文

- Chrome 打开 dashboard.html
- 不需要 Controller 运行（纯视觉检查，允许 Mock 数据）

## 6. 验收标准

```bash
# 浏览器验收（DevTools → Performance 检查动画帧率）：
# 1. 卡片 hover 有上浮（translateY(-4px)）+ 阴影加深效果
# 2. 按钮 hover 有背景色变化 + 微缩放（scale(1.02)）
# 3. 导航 tab active 状态为 Neumorphism 凹陷，不再使用下划线
# 4. 浮窗打开/关闭有 opacity + transform 过渡
# 5. 所有动画流畅（60fps），无卡顿
# 6. 色值全部符合 8 色规范（检查 DevTools 计算样式）
# 7. Console 无 CSS 警告
```

## 7. 影响范围（Blast Radius）

| 影响对象 | 影响程度 | 说明 |
|---------|---------|------|
| `dashboard.js` | 无修改 | 只改 CSS |
| 现有样式 | 增强 | 添加 transition，不改变现有布局 |

## 8. 契约变更

无。

## 9. 回退方案

- `git checkout` 恢复 CSS 文件

## 10. 边界（不做什么）

- 不改功能逻辑（JS 不动）
- 不做第二页交互（N3 处理）
- 动画保持简洁（200-300ms ease-out），不使用复杂 keyframes
- 不引入 CSS 动画库
