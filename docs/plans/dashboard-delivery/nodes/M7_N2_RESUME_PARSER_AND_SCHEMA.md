# 节点 M7-N2：后端简历解析与 Schema 迁移

> 状态：待开始
> 归属里程碑：M7
> 目标：resumes 表新增 content_md 字段，实现 PDF/DOCX → Markdown 解析
> 并行说明：本节点与 M7-N1 无依赖关系，可并行开发

---

## 业务角色导航

### 后端
- [ ] [M7-N2-WP1 Schema v6→v7 迁移](../workpacks/M7_N2_WP1_SCHEMA_V7_MIGRATION.md)
- [ ] [M7-N2-WP2 简历解析引擎](../workpacks/M7_N2_WP2_RESUME_PARSER_ENGINE.md)
- [ ] [M7-N2-WP3 简历更新 API](../workpacks/M7_N2_WP3_RESUME_UPDATE_API.md)

### 测试/检验
- [ ] [M7-N2-WP4 后端冒烟检测](../workpacks/M7_N2_WP4_BACKEND_SMOKE_CHECK.md)

## 前置条件

- M3-N1 数据库 Schema 稳定
- Node.js 后端可正常启动

## 边界

- 只修改 `db.js`、`resume-handler.js`
- 新建 `controller/services/resume-parser.js`
- 不修改 `dashboard-api.js` 的现有接口
- 不修改前端代码

## 字段契约说明

> ⚠️ 本节点不新建独立 Mock/Schema 文档，采用轻量字段契约说明。

| 新增字段 | 类型 | 约束 | 说明 |
|---------|------|------|------|
| `content_md` | TEXT | 可空 | Markdown 格式的简历全文 |
| `status` | VARCHAR(20) | DEFAULT 'uploaded' | 解析状态：uploaded / parsed / parse_failed |

前端降级规则：
- 读取 `content_md` 为空或不存在时，降级显示"暂无简历内容"
- 保存接口（PATCH /api/resume）只更新 `content_md` 字段

## 验收标准

- [ ] Schema 迁移可回滚，旧数据 `content_md` 默认为 NULL
- [ ] 上传 DOCX 后 `content_md` 存入 Markdown 文本
- [ ] 上传 PDF 后 `content_md` 存入纯文本
- [ ] 解析失败的文件 `status` 标记为 `parse_failed`
- [ ] PATCH /api/resume 可更新 `content_md`
