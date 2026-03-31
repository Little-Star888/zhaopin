# 工作包 M8-N3-WP5：AI 功能端到端验收

> 目标：验证 M8 全量功能的完整性和正确性
> 角色：测试/检验
> 预估改动量：0 行（纯测试）
> 实际改动量：~40 行（修复前后端字段映射 Bug）

## 1. 前置条件

- [x] M8-N1、N2、N3 全部通过

## 2. 验收检查项

### 2.1 后端 API（server.js）

- [x] POST /api/ai/config 路由已注册（第974行）
- [x] GET /api/ai/config 路由已注册（第969行）
- [x] POST /api/ai/optimize 路由已注册（第979行）
- [x] POST /api/ai/match 路由已注册（第984行）
- [x] ai-handler.js 导出 handleGetConfig, handleSaveConfig, handleOptimizeResume, handleJobMatch

### 2.2 前端 API 客户端（dashboard-api.js）

- [x] 导出 getAIConfig (第116行)
- [x] 导出 saveAIConfig (第124行)
- [x] 导出 optimizeResume (第137行)
- [x] 导出 matchJobs (第149行)

### 2.3 前端 UI（dashboard.js + dashboard.html）

- [x] dashboard.html 有 AI 配置 tab（第13行 `<a href="#ai-config" class="nav-tab">AI 配置</a>`）
- [x] dashboard.js 有 loadAIConfigView 函数（第952行）
- [x] dashboard.js 有 handleAIOptimize 函数（第627行）
- [x] dashboard.js 有 AI 匹配按钮处理逻辑（第856行 bindDeliveryEvents 中）
- [x] AI 按钮在未配置时 disabled（第401行、第825行）
- [x] 切换 Provider 自动填充 Base URL 和 Model（第1016行）

### 2.4 数据库（db.js）

- [x] SCHEMA_VERSION 为 8（第9行）
- [x] ai_configs 表定义正确（migrateToV8 第918-956行）
- [x] 默认插入 zhipu/kimi/openai 三条 provider 记录

### 2.5 LLM Factory

- [x] llm-factory.js 导出 createLLMClient, createActiveLLMClient
- [x] test-llm.js 独立验证脚本存在且可运行
- [x] openai-compatible-provider.js 实现 OpenAI 兼容层
- [x] credential-crypto.js 提供加密/脱敏能力

### 2.6 AI 配置

- [x] UI 中可配置智谱AI（自动填充 Base URL：https://open.bigmodel.cn/api/coding/paas/v4）
- [x] UI 中可配置 Kimi（自动填充 Base URL：https://api.moonshot.cn/v1）
- [x] UI 中可配置 OpenAI（自动填充 Base URL：https://api.openai.com/v1）
- [x] 保存后刷新页面配置回显（Key 脱敏 via api_key_masked 字段）
- [x] 数据库中 API Key 已加密（credential-crypto.js encrypt 函数）

### 2.7 简历优化

- [x] 点击"AI 优化简历"按钮触发 handleAIOptimize 函数
- [x] 优化结果可编辑和保存（切换到编辑模式）
- [x] 指定岗位时考虑岗位要求（从待投递列表取第一个岗位 ID）
- [x] 未上传简历时给出提示（"请先上传简历"）

### 2.8 岗位匹配

- [x] 点击"AI 智能匹配"按钮触发 matchJobs 调用
- [x] 匹配结果解析覆盖 matches/results 多种返回格式
- [x] 分数显示为百分比（0-100%）
- [x] 推荐理由在 Toast 中展示
- [x] 无岗位时给出提示（后端返回 400 "没有可匹配的岗位"）

### 2.9 错误处理

- [x] 未配置 AI 时所有 AI 按钮禁用（disabled 属性 + title 提示）
- [x] AI 调用异常有 Toast 错误提示
- [x] 后端不可达时前端有兜底错误处理

### 2.10 代码检查

- [x] 所有 JS 文件语法正确（node -c 全部通过）
- [x] CORS 允许 POST/PATCH 方法（Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS）

## 3. 发现并修复的问题

### BUG-1: 前后端字段映射不一致（严重）

**文件**: `/home/xixil/kimi-code/zhaopin/crawler/extension/dashboard.js`

| 问题 | 修复前 | 修复后 |
|------|--------|--------|
| GET 配置回显 | `data.model` (undefined) | `activeConfig.model_name` |
| GET 配置回显 | `data.api_key` (undefined) | `activeConfig.api_key_masked` |
| GET 配置回显 | 直接读 data 对象 | 从 `data.configs[]` 数组中取值 |
| POST 保存字段 | 发送 `model` | 发送 `model_name` |
| 保存后回显 | 读取 `data.api_key` | 重新 GET 配置后读取 `api_key_masked` |
| 简历优化返回 | 读取 `data.content_md` | 优先读取 `data.optimized_content_md` |
| 岗位匹配返回 | 读取 `data.results` | 优先读取 `data.matches` |
| AI 配置状态 | 检查 `data.api_key` | 检查 configs 数组中 is_active=1 的项 |

## 4. 验收结论

- [x] 全部通过（修复后） → M8 里程碑完成
