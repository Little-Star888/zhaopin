# 里程碑 M8：AI 集成

> 状态：待开始 *(生命周期：待开始 → 进行中 → 阻塞 → [done])*
> 全局架构决策：[M7_M8_PLAN.md](../../../crawler/extension/M7_M8_PLAN.md)
> 分歧记录：[M7_M8_DIVERGENCES.md](../../../crawler/extension/M7_M8_DIVERGENCES.md)

## 核心依赖

- M7 全部通过（Schema v7 稳定，Dashboard 重构完成）

## 宏观交付边界

- **LLM Factory 模式**：`controller/services/llm/` 目录（纯 JS，JSDoc 契约）
- **AES 加密存储**：API Key 加密存入 SQLite，前端脱敏显示
- **OpenAI 兼容协议**：智谱AI / Kimi / OpenAI 等厂商统一接入
- **不修改现有 API**：AI 接口通过独立的 `ai-handler.js` 提供

## 节点路径与状态

| 节点 | 状态 | 角色 | 依赖 | 跳转 |
|------|------|------|------|------|
| [M8-N1：AI 配置基础设施](../nodes/M8_N1_AI_CONFIG_INFRASTRUCTURE.md) | 待开始 | 后端、测试 | M7 全部 | → WP1~WP4 |
| [M8-N2：LLM 调用框架](../nodes/M8_N2_LLM_FRAMEWORK.md) | 待开始 | 后端、测试 | M8-N1 | → WP1~WP4 |
| [M8-N3：AI 业务功能](../nodes/M8_N3_AI_BUSINESS_FEATURES.md) | 待开始 | 前端、后端、测试 | **M7-N3** + M8-N1 + M8-N2 | → WP1~WP5 |

## 执行拓扑

```
M7 全部 ──→ M8-N1（后端 AI 配置，4 WP）──→ M8-N2（后端 LLM 框架，4 WP）──┐
                                                                           ├──→ M8-N3（前端UI + 后端业务 + E2E，5 WP）
M7-N3 ──────────────────────────────────────────────────────────────────────┘
```

> M8-N3 的前端工作包需要修改 `dashboard.html/js/css`，因此必须等 M7-N3（Dashboard 重构）完成。

## 完成判定

- [ ] ai_configs 表创建，AES 加密服务就绪
- [ ] LLM Factory + OpenAI 兼容 Provider 运行正常，含真实 API 调用冒烟检测
- [ ] 简历优化 API、岗位匹配 API 可用
- [ ] 前端 AI 配置面板 UI 完成，AI 功能交互集成完成
- [ ] AI 功能端到端验收通过
