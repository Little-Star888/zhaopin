# 里程碑 M1：后端基建

> 状态：进行中 *(生命周期：待开始 → 进行中 → 阻塞 → [done])*
> 目标：建立 Dashboard 所需的后端最小可用底座，作为后续所有前端与联调工作的唯一稳定输入。
> 注：本文件不是产品说明，不重写 PRD，只把既有产品决策拆成可执行后端里程碑。

## 交付边界

- `scraped_jobs` / `resumes` 数据层可用
- Schema V5 migration 可重复执行
- 6 个 Dashboard API 可冒烟
- CORS 白名单可控
- 产出 `DASHBOARD_API_CONTRACT.md`

## 节点路径与状态

| 节点 | 状态 | 涉及角色 | 跳转 |
|------|------|---------|------|
| [M1-N1：DB Schema 与 Migration](../nodes/M1_N1_DB_SCHEMA_AND_MIGRATION.md) | 进行中 | 后端、测试 | → 查看工作包 |
| [M1-N2：API / CORS / 上传](../nodes/M1_N2_API_CORS_AND_UPLOAD.md) | 待开始 | 后端、测试 | → 查看工作包 |
| [M1-N3：后端校验与 API 契约](../nodes/M1_N3_BACKEND_VALIDATION_AND_CONTRACT.md) | 待开始 | 后端、测试 | → 查看工作包 |

## 完成判定

- [ ] Node N1-N3 全部完成
- [ ] 后端工作树干净
- [ ] API 契约文档存在且与实际接口一致
- [ ] 未破坏现有 `/api/status`、`/api/tasks` 等主链路
