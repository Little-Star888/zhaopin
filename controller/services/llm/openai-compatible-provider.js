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
 * @returns {{ chat, chatStream }}
 */
function createOpenAIProvider(config) {
    const client = new OpenAI({
        apiKey: config.apiKey,
        baseURL: config.baseURL,
    });

    return {
        /**
         * 发送聊天请求（非流式）
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

        /**
         * 流式聊天请求 — 逐 chunk 回调
         *
         * @param {import('./llm-contracts').ChatMessage[]} messages
         * @param {(chunk: string) => void} onChunk - 每收到一段内容时回调
         * @returns {Promise<import('./llm-contracts').LLMResponse>}
         */
        async chatStream(messages, onChunk) {
            let fullContent = '';
            let usage = null;
            try {
                const stream = await client.chat.completions.create({
                    model: config.model,
                    messages,
                    stream: true,
                });
                for await (const chunk of stream) {
                    const delta = chunk.choices?.[0]?.delta?.content || '';
                    if (delta) {
                        fullContent += delta;
                        if (onChunk) onChunk(delta);
                    }
                    if (chunk.usage) usage = chunk.usage;
                }
                return { content: fullContent, usage };
            } catch (err) {
                return { content: fullContent || '', error: err };
            }
        },
    };
}

module.exports = { createOpenAIProvider };
