# 工作包 M8-N2-WP1：LLM 契约定义

> 目标：定义跨模块共享的 LLM 调用契约（JSDoc）
> 角色：后端
> 预估改动量：新建 ~30 行

## 1. 前置条件

- M8-N1 通过（配置基础设施就绪）

## 2. 改动规格

### 3.1 新建 `controller/services/llm/llm-contracts.js`

```js
/**
 * @typedef {Object} ChatMessage
 * @property {'system'|'user'|'assistant'} role
 * @property {string} content
 */

/**
 * @typedef {Object} LLMConfig
 * @property {string} provider - 厂商标识（zhipu/kimi/openai）
 * @property {string} apiKey - 解密后的 API Key
 * @property {string} baseURL - API 基础 URL
 * @property {string} model - 模型名称
 */

/**
 * @typedef {Object} LLMResponse
 * @property {string} content - AI 返回的文本
 * @property {number} [usage] - Token 用量（如厂商支持）
 * @property {Error} [error] - 错误对象（调用失败时）
 */

/**
 * LLM Provider 接口契约
 * 所有 Provider 实现必须遵循此契约
 * @interface ILLMProvider
 */
```

### 3.2 约束

- 只包含跨文件共享的契约，不包含 Provider 内部私有类型
- 不使用 TypeScript，纯 JSDoc @typedef
- 不写"为了类型完整"的无复用价值注释

## 4. 验证

- [ ] 文件存在且格式正确
- [ ] @typedef 定义清晰，输入输出明确
