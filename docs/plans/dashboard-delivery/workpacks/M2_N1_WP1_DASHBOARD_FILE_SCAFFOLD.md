# 工作包 M2-N1-WP1：Dashboard 文件骨架

> 目标：创建 Dashboard 的 HTML/CSS/JS 基础文件结构。
> 角色：前端
> 预估改动量：新增 ~200 行（4 个新文件）

## 1. 前置条件

- `DASHBOARD_API_CONTRACT.md` 已存在（M1 产出）
- M1 后端验收通过

## 2. 读文件（执行前必读）

| 文件 | 读取目的 |
|------|---------|
| `docs/plans/DASHBOARD_API_CONTRACT.md` | API 契约（了解端点列表，不实现调用） |
| `docs/plans/DIVERGENCE_DASHBOARD_AND_MULTIPLATFORM.md` Q11 | 文件结构：单 HTML + ESM 模块拆分 |
| `crawler/extension/manifest.json` | MV3 CSP 限制（禁止内联脚本） |

## 3. 写文件

| 文件 | 说明 |
|------|------|
| `crawler/extension/dashboard.html` | 单 HTML 入口 |
| `crawler/extension/dashboard.css` | 全部样式（8 色变量 + 基础排版 + 导航栏） |
| `crawler/extension/dashboard.js` | 主逻辑入口（ESM 模块） |
| `crawler/extension/dashboard-api.js` | API 调用封装（fetch 封装） |

## 4. 技术约束与改动规格

### 4.1 HTML 结构

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>招聘工作台</title>
  <link rel="stylesheet" href="dashboard.css">
</head>
<body>
  <nav id="main-nav">
    <a href="#home" class="nav-tab active">首页</a>
    <a href="#resume" class="nav-tab">工作台</a>
  </nav>
  <div id="view-home"></div>
  <div id="view-resume" style="display:none"></div>
  <script type="module" src="dashboard.js"></script>
</body>
</html>
```

### 4.2 CSS 8 色变量

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

> **⚠️ 导航栏样式演进说明**：骨架阶段 `#main-nav` 使用 `background: var(--c-bg-dark)` 作为初始占位。后续 M2-N2-WP2（Glassmorphism）将把它覆盖为**浅色悬浮毛玻璃**（`rgba(240,239,235,0.7)` + `backdrop-filter: blur(12px)`）。这不是骨架写错了，而是分步演进的设计。

### 4.3 JS 模块结构

```javascript
// dashboard.js
import { fetchJobs, fetchJobDetail, selectJob, fetchDeliveryList, uploadResume, fetchResume } from './dashboard-api.js';

export function initDashboard() {
  // 占位：后续 WP2 填充路由和数据加载逻辑
}

// dashboard-api.js
const API_BASE = 'http://127.0.0.1:7893';
export async function fetchJobs(params) { /* 占位 */ }
export async function fetchJobDetail(id) { /* 占位 */ }
export async function selectJob(id) { /* 占位 */ }
export async function fetchDeliveryList() { /* 占位 */ }
export async function uploadResume(file) { /* 占位 */ }
export async function fetchResume() { /* 占位 */ }
```

### 4.4 关键规则

- 使用 `<script type="module">` 原生 ESM（Q11 决策）
- 不用内联脚本（MV3 CSP 限制）
- 静态资源用相对路径（兼容 Windows 迁移）
- 不预创建 `dashboard-resume.js`（最小改动原则）

## 5. 测试上下文

- Chrome 浏览器直接打开 `dashboard.html`（或通过扩展加载）
- 不需要 Controller 运行

## 6. 验收标准

```bash
# 1. 文件存在
ls /home/xixil/kimi-code/zhaopin/crawler/extension/dashboard.{html,css,js,api.js}

# 2. Chrome 打开 dashboard.html
# - 无 CSP 报错（Console 面板）
# - 导航栏两个 tab 可见
# - #view-home 和 #view-resume 容器存在
# - Console 无 JS 模块加载错误

# 3. CSS 变量验证（DevTools → Elements → :root）
# 确认 8 个 CSS 变量定义完整
```

## 7. 影响范围（Blast Radius）

| 影响对象 | 影响程度 | 说明 |
|---------|---------|------|
| 现有扩展功能 | 无影响 | 新增文件，不改现有文件 |
| manifest.json | 无影响 | M3 才改 |

## 8. 契约变更

| 变更类型 | 内容 | 向后兼容 |
|---------|------|---------|
| 新增文件 | 4 个前端文件 | 兼容 |

## 9. 回退方案

- 删除 4 个新增文件

## 10. 边界（不做什么）

- 不实现 hash 路由（WP2 处理）
- 不做 Bento Grid / Glassmorphism（N2 处理）
- 不改 manifest.json（M3 处理）
- 不预创建 `dashboard-resume.js` 等占位文件
