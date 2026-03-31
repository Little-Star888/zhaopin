# 工作包 M14-N1-WP1：CSS 样式修复

> 目标：统一工具栏按钮物理尺寸 + 消除 AI 按钮与激活态的视觉撞色
> 角色：前端
> 预估改动量：~10行CSS

## 1. 前置条件
- M13 全部通过

## 2. 读文件
| 文件 | 读取目的 |
|------|---------|
| `crawler/extension/dashboard.css` 搜索 `.res-btn {` | `.res-btn` 基础样式（border: none → 2px transparent） |
| `crawler/extension/dashboard.css` 搜索 `.res-btn--g {` | `.res-btn--g` 轮廓变体（确认已是 2px，无需改动） |
| `crawler/extension/dashboard.css` 搜索 `.res-btn--active {` | `.res-btn--active` 激活态（确认 border-color: var(--c-red)） |
| `crawler/extension/dashboard.css` 搜索 `.res-btn--ai {` | `.res-btn--ai` AI 按钮（默认色从红改黑） |
| `crawler/extension/dashboard.css` 搜索 `.res-btn--ai:disabled {` | `.res-btn--ai:disabled` disabled 态（补 border-color 灰化） |
| `crawler/extension/dashboard.css` 搜索 `.res-btn--export {` | `.res-btn--export` 导出按钮（可选显式黄色边框） |

> **注意**：行号可能因代码变动而偏移，请以 CSS 选择器搜索定位为准。

## 3. 改动规格

### 改动 1：`.res-btn` 基础样式

```css
/* BEFORE */
.res-btn {
    border: none;
    ...
    transition: background 0.15s, color 0.15s;
}

/* AFTER */
.res-btn {
    border: 2px solid transparent;      /* 透明占位，统一尺寸 */
    ...
    transition: background 0.15s, color 0.15s, border-color 0.15s;
}
```

### 改动 2：`.res-btn--ai`

```css
/* BEFORE */
.res-btn--ai {
    background: var(--c-red);
    color: var(--c-white);
    border: none;
}

/* AFTER */
.res-btn--ai {
    background: var(--c-black);
    color: var(--c-yellow);
    border: 2px solid var(--c-yellow);   /* 与 --g 一致的 2px 边框 */
}
```

### 改动 3：`.res-btn--ai:hover:not(:disabled)`（紧跟改动2）

```css
/* BEFORE */
.res-btn--ai:hover:not(:disabled) {
    background: var(--c-black);
    color: var(--c-yellow);
}

/* AFTER */
.res-btn--ai:hover:not(:disabled) {
    background: var(--c-red);
    color: var(--c-white);
    border-color: var(--c-red);           /* hover 时边框同步变红 */
}
```

### 改动 4：`.res-btn--ai:disabled`

```css
/* 在现有 disabled 规则中补一行 */
.res-btn--ai:disabled {
    ...
    border-color: #555;                   /* 防止"灰底黄边"违和 */
}
```

### 改动 5：`.res-btn--export`（可选）

```css
/* BEFORE */
.res-btn--export {
    background: var(--c-yellow);
    color: var(--c-black);
}

/* AFTER */
.res-btn--export {
    background: var(--c-yellow);
    color: var(--c-black);
    border-color: var(--c-yellow);        /* 显式黄色边框，视觉一致性更强 */
}
```

## 4. 不改动的项

- `.res-btn--g`：已经是 `2px solid var(--c-yellow)`，无需改动
- `.res-btn--active`：已有 `border-color: var(--c-red)`，无需改动
- `dashboard.js` 中的 HTML 结构：本轮不动

## 5. 验证
- [ ] DevTools 测量 `.res-bar` 内所有按钮 `offsetHeight`，全部相同
- [ ] 首屏仅"编辑"按钮为红色，"AI优化"为黑色
- [ ] hover "AI优化"按钮时背景变红、边框变红
- [ ] 未配置 AI 时"AI优化"按钮灰色底 + 灰色边框
- [ ] Tab 键导航焦点轮廓可见，不被 border 遮盖
- [ ] 默认工具栏（`def-` 前缀）与分屏工具栏（`sp-` 前缀）表现一致
