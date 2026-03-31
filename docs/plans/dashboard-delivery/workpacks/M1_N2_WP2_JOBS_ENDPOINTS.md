# 工作包 M1-N2-WP2：Jobs API 端点

> 目标：实现 scraped_jobs 的 4 个 API 端点，注册到 server.js 路由。
> 角色：后端
> 预估改动量：新增 ~120 行（jobs-handler.js）+ 修改 ~15 行（server.js）

## 1. 前置条件

- M1-N1-WP4（DB 自检）通过
- M1-N2-WP1（CORS 改造）通过
- `jobs-db.js` 已就绪（M1-N1-WP2 产出）

## 2. 读文件（执行前必读）

| 文件 | 读取目的 |
|------|---------|
| `controller/jobs-db.js` | 确认可用的 CRUD 函数签名 |
| `controller/server.js` | 理解 `handleRequest` 中路由注册位置和风格 |
| `docs/plans/DIVERGENCE_DASHBOARD_AND_MULTIPLATFORM.md` Q12 | 路由风格：精确匹配 + query/body 传参 |

## 3. 写文件

| 文件 | 说明 |
|------|------|
| `controller/jobs-handler.js`（新建） | 4 个 Handler 函数 |

## 4. 改文件

| 文件 | 改动位置 | 改动内容 |
|------|---------|---------|
| `controller/server.js` | `handleRequest` 函数内的 if/else 路由区 | 新增 4 个路由分支 |
| `controller/server.js` | 文件顶部 require 区 | `const jobsHandler = require('./jobs-handler');` |

## 5. 技术约束与改动规格

### 5.1 端点规格

| 端点 | 方法 | 参数 | 响应格式 | 错误 |
|------|------|------|---------|------|
| `/api/jobs` | GET | `?platform=&keyword=&page=1&pageSize=20&selected=` | `{jobs: [...], total: N}` | 400 参数错误 |
| `/api/jobs/detail` | GET | `?id=N` | `{job: {...}}` | 404 不存在 |
| `/api/jobs/select` | POST | body: `{id: N, selected: true/false}` | `{success: true, id: N}` | 404 不存在 |
| `/api/delivery/selected` | GET | 无 | `{jobs: [...]}` | 无 |

### 5.2 Handler 函数设计

```javascript
// jobs-handler.js
const jobsDb = require('./jobs-db');

function handleGetJobs(req, res) {
  // 从 parsedUrl.searchParams 读取 platform, keyword, page, pageSize, selected
  // 调用 jobsDb.getJobs({...})
  // 返回 JSON + setCORS
}

function handleGetJobDetail(req, res) {
  // 从 query 读取 id
  // 调用 jobsDb.getJobById(id)
  // 不存在返回 404
}

function handleSelectJob(req, res) {
  // 从 body 读取 id, selected
  // 调用 jobsDb.updateSelected(id, selected)
  // 返回 200 或 404
}

function handleGetDeliveryList(req, res) {
  // 调用 jobsDb.getSelectedJobs()
  // 返回 JSON 数组
}
```

### 5.3 路由注册（server.js 内）

```javascript
// 在 handleRequest 的路由区添加：
if (pathname === '/api/jobs' && method === 'GET') {
  jobsHandler.handleGetJobs(req, res);
} else if (pathname === '/api/jobs/detail' && method === 'GET') {
  jobsHandler.handleGetJobDetail(req, res);
} else if (pathname === '/api/jobs/select' && method === 'POST') {
  jobsHandler.handleSelectJob(req, res);
} else if (pathname === '/api/delivery/selected' && method === 'GET') {
  jobsHandler.handleGetDeliveryList(req, res);
}
```

## 6. 测试上下文

- Controller 需要启动
- 需要先通过 `node -e` 插入测试数据到 `scraped_jobs`

## 7. 验收标准（可执行命令）

```bash
# 前置：插入测试数据
cd /home/xixil/kimi-code/zhaopin/controller
node -e "
const j = require('./jobs-db');
j.batchInsertJobs([
  {platform:'boss',platformJobId:'T1',title:'前端工程师',company:'A公司',location:'北京'},
  {platform:'boss',platformJobId:'T2',title:'后端工程师',company:'B公司',location:'上海'}
]);
"

# 1. GET /api/jobs
curl -s http://127.0.0.1:7893/api/jobs | python3 -m json.tool
# 预期：{"jobs":[...], "total":2}

# 2. GET /api/jobs?platform=boss
curl -s "http://127.0.0.1:7893/api/jobs?platform=boss" | python3 -m json.tool
# 预期：只返回 boss 平台数据

# 3. GET /api/jobs/detail?id=1
curl -s "http://127.0.0.1:7893/api/jobs/detail?id=1" | python3 -m json.tool
# 预期：{"job":{"id":1,"platform":"boss",...}}

# 4. GET /api/jobs/detail?id=999（不存在）
curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:7893/api/jobs/detail?id=999"
# 预期：404

# 5. POST /api/jobs/select
curl -s -X POST -H "Content-Type: application/json" \
  -d '{"id":1,"selected":true}' http://127.0.0.1:7893/api/jobs/select
# 预期：{"success":true,"id":1}

# 6. GET /api/delivery/selected
curl -s http://127.0.0.1:7893/api/delivery/selected | python3 -m json.tool
# 预期：只含 id=1 的记录
```

## 8. 影响范围（Blast Radius）

| 影响对象 | 影响程度 | 说明 |
|---------|---------|------|
| 现有 API 端点 | 无影响 | 新增路由在 else-if 链末尾，不修改现有分支 |
| `jobs-db.js` | 被调用 | 确保函数签名匹配 |
| M1-N2-WP4（冒烟检测） | 下游依赖 | 本 WP 产出供冒烟检测验证 |

## 9. 契约变更

| 变更类型 | 内容 | 向后兼容 |
|---------|------|---------|
| 新增 API | 4 个端点 | 兼容，新增路由 |
| 响应格式 | JSON | 符合现有 API 风格 |

## 10. 回退方案

- 删除 `jobs-handler.js`
- 从 `server.js` 移除 4 个路由分支和 require 语句

## 11. 边界（不做什么）

- 不处理简历相关逻辑（M1-N2-WP3 负责）
- 不改 `db.js`
- 不创建前端文件
- 不实现分页的 cursor 模式（简单 LIMIT/OFFSET 即可）
