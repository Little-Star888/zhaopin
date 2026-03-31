# 工作包 M2-N2-WP1：Bento Grid 布局

> 目标：实现首页的 Bento Grid 岗位卡片布局。
> 角色：UI
> 预估改动量：修改 ~120 行（CSS + JS）

## 1. 前置条件

- M2-N1 全部工作包通过（骨架 + 路由 + API 对接可用）

## 2. 读文件（执行前必读）

| 文件 | 读取目的 |
|------|---------|
| `crawler/extension/dashboard.css` | 现有基础样式 |
| `crawler/extension/dashboard.js` | 现有 `renderJobGrid` 函数 |
| `docs/plans/DIVERGENCE_DASHBOARD_AND_MULTIPLATFORM.md` Q2 | Grid 规范：列规则、大卡片、平台标签色值 |

## 3. 改文件

| 文件 | 改动位置 | 改动内容 |
|------|---------|---------|
| `crawler/extension/dashboard.css` | 新增 Grid 相关样式 | `.job-grid`、`.job-card`、`.job-card--featured`、平台标签 |
| `crawler/extension/dashboard.js` | `renderJobGrid` 函数 | 重构为 Grid 布局 HTML，新增 `createJobCard` |

## 4. 技术约束与改动规格

### 4.1 Grid 布局（Q2 决策）

```css
.job-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 16px;
    padding: 24px;
}
```

### 4.2 卡片样式

```css
.job-card {
    background: var(--c-bg-light);
    border-radius: 12px;
    padding: 20px;
    cursor: pointer;
    transition: transform 0.2s, box-shadow 0.2s;
}

.job-card--featured {
    grid-column: span 2; /* 大卡片占两列 */
}
```

> **⚠️ 演进说明**：上述 `.job-card` 的 `background: var(--c-bg-light)` 是**布局占位样式**。后续 M2-N2-WP2（Glassmorphism）将把它覆盖为 `background: rgba(255,255,255,0.4)` + `backdrop-filter: blur(12px)`。执行者无需在此 WP 担心卡片最终视觉效果，本 WP 只负责 Grid 布局正确。

### 4.3 平台标签色值

| 平台 | 色值 | CSS 变量 |
|------|------|---------|
| Boss | `rgb(159, 35, 54)` | `--c-accent-red` |
| 猎聘 | `rgb(151, 99, 124)` | `--c-accent-purple` |
| 51job | `rgb(42, 93, 105)` | `--c-teal` |
| 智联 | `rgb(85, 84, 59)` | `--c-olive` |

### 4.4 Featured 卡片逻辑

- 最近入库（`crawledAt` 最新）的卡片标记为 featured
- 已选中（`selected=true`）的卡片标记为 featured
- Featured 卡片使用 `grid-column: span 2`

### 4.5 空态处理

```html
<div class="empty-state">
    <p>暂无岗位数据</p>
</div>
```

## 5. 测试上下文

- Chrome 打开 dashboard.html
- 需要至少 5 条不同平台的测试数据

## 6. 验收标准

```bash
# 前置：插入多平台测试数据
cd /home/xixil/kimi-code/zhaopin/controller
node -e "
const j = require('./jobs-db');
j.batchInsertJobs([
  {platform:'boss',platformJobId:'G1',title:'前端',company:'A',location:'北京',salary:'15K'},
  {platform:'boss',platformJobId:'G2',title:'后端',company:'B',location:'上海',salary:'25K'},
  {platform:'liepin',platformJobId:'G3',title:'全栈',company:'C',location:'深圳',salary:'30K'},
  {platform:'51job',platformJobId:'G4',title:'算法',company:'D',location:'杭州',salary:'40K'},
  {platform:'zhilian',platformJobId:'G5',title:'产品',company:'E',location:'广州',salary:'20K'}
]);
"

# 浏览器验收：
# 1. 1024px+ 屏幕下 Grid 正常排列（多列）
# 2. 卡片显示：岗位名称、公司、城市、薪资、平台标签
# 3. 不同平台标签使用不同色值（Boss=红, 猎聘=紫, 51job=青, 智联=橄榄）
# 4. featured 卡片（最近入库）占两列宽度
# 5. 无数据时显示空态提示
```

## 7. 影响范围（Blast Radius）

| 影响对象 | 影响程度 | 说明 |
|---------|---------|------|
| `dashboard.html` | 无修改 | 结构不变 |
| `dashboard-api.js` | 无修改 | API 调用不变 |
| `renderJobGrid` 函数 | 重构 | HTML 输出从列表改为 Grid |

## 8. 契约变更

无 API/DB 契约变更。

## 9. 回退方案

- `git checkout` 恢复 CSS 和 JS 文件

## 10. 边界（不做什么）

- 不做 Glassmorphism 浮窗（WP2 处理）
- 不做 Micro-interactions（WP3 处理）
- 不改 API 客户端
- 不做响应式断点（只保证 1024px+）
