# 工作包 M7-N2-WP3：简历更新 API

> 目标：新增 PATCH /api/resume 端点，改造 POST /api/resume/upload 增加解析流程
> 角色：后端
> 预估改动量：修改 ~40 行

## 1. 前置条件

- M7-N2-WP1 通过（Schema 已迁移）
- M7-N2-WP2 通过（Parser 引擎就绪）

## 2. 读文件（执行前必读）

| 文件 | 读取目的 |
|------|---------|
| `crawler/controller/resume-handler.js` | 现有上传和获取逻辑 |
| `crawler/controller/resume-db.js` | 数据库操作方法 |

## 3. 改动规格

### 3.1 改造 POST /api/resume/upload

在文件保存到磁盘后，增加解析流程：
1. 调用 `parseResumeToMarkdown(filePath, mimeType)`
2. 成功 → 更新 `content_md` 和 `status = 'parsed'`
3. 失败 → 更新 `status = 'parse_failed'`，不影响文件存储

### 3.2 新增 PATCH /api/resume

```
PATCH /api/resume
Content-Type: application/json

Body: { "content_md": "# 张三\n## 教育背景\n..." }

Response: { "success": true, "resume": { ... } }
```

- 只更新 `content_md` 字段
- 如果 resumes 表无记录，返回 404
- 不修改文件本身（只修改数据库中的文本内容）

### 3.3 前端降级规则

- GET /api/resume 返回的 `content_md` 为空时，前端降级显示"暂无简历内容"
- 前端编辑保存时调用 PATCH /api/resume

## 4. 验证

- [ ] 上传 DOCX 文件后，GET /api/resume 返回 content_md 有内容
- [ ] 上传损坏的文件后，status 为 parse_failed，文件仍存在
- [ ] PATCH /api/resume 可更新 content_md
- [ ] 无简历记录时 PATCH 返回 404
