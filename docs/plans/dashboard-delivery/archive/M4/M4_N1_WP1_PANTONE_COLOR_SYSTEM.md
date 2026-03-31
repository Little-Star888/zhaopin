> **[DEPRECATED]** 本方案已于 M7 阶段废弃。
> 最新方案请参考 [M7-N3-WP1 Dashboard CSS 完全重写](../../workpacks/M7_N3_WP1_DASHBOARD_CSS_REWRITE.md)

# 工作包 M4-N1-WP1：PANTONE 色值体系替换

> 目标：将 dashboard.css 中的 8 色变量替换为 6 PANTONE 色 + 深色文字色
> 角色：前端
> 预估改动量：修改 ~50 行

## 1. 前置条件

- M3-N2 全部通过
- `dashboard.css` 中旧 8 色变量存在

## 2. 读文件（执行前必读）

| 文件 | 读取目的 |
|------|---------|
| `crawler/extension/dashboard.css` 第 1-11 行 | 当前 8 色变量定义 |
| `crawler/extension/dashboard.css` 全文 | 找出所有使用旧变量的位置 |

## 3. 改动规格

### 3.1 替换 CSS 变量

**旧代码**（第 1-11 行）：
```css
:root {
    --c-bg-dark: rgb(43, 44, 48);
    --c-bg-light: rgb(240, 239, 235);
    --c-accent-red: rgb(159, 35, 54);
    --c-accent-purple: rgb(151, 99, 124);
    --c-teal: rgb(42, 93, 105);
    --c-olive: rgb(85, 84, 59);
    --c-sand: rgb(148, 138, 118);
    --c-gray: rgb(100, 102, 103);
}
```

**新代码**：
```css
:root {
    /* PANTONE 6 色 */
    --c-aquamarine: #A8D0E6;
    --c-radiant-yellow: #F9A825;
    --c-pink-dogwood: #F8BBD9;
    --c-primrose-yellow: #FDE798;
    --c-orange-rust: #C75B4A;
    --c-citron: #E6E6A1;

    /* 唯一额外色：深色文字（WCAG AA 达标，用户已批准） */
    --c-text-primary: #333333;
    --c-text-secondary: #666666;
}
```

### 3.2 变量引用映射

| 旧变量 | 新变量 | 说明 |
|--------|--------|------|
| `--c-bg-dark` | `--c-text-primary` | 用于文字颜色 |
| `--c-bg-light` | `--c-citron` | 用于背景色 |
| `--c-accent-red` | `--c-orange-rust` | 最接近的替代色 |
| `--c-accent-purple` | `--c-pink-dogwood` | 最接近的替代色 |
| `--c-teal` | `--c-aquamarine` | 最接近的替代色 |
| `--c-olive` | `--c-orange-rust` | 用橙锈替代橄榄绿 |
| `--c-sand` | `--c-radiant-yellow` | 用亮橘黄替代沙色 |
| `--c-gray` | `--c-text-secondary` | 用于次要文字 |

### 3.3 全局搜索替换

在 `dashboard.css` 全文中，将所有旧变量引用替换为新变量：

- `var(--c-bg-dark)` → `var(--c-text-primary)`
- `var(--c-bg-light)` → `var(--c-citron)`
- `var(--c-accent-red)` → `var(--c-orange-rust)`
- `var(--c-accent-purple)` → `var(--c-pink-dogwood)`
- `var(--c-teal)` → `var(--c-aquamarine)`
- `var(--c-olive)` → `var(--c-orange-rust)`
- `var(--c-sand)` → `var(--c-radiant-yellow)`
- `var(--c-gray)` → `var(--c-text-secondary)`

### 3.4 rgba 中的旧色值替换

检查全文中是否有直接引用旧 rgb() 值的 rgba() 表达式（如 `rgba(100, 102, 103, ...)`），将其替换为基于新变量的 rgba：

- `rgba(100, 102, 103, x)` → `rgba(51, 51, 51, x)`（基于 --c-text-primary）
- `rgba(255, 255, 255, x)` → 保持不变（白色高光不受影响）
- `rgba(43, 44, 48, x)` → `rgba(51, 51, 51, x)`
- `rgba(240, 239, 235, x)` → `rgba(230, 230, 161, x)`（基于 --c-citron）

## 4. 验收标准

```bash
# 1. 旧变量不存在
grep -c 'c-bg-dark\|c-bg-light\|c-accent-red\|c-accent-purple\|c-teal\|c-olive\|c-sand\|c-gray' dashboard.css
# 预期：0

# 2. 新变量存在
grep -c 'c-aquamarine\|c-radiant-yellow\|c-pink-dogwood\|c-primrose-yellow\|c-orange-rust\|c-citron\|c-text-primary\|c-text-secondary' dashboard.css
# 预期：> 0

# 3. Chrome 加载无 CSS 报错
```

## 5. 影响范围

| 影响对象 | 影响程度 | 说明 |
|---------|---------|------|
| 导航栏 | 颜色变化 | 背景变为 Citron 色调 |
| 卡片 | 颜色变化 | 需确认 Glassmorphism 效果在新基底色下正常 |
| 面板 | 颜色变化 | Neumorphism 阴影在 WP2 处理 |
| 文字 | 颜色变化 | 使用深色文字色 |
| 布局 | 无影响 | 布局在 M4-N2 处理 |

## 6. 回退方案

- `git checkout -- crawler/extension/dashboard.css` 恢复旧色值
