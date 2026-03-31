# 节点 M8-N2：LLM 调用框架

> 状态：待开始
> 归属里程碑：M8
> 目标：实现 LLM Factory 工厂模式 + OpenAI 兼容 Provider，独立可测
> 约束：本节点必须包含一个最小可运行验证用例，不能只交付空框架

---

## 业务角色导航

### 后端
- [ ] [M8-N2-WP1 LLM 契约定义](../workpacks/M8_N2_WP1_LLM_CONTRACTS.md)
- [ ] [M8-N2-WP2 OpenAI 兼容 Provider](../workpacks/M8_N2_WP2_OPENAI_PROVIDER.md)
- [ ] [M8-N2-WP3 LLM Factory 工厂](../workpacks/M8_N2_WP3_LLM_FACTORY.md)

### 测试/检验
- [ ] [M8-N2-WP4 框架冒烟检测（含最小业务桩）](../workpacks/M8_N2_WP4_FRAMEWORK_SMOKE_CHECK.md)

## 前置条件

- M8-N1 通过（ai_configs 表和加密服务就绪）

## 边界

- 新建 `controller/services/llm/` 目录
- 安装 `openai` npm 依赖
- 不实现具体的简历优化/匹配业务逻辑
- 不修改前端代码

## 最小验证桩要求

> 本节点验收必须包含一个真实 provider 调用作为验证桩。

验证桩：向已配置的 AI provider 发送一段固定 prompt（如"请将以下文本翻译为英文"），验证：
1. Factory 能正确实例化 Provider
2. Provider 能成功调用 AI API 并返回结果
3. 错误处理生效（无效 Key / 网络超时）

## 验收标准

- [ ] `llm-contracts.js` 定义了跨模块共享契约
- [ ] `openai-compatible-provider.js` 通过动态 baseURL/apiKey 调用
- [ ] `llm-factory.js` 根据 provider 字段动态实例化
- [ ] 纯后端脚本可独立调用 LLM 并返回结果（不依赖前端）
- [ ] 无效 Key 时返回明确错误，不崩溃
