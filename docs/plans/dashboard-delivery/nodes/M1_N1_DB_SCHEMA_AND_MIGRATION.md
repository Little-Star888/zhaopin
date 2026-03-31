# 节点 M1-N1：DB Schema 与 Migration

> 状态：进行中
> 归属里程碑：M1 后端基建
> 目标：把数据库结构、迁移路径和快照清理边界钉死。

## 业务角色导航

### 后端

- [ ] [WP2：scraped_jobs 表结构](../workpacks/M1_N1_WP2_SCRAPED_JOBS_SCHEMA.md)
- [ ] [WP3：resumes 表与 V5 migration](../workpacks/M1_N1_WP3_RESUME_SCHEMA_AND_MIGRATION_V5.md)

### 测试/检验

- [ ] [WP4：DB 自检](../workpacks/M1_N1_WP4_DB_SELF_CHECK.md)

## 边界

- 只处理 DB 结构和 migration
- 不进入 API handler
- 不进入前端、manifest、popup
- 阅读需求文档属于各工作包前置动作，不再单列为独立执行工作包
