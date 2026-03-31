# 工作包 M2-N1-WP2：Hash 路由与 API 客户端

> 目标：实现 hash 路由切换和 API 数据对接的完整链路。
> 角色：前端
> 预估改动量：修改 ~150 行（dashboard.js + dashboard-api.js）

## 1. 前置条件

- M2-N1-WP1（文件骨架）通过
- Controller 运行中（API 端点可用）

## 2. 读文件（执行前必读）

| 文件 | 读取目的 |
|------|---------|
| `docs/plans/DASHBOARD_API_CONTRACT.md` | API 端点规格 |
| `crawler/extension/dashboard.js` | 现有骨架代码 |
| `crawler/extension/dashboard-api.js` | 现有占位函数 |

## 3. 改文件

| 文件 | 改动位置 | 改动内容 |
|------|---------|---------|
| `crawler/extension/dashboard.js` | 全文 | 实现 hash 路由 + 数据渲染 + 交互占位 |
| `crawler/extension/dashboard-api.js` | 全文 | 实现 6 个 fetch 函数完整逻辑 |

## 4. 技术约束与改动规格

### 4.1 Hash 路由（Q11 决策）

```javascript
function initRouter() {
  const views = {
    '#home': document.getElementById('view-home'),
    '#resume': document.getElementById('view-resume')
  };

  function navigate() {
    const hash = location.hash || '#home';
    Object.entries(views).forEach(([key, el]) => {
      el.style.display = key === hash ? 'block' : 'none';
    });
    // 更新导航栏 active 状态
    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.classList.toggle('active', tab.getAttribute('href') === hash);
    });
    // 首页加载时获取数据
    if (hash === '#home') loadJobs();
  }

  window.addEventListener('hashchange', navigate);
  navigate(); // 初始化
}
```

### 4.2 API 客户端函数

| 函数名 | API 端点 | 方法 | 参数 |
|--------|---------|------|------|
| `fetchJobs({platform, keyword, page, pageSize})` | `/api/jobs` | GET | query |
| `fetchJobDetail(id)` | `/api/jobs/detail` | GET | query |
| `selectJob(id, selected)` | `/api/jobs/select` | POST | body |
| `fetchDeliveryList()` | `/api/delivery/selected` | GET | 无 |
| `uploadResume(file)` | `/api/resume/upload` | POST | FormData |
| `fetchResume()` | `/api/resume` | GET | 无 |

### 4.3 数据渲染函数

- `renderJobGrid(jobs)` — 渲染岗位列表（基础 HTML，无样式）
- `openModal(job)` / `closeModal()` — 浮窗占位（N2 实现）
- `showToast(message, type)` — Toast 占位（N2 实现）
- `initDashboard()` — 初始化入口：绑定路由 + 加载数据

## 5. 测试上下文

- Chrome 打开 dashboard.html
- Controller 需运行中
- 需要有测试数据（可通过 node -e 插入）

## 6. 验收标准

```bash
# 前置：插入测试数据
cd /home/xixil/kimi-code/zhaopin/controller
node -e "
const j = require('./jobs-db');
j.batchInsertJobs([
  {platform:'boss',platformJobId:'R1',title:'前端工程师',company:'A公司',location:'北京',salary:'15-25K'},
  {platform:'boss',platformJobId:'R2',title:'后端工程师',company:'B公司',location:'上海',salary:'20-35K'}
]);
"

# 1. 打开 dashboard.html
# - 默认显示首页视图（#home）
# - Console 无 JS 错误
# - 岗位列表显示 2 条数据（基础 HTML 列表）

# 2. 路由切换
# - 点击"工作台"tab → hash 变为 #resume，视图切换
# - 点击"首页"tab → hash 变为 #home，视图切换
# - 刷新页面后 hash 路由恢复

# 3. API 对接
# - 首页加载时 Console 可见 GET /api/jobs 请求（Network 面板）
# - 请求返回 200
```

## 7. 影响范围（Blast Radius）

| 影响对象 | 影响程度 | 说明 |
|---------|---------|------|
| dashboard.html | 无修改 | HTML 结构不变 |
| dashboard.css | 无修改 | 样式不变 |
| 后端 API | 被调用 | 确保 7 个端点可用 |

## 8. 契约变更

| 变更类型 | 内容 | 向后兼容 |
|---------|------|---------|
| 修改 JS | dashboard.js, dashboard-api.js | 兼容，前端文件 |

## 9. 回退方案

- `git checkout` 恢复两个 JS 文件到 WP1 完成状态

## 10. 顾问补充的鲁棒性要求

- **fetch 统一异常兜底**：所有 fetch 函数必须用 `try...catch` 包裹，当 Node 后端未启动（`fetch failed` / `TypeError`）时，通过 Toast 提示用户"后端未启动，请先启动 Controller"，避免控制台静默失败
- **错误类型区分**：网络错误 vs 服务端错误（非 200 响应）需分别处理

## 11. 边界（不做什么）

- 不做视觉样式优化（N2 处理）
- 不做第二页功能（N3 处理）
- 岗位卡片用基础 HTML 列表渲染，不做 Bento Grid
- 不创建 `dashboard-resume.js`
