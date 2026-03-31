/**
 * llm-contracts.js - LLM 调用契约定义
 *
 * 跨模块共享的 JSDoc 类型定义。
 * 所有 LLM Provider 实现必须遵循此契约。
 */

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
