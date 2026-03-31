/**
 * openai-compatible-provider.js - OpenAI 兼容 Provider
 *
 * 基于 OpenAI SDK 实现统一调用层，覆盖 90% AI 厂商。
 * 覆盖厂商：智谱AI、Kimi、OpenAI、Groq 等。
 *
 * 类型定义参考：./llm-contracts.js（LLMConfig, ChatMessage, LLMResponse）
 */

const OpenAI = require('openai');

/**
 * 创建 OpenAI 兼容 Provider 实例
 *
 * @param {import('./llm-contracts').LLMConfig} config - LLM 配置
 * @returns {{ chat: (messages: import('./llm-contracts').ChatMessage[]) => Promise<import('./llm-contracts').LLMResponse> }}
 */
function createOpenAIProvider(config) {
    const client = new OpenAI({
        apiKey: config.apiKey,
        baseURL: config.baseURL,
    });

    return {
        /**
         * 发送聊天请求
         *
         * @param {import('./llm-contracts').ChatMessage[]} messages
         * @returns {Promise<import('./llm-contracts').LLMResponse>}
         */
        async chat(messages) {
            try {
                const response = await client.chat.completions.create({
                    model: config.model,
                    messages,
                });
                return {
                    content: response.choices[0]?.message?.content || '',
                    usage: response.usage,
                };
            } catch (err) {
                return { content: '', error: err };
            }
        },
    };
}

module.exports = { createOpenAIProvider };
