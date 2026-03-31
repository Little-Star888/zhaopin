# 工作包 M7-N2-WP4：后端冒烟检测

> 目标：验证简历解析和更新 API 的基本功能
> 角色：测试/检验
> 预估改动量：0 行（纯测试）

## 1. 前置条件

- M7-N2-WP1、WP2、WP3 全部通过

## 2. 测试检查项

### 2.1 Schema 迁移

- [ ] 数据库 schema_version 为 7
- [ ] resumes 表包含 content_md 和 status 列
- [ ] 旧记录 content_md 为 NULL

### 2.2 文件上传 + 解析

- [ ] 上传 .docx 文件 → content_md 有 Markdown 内容，status = 'parsed'
- [ ] 上传 .pdf 文件 → content_md 有纯文本内容，status = 'parsed'
- [ ] 上传不支持的格式 → 返回错误，不影响已有数据
- [ ] 上传损坏文件 → status = 'parse_failed'

### 2.3 简历更新

- [ ] PATCH /api/resume 可更新 content_md
- [ ] 更新后 GET /api/resume 返回新内容
- [ ] 无记录时 PATCH 返回 404

### 2.4 代码检查

- [ ] `controller/services/resume-parser.js` 存在且导出正确
- [ ] npm 依赖中包含 mammoth、pdf-parse、turndown
