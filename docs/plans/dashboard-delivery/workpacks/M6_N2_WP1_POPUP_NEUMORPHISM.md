# 工作包 M6-N2-WP1：Popup 轻量 Neumorphism 实现

> 目标：为 Popup 的卡片和按钮添加轻量级 Neumorphism 风格
> 角色：前端
> 预估改动量：修改 ~40 行

## 1. 前置条件

- M6-N1-WP2 通过（CSS 提取和换色完成且功能正常）

## 2. 读文件（执行前必读）

| 文件 | 读取目的 |
|------|---------|
| `crawler/extension/popup.css` | 当前样式（需添加 Neumorphism） |

## 3. 改动规格

### 3.1 卡片区域 Neumorphism

```css
.section {
    background: var(--c-citron);
    border-radius: 12px;
    padding: 15px;
    margin-bottom: 15px;
    box-shadow:
        4px 4px 8px rgba(199, 91, 74, 0.1),
        -4px -4px 8px rgba(253, 231, 152, 0.5);
}
```

### 3.2 按钮外凸效果

```css
.btn-primary {
    background: var(--c-citron);
    color: var(--c-orange-rust);
    border: none;
    box-shadow:
        3px 3px 6px rgba(199, 91, 74, 0.12),
        -3px -3px 6px rgba(253, 231, 152, 0.5);
}

.btn-primary:hover {
    background: var(--c-citron);
    box-shadow:
        4px 4px 8px rgba(199, 91, 74, 0.15),
        -4px -4px 8px rgba(253, 231, 152, 0.6);
}

.btn-primary:active {
    box-shadow:
        inset 3px 3px 6px rgba(199, 91, 74, 0.12),
        inset -3px -3px 6px rgba(253, 231, 152, 0.5);
}

.btn-secondary {
    background: var(--c-citron);
    color: var(--c-text-secondary);
    box-shadow:
        3px 3px 6px rgba(199, 91, 74, 0.08),
        -3px -3px 6px rgba(253, 231, 152, 0.4);
}
```

### 3.3 Toggle 凹陷效果

```css
.toggle.active {
    background: var(--c-orange-rust);
    box-shadow:
        inset 2px 2px 4px rgba(0, 0, 0, 0.15),
        inset -2px -2px 4px rgba(255, 255, 255, 0.2);
}
```

### 3.4 关键参数

- 阴影偏移量：3-4px（轻量级，Dashboard 为 8px）
- 阴影扩散：6-8px（轻量级，Dashboard 为 16px）
- 暗影透明度：0.08-0.15（低对比度）
- 高光透明度：0.4-0.6（柔和）

## 4. 验收标准

1. 卡片区域有轻微凸起感
2. 按钮有外凸效果，按下有凹陷反馈
3. Toggle active 有凹陷效果
4. 整体效果轻柔不拥挤
5. Console 无 CSS 报错

## 5. 边界

- 不使用 Glassmorphism
- 不修改 HTML 结构
- 不修改 JS 业务逻辑

## 6. 回退方案

- `git checkout -- crawler/extension/popup.css`
