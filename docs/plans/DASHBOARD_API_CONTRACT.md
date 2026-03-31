# Dashboard API 契约

> M2 前端的唯一后端输入。本文档基于 handler 源码逐端点交叉验证生成。

## 基础信息

- Base URL: `http://127.0.0.1:7893`
- CORS: 动态白名单（`chrome-extension://[a-z0-9]{32}` + `localhost` / `127.0.0.1`）
- 认证：无（本地部署）
- Content-Type: `application/json`（上传端点除外）

---

## 端点列表

### 1. GET /api/jobs

获取岗位快照列表（分页 + 多条件过滤）。

**Query 参数**

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| platform | string | 否 | — | 平台过滤（如 `boss`、`lagou`） |
| keyword | string | 否 | — | 关键词过滤 |
| page | number | 否 | 1 | 页码 |
| pageSize | number | 否 | 20 | 每页条数 |
| selected | boolean | 否 | — | `true`/`1` 仅已选中，`false`/`0` 仅未选中，不传则全部 |

**成功响应 200**

```json
{
  "jobs": [
    {
      "id": 1,
      "platform": "boss",
      "platformJobId": "101234567",
      "title": "前端工程师",
      "company": "某公司",
      "location": "北京",
      "url": "https://...",
      "keywords": "React,TypeScript",
      "salary": "15K-25K",
      "experience": "3-5年",
      "education": "本科",
      "match_status": "not_ready",
      "selected": 0,
      "crawl_batch_id": null,
      "crawl_mode": null,
      "job_alive_status": "unknown",
      "raw_payload": null,
      "crawled_at": "2026-03-25 10:30:00"
    }
  ],
  "total": 42
}
```

**jobs 元素字段说明**

| 字段 | 类型 | 说明 |
|------|------|------|
| id | number | 自增主键 |
| platform | string | 抓取平台 |
| platformJobId | string | 平台原始职位 ID |
| title | string | 职位名称 |
| company | string | 公司名称 |
| location | string\|null | 工作地点 |
| url | string\|null | 职位详情链接 |
| keywords | string\|null | 关键词（逗号分隔） |
| salary | string\|null | 薪资范围 |
| experience | string\|null | 经验要求 |
| education | string\|null | 学历要求 |
| match_status | string | 匹配状态（默认 `not_ready`） |
| selected | number | 选中状态（0/1） |
| crawled_at | string | 抓取时间 |

---

### 2. GET /api/jobs/detail?id=N

获取单条岗位详情。

**Query 参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | number | 是 | 职位 ID |

**成功响应 200**

```json
{
  "job": { "id": 1, "platform": "boss", ... }
}
```

**错误响应**

- `400` — `{ "error": "Missing or invalid id parameter" }`
- `404` — `{ "error": "Job not found" }`

---

### 3. POST /api/jobs/select

加入/移除待投递列表。

**Request Body**（Content-Type: application/json）

```json
{ "id": 1, "selected": true }
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | number | 是 | 职位 ID |
| selected | boolean | 是 | `true` 加入待投递，`false` 移除 |

**成功响应 200**

```json
{ "success": true, "id": 1 }
```

**错误响应**

- `400` — `{ "error": "Missing or invalid id" }` 或 `{ "error": "Invalid JSON" }`
- `404` — `{ "error": "Job not found" }`

---

### 4. GET /api/delivery/selected

获取已选中的待投递列表（不分页）。

**成功响应 200**

```json
{
  "jobs": [
    { "id": 1, "platform": "boss", "title": "...", ... }
  ]
}
```

> 返回字段同 GET /api/jobs 中的 job 对象。空列表返回 `[]`。

---

### 5. POST /api/resume/upload

上传简历文件。

**Content-Type**: `multipart/form-data`

**FormData 字段**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| file | File | 是 | 简历文件（最大 10MB） |

**成功响应 200**

```json
{
  "id": 1,
  "filePath": "/absolute/path/to/uploads/resumes/...",
  "originalName": "my_resume.pdf",
  "sizeBytes": 524288,
  "uploadedAt": "2026-03-25 12:36:05"
}
```

**错误响应**

- `400` — `{ "error": "No file provided" }` 或 `{ "error": "Upload failed: ..." }`
- `500` — `{ "error": "..." }`（数据库写入失败）

---

### 6. GET /api/resume

获取当前（最新上传的）简历信息。

**成功响应 200**

```json
{
  "resume": {
    "id": 1,
    "file_name": "my_resume.pdf",
    "file_path": "/absolute/path/to/uploads/resumes/...",
    "file_size": 524288,
    "upload_time": "2026-03-25 12:36:05"
  }
}
```

**空态响应 200**

```json
{ "resume": null }
```

---

### 7. DELETE /api/resume?id=N

删除简历记录（同时清理服务器物理文件）。

**Query 参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | number | 是 | 简历 ID |

**成功响应 200**

```json
{ "success": true }
```

**错误响应**

- `400` — `{ "error": "Missing or invalid id parameter" }`
- `404` — `{ "error": "Resume not found" }`

---

## 错误码汇总

| 状态码 | 含义 | 场景 |
|--------|------|------|
| 400 | 参数缺失或格式错误 | 缺少 id、无效 JSON、未上传文件 |
| 404 | 资源不存在 | job/resume id 无对应记录 |
| 500 | 服务器内部错误 | 数据库写入失败 |

---

## 通用规则

- **字段命名**：API 响应使用 camelCase（如 `platformJobId`、`sizeBytes`），数据库列名为 snake_case（如 `platform_job_id`、`file_size`），handler 层自动映射
- **日期格式**：`YYYY-MM-DD HH:MM:SS` 字符串（SQLite CURRENT_TIMESTAMP 输出格式）
- **分页默认值**：`page=1`、`pageSize=20`
- **空列表不返回 null**：始终返回 `[]`
- **布尔值**：`selected` 在数据库中为 `0/1`，API 响应原样返回数字

---

## 不包含

- `server.js` 源码及路由实现
- `db.js` 内部实现及迁移逻辑
- `background.js` 交互细节
- 非本里程碑的遗留端点（`/enqueue`、`/queue`、`/start` 等）
