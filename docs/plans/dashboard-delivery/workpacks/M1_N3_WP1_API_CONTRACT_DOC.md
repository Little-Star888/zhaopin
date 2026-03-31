# 工作包 M1-N3-WP1：API 契约文档

> 目标：产出标准化 API 契约文档，作为 M2 前端的唯一后端输入。
> 角色：后端（文档）
> 预估改动量：新增 ~120 行（纯文档）

## 1. 前置条件

- M1-N2-WP4（API 冒烟检测）通过

## 2. 读文件（执行前必读）

| 文件 | 读取目的 |
|------|---------|
| `controller/jobs-handler.js` | 实际 handler 代码，提取端点规格 |
| `controller/resume-handler.js` | 实际 handler 代码，提取端点规格 |
| `controller/server.js` | 路由注册，确认 pathname |

## 3. 写文件

| 文件 | 说明 |
|------|------|
| `docs/plans/DASHBOARD_API_CONTRACT.md`（新建） | API 契约文档 |

## 4. 技术约束与改动规格

### 4.1 文档结构

```markdown
# Dashboard API 契约

## 基础信息
- Base URL: http://127.0.0.1:7893
- CORS: 动态白名单（chrome-extension:// + localhost）
- 认证：无（本地部署）

## 端点列表

### GET /api/jobs
- 描述：获取岗位快照列表（分页）
- Query 参数：platform(可选), keyword(可选), page(可选,默认1), pageSize(可选,默认20), selected(可选)
- 响应：{jobs: [...], total: N}
- jobs 元素字段：id, platform, platformJobId, title, company, location, url, keywords, salary, experience, education, matchStatus, selected, crawledAt

### GET /api/jobs/detail
- 描述：获取单条岗位详情
- Query 参数：id(必填)
- 成功响应：{job: {...}}
- 错误响应：404 {error: "not found"}

### POST /api/jobs/select
- 描述：加入/移除待投递
- Body：{id: N, selected: boolean}
- 成功响应：{success: true, id: N}

### GET /api/delivery/selected
- 描述：获取已选中的待投递列表
- 响应：{jobs: [...]}

### POST /api/resume/upload
- 描述：上传简历
- Content-Type: multipart/form-data
- FormData 字段：file
- 成功响应：{id, filePath, originalName, sizeBytes, uploadedAt}
- 错误响应：400 {error: "no file provided"}

### GET /api/resume
- 描述：获取当前简历信息
- 成功响应：{resume: {...}}
- 空态响应：{resume: null}

### DELETE /api/resume
- 描述：删除简历记录
- Query 参数：id(必填)
- 成功响应：{success: true}
- 错误响应：404 {error: "not found"}

## 错误码
- 400: 参数缺失或格式错误
- 404: 资源不存在
- 500: 服务器内部错误

## 不包含
- server.js 源码
- db.js 内部实现
- background.js 交互细节
```

### 4.2 关键规则

- **字段命名**：API 响应使用 camelCase（如 `platformJobId`），不使用 snake_case
- **日期格式**：ISO 8601 字符串（如 `2026-03-25T10:30:00.000Z`）
- **分页默认值**：`page=1`, `pageSize=20`, `pageSize` 上限 100
- **空列表不返回 null**：返回 `[]` 而非 `null`

## 5. 测试上下文

- 无需运行环境，纯文档比对
- 逐端点与 handler 代码交叉验证

## 6. 验收标准

```bash
# 1. 文件存在
ls /home/xixil/kimi-code/zhaopin/docs/plans/DASHBOARD_API_CONTRACT.md

# 2. 内容完整性（手动检查）
# - 7 个端点全部列出
# - 每个端点有：方法、pathname、参数、响应格式
# - 错误码说明存在
# - "不包含"章节存在

# 3. 一致性（逐端点比对）
# 比对 handler 代码中的实际参数名与文档是否一致
# 比对响应 JSON 结构与文档是否一致
```

## 7. 影响范围（Blast Radius）

| 影响对象 | 影响程度 | 说明 |
|---------|---------|------|
| M2 前端 | 核心输入 | 前端只读此文档，不读后端源码 |
| 后端代码 | 无影响 | 纯文档产出 |

## 8. 契约变更

| 变更类型 | 内容 | 向后兼容 |
|---------|------|---------|
| 新增文档 | API 契约 | 兼容 |

## 9. 回退方案

- 删除 `DASHBOARD_API_CONTRACT.md`

## 10. 边界（不做什么）

- 不改任何代码文件
- 不创建前端文件
- 不包含 server.js 源码
- 不包含 db.js 内部实现
- 不包含 background.js 交互细节
