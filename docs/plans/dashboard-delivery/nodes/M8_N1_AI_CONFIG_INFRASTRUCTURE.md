# 节点 M8-N1：AI 配置基础设施

> 状态：待开始
> 归属里程碑：M8
> 目标：新建 ai_configs 表，实现加密存储的 AI 配置管理 API

---

## 业务角色导航

### 后端
- [ ] [M8-N1-WP1 ai_configs 表设计与迁移](../workpacks/M8_N1_WP1_AI_CONFIG_SCHEMA.md)
- [ ] [M8-N1-WP2 凭据加密存储服务](../workpacks/M8_N1_WP2_CREDENTIAL_ENCRYPTION.md)
- [ ] [M8-N1-WP3 配置管理 API](../workpacks/M8_N1_WP3_CONFIG_API.md)

### 测试/检验
- [ ] [M8-N1-WP4 配置基础设施冒烟检测](../workpacks/M8_N1_WP4_CONFIG_SMOKE_CHECK.md)

## 前置条件

- M7 全部通过（M7-N2 Schema 已稳定在 v7）

## 边界

- 只修改 `db.js`（Schema 迁移）
- 新建 `controller/ai-handler.js`（路由）
- 新建 `controller/services/` 目录下加密相关工具
- 不修改现有任何 API
- 不安装 AI SDK 依赖

## 验收标准

- [ ] ai_configs 表创建成功，Schema 可回滚
- [ ] API Key 加密存储，数据库中无明文
- [ ] GET /api/ai/config 返回脱敏后的配置（Key 打码显示）
- [ ] POST /api/ai/config 可保存新配置
- [ ] 支持多 provider 配置（智谱、Kimi、OpenAI 等）
