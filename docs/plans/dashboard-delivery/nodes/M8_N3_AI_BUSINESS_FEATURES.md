# 节点 M8-N3：AI 业务功能

> 状态：待开始
> 归属里程碑：M8
> 目标：实现简历优化和岗位匹配打分，完成前端 AI 面板集成

---

## 业务角色导航

### 后端
- [ ] [M8-N3-WP1 简历优化 API](../workpacks/M8_N3_WP1_RESUME_OPTIMIZE_API.md)
- [ ] [M8-N3-WP2 岗位匹配 API](../workpacks/M8_N3_WP2_JOB_MATCH_API.md)

### 前端
- [ ] [M8-N3-WP3 AI 配置面板 UI](../workpacks/M8_N3_WP3_AI_CONFIG_UI.md)
- [ ] [M8-N3-WP4 AI 功能交互集成](../workpacks/M8_N3_WP4_AI_INTERACTION_INTEGRATION.md)

### 测试/检验
- [ ] [M8-N3-WP5 AI 功能端到端验收](../workpacks/M8_N3_WP5_AI_E2E_ACCEPTANCE.md)

## 前置条件

- M7-N3 通过（Dashboard Constructivism 重构完成，`dashboard.html/js/css` 已就绪）
- M8-N1 通过（AI 配置基础设施就绪）
- M8-N2 通过（LLM Factory 可独立运行）

## 边界

- 后端新增 AI 路由（`controller/ai-handler.js`）
- 前端修改 `dashboard.html`、`dashboard.js`、`dashboard.css`
- 不修改 `dashboard-api.js`（AI 接口独立于现有 API）
- 不修改后端现有路由

## 验收标准

- [ ] 用户可在 UI 中配置 AI 提供商（API Key / Base URL / Model）
- [ ] 配置保存后刷新页面能正确回显（Key 脱敏）
- [ ] "AI 优化简历" 按钮可调用 LLM 并返回优化后的 Markdown
- [ ] "AI 智能匹配" 可对简历与岗位列表进行打分
- [ ] 未配置 AI 时给出明确提示，不崩溃
- [ ] AI 调用期间 UI 显示 loading 状态
