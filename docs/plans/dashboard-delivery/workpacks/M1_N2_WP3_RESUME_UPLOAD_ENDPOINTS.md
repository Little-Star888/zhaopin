# 工作包 M1-N2-WP3：简历上传与读取端点

> 目标：实现简历上传（multipart）和简历信息读取/删除 3 个 API 端点。
> 角色：后端
> 预估改动量：新增 ~100 行（resume-handler.js）+ 修改 ~10 行（server.js）

## 1. 前置条件

- M1-N1-WP4（DB 自检）通过
- M1-N2-WP1（CORS 改造）通过
- M1-N2-WP1 中 formidable 已安装
- `resume-db.js` 已就绪（M1-N1-WP3 产出）

## 2. 读文件（执行前必读）

| 文件 | 读取目的 |
|------|---------|
| `controller/resume-db.js` | 确认可用的 CRUD 函数签名 |
| `controller/server.js` | 路由注册位置 |
| `docs/plans/DIVERGENCE_DASHBOARD_AND_MULTIPLATFORM.md` Q12 | formidable 选型、multipart 处理方式 |

## 3. 写文件

| 文件 | 说明 |
|------|------|
| `controller/resume-handler.js`（新建） | 3 个 Handler 函数 |

## 4. 改文件

| 文件 | 改动位置 | 改动内容 |
|------|---------|---------|
| `controller/server.js` | `handleRequest` 路由区 | 新增 3 个路由分支 |
| `controller/server.js` | 文件顶部 require 区 | `const resumeHandler = require('./resume-handler');` |

## 5. 技术约束与改动规格

### 5.1 端点规格

| 端点 | 方法 | 参数 | 响应格式 | 错误 |
|------|------|------|---------|------|
| `/api/resume/upload` | POST | FormData: `file` | `{id, filePath, originalName, sizeBytes, uploadedAt}` | 400 无文件 |
| `/api/resume` | GET | 无 | `{resume: {...}}` 或 `{resume: null}` | 无 |
| `/api/resume` | DELETE | `?id=N` | `{success: true}` | 404 不存在 |

### 5.2 上传处理（Q12 决策）

- 使用 `formidable` 解析 multipart（不用 multer，multer 不兼容原生 http）
- 文件保存到 `controller/uploads/resumes/`（如不存在则 `fs.mkdirSync` 创建）
- 文件名：`${Date.now()}-${originalName}`（时间戳防冲突）
- 数据库只存元数据（路径、文件名、大小、时间），不存文件内容
- 不做 base64 编码（Q1 决策：简历存原文件）

### 5.3 Handler 函数设计

```javascript
function handleResumeUpload(req, res) {
  // formidable 解析 → 保存文件 → insertResume → 返回 JSON
}

function handleGetResume(req, res) {
  // getLatestResume() → 返回 JSON（无简历返回 null）
}

function handleDeleteResume(req, res) {
  // 从 query 读 id → deleteResume(id) → 返回 JSON
}
```

### 5.4 路由注册

```javascript
if (pathname === '/api/resume/upload' && method === 'POST') {
  resumeHandler.handleResumeUpload(req, res);
} else if (pathname === '/api/resume' && method === 'GET') {
  resumeHandler.handleGetResume(req, res);
} else if (pathname === '/api/resume' && method === 'DELETE') {
  resumeHandler.handleDeleteResume(req, res);
}
```

## 6. 测试上下文

- Controller 需要启动
- 准备一个测试 PDF 文件用于上传验证

## 7. 验收标准（可执行命令）

```bash
# 1. 上传简历（空态）
curl -s -F "file=@test.pdf" http://127.0.0.1:7893/api/resume/upload | python3 -m json.tool
# 预期：{"id":1,"filePath":"...","originalName":"test.pdf","sizeBytes":...,"uploadedAt":"..."}

# 2. 获取当前简历
curl -s http://127.0.0.1:7893/api/resume | python3 -m json.tool
# 预期：返回刚上传的简历信息

# 3. 验证文件存在
ls controller/uploads/resumes/
# 预期：看到时间戳-test.pdf 文件

# 4. 上传第二份（覆盖）
curl -s -F "file=@test2.pdf" http://127.0.0.1:7893/api/resume/upload | python3 -m json.tool
# 预期：新的简历信息，id 递增

# 5. 删除简历
curl -s -X DELETE "http://127.0.0.1:7893/api/resume?id=1" | python3 -m json.tool
# 预期：{"success":true}
```

## 8. 影响范围（Blast Radius）

| 影响对象 | 影响程度 | 说明 |
|---------|---------|------|
| 现有 API 端点 | 无影响 | 新增路由 |
| `resume-db.js` | 被调用 | 确保函数签名匹配 |
| 文件系统 | 新增目录 | `uploads/resumes/` 自动创建 |
| M1-N2-WP4（冒烟检测） | 下游依赖 | 本 WP 产出供冒烟检测验证 |

## 9. 契约变更

| 变更类型 | 内容 | 向后兼容 |
|---------|------|---------|
| 新增 API | 3 个端点 | 兼容 |
| 文件系统 | `uploads/resumes/` 目录 | 兼容，新增目录 |

## 10. 回退方案

- 删除 `resume-handler.js`
- 从 `server.js` 移除 3 个路由分支
- 删除 `uploads/resumes/` 目录（测试数据）

## 11. 顾问补充的鲁棒性要求

- **简历删除时清理物理文件**：`DELETE /api/resume` handler 必须调用 `fs.unlinkSync(filePath)` 删除本地物理文件，防止孤儿文件磁盘泄漏
- **上传落盘防冲突**：文件名用 `${Date.now()}-${uuidv4()}` 双重防冲突（`crypto.randomUUID()` 生成 UUID）

## 12. 边界（不做什么）

- 不处理 AI 评分（本期占位）
- 不改 `db.js`
- 不创建前端文件
- 不做 base64 编码
- 不做多份简历切换 UI（本期只支持单份）
- 不实现文件下载端点（前端直接通过路径访问即可）
