# 工作包 M2-N2-WP4：环境背景与 Neumorphism 工具类

> 目标：为 Glassmorphism 提供折射介质，并统一非卡片区域的 Neumorphism 视觉语言。
> 角色：UI
> 预估改动量：修改 ~120 行（CSS）

## 1. 前置条件

- M2-N2-WP1（Bento Grid）通过

## 2. 读文件（执行前必读）

| 文件 | 读取目的 |
|------|---------|
| `crawler/extension/dashboard.css` | 注入环境背景层与全局工具类 |
| `PROJECT_PRD.md` 2.5 | 用户最新 UI 要求 |
| 参考图 #1 / #2 / #3 | 色盘 + Glassmorphism + Neumorphism 方向 |

## 3. 改文件

| 文件 | 改动位置 | 改动内容 |
|------|---------|---------|
| `crawler/extension/dashboard.css` | `body` / `body::before` / `body::after` | 添加渐变光斑环境背景 |
| `crawler/extension/dashboard.css` | 全局工具类区 | 增加 Neumorphism 外凸/内凹阴影工具类 |
| `crawler/extension/dashboard.css` | `#view-resume`、`.resume-panel`、`.delivery-panel` 等 | 统一非卡片区域为浅色 Neumorphism 语言 |

## 4. 技术约束与改动规格

### 4.1 色盘来源

- 所有颜色只允许使用 8 色规范：
  - `rgb(43,44,48)`
  - `rgb(240,239,235)`
  - `rgb(159,35,54)`
  - `rgb(151,99,124)`
  - `rgb(42,93,105)`
  - `rgb(85,84,59)`
  - `rgb(148,138,118)`
  - `rgb(100,102,103)`

### 4.2 环境背景层

```css
body::before,
body::after {
    content: '';
    position: fixed;
    inset: auto;
    filter: blur(80px);
    opacity: 0.15;
    pointer-events: none;
}
```

要求：

- 至少 2 个大尺寸光斑
- 颜色从 `--c-accent-red` / `--c-accent-purple` / `--c-teal` / `--c-sand` 中选
- 光斑只作为 Glassmorphism 折射介质，不喧宾夺主

### 4.3 Neumorphism 适用范围

- 导航 tab active（`.nav-tab.active` 使用内阴影凹陷态）
- 第二页面板（`.resume-panel`、`.delivery-panel`）
- 非卡片按钮/控件
- 非卡片区域背景容器

> **注意**：`#main-nav` 导航栏本身使用**浅色毛玻璃**（Glassmorphism），由 M2-N2-WP2 负责实现。本 WP 只负责导航栏内的 tab active 凹陷效果。

### 4.4 浅色导航栏 CSS（由 WP2 实现，此处列出供参考）

```css
#main-nav {
    background: rgba(240, 239, 235, 0.7);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-bottom: 1px solid rgba(255, 255, 255, 0.4);
}
```

### 4.5 明确禁止

- 不允许在纯平白底上强行混用 Glass 与 Neumorphism
- 不允许引入图片背景
- 不允许新增超出 8 色规范的主色

## 5. 测试上下文

- Chrome 打开 dashboard.html
- 不需要 Controller 运行

## 6. 验收标准

```bash
# 浏览器验收：
# 1. 页面背景为浅色底 + 渐变光斑，而不是纯平单色
# 2. .job-card / modal / nav 能明显感知到背景折射
# 3. 非卡片区域（第二页面板、tab active 等）呈现 Neumorphism 凹凸关系
# 4. 所有颜色均来自 8 色规范
# 5. Console 无 CSS 警告
```

## 7. 边界（不做什么）

- 不改 API 客户端
- 不改功能逻辑
- 不新增图片资源
- 不引入外部 UI 库
