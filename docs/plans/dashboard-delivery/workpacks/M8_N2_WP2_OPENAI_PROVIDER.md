# 工作包 M8-N2-WP2：OpenAI 兼容 Provider

> 目标：基于 OpenAI SDK 实现统一调用层，覆盖 90% AI 厂商
> 角色：后端
> 预估改动量：新建 ~50 行

## 1. 前置条件

- M8-N2-WP1 通过（契约定义就绪）
- 已安装 `openai` npm 依赖

## 2. 改动规格

### 3.1 安装依赖

```bash
cd /home/xixil/kimi-code/zhaopin/controller
npm install openai
```

### 3.2 新建 `controller/services/llm/openai-compatible-provider.js`

```js
const OpenAI = require('openai');

/**
 * OpenAI 兼容 Provider
 * 覆盖厂商：智谱AI、Kimi、OpenAI、Groq 等
 *
 * @param {LLMConfig} config
 */
function createOpenAIProvider(config) {
    const client = new OpenAI({
        apiKey: config.apiKey,
        baseURL: config.baseURL,
    });

    return {
        /**
         * @param {ChatMessage[]} messages
         * @returns {Promise<LLMResponse>}
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
        }
    };
}

module.exports = { createOpenAIProvider };
```

### 3.3 错误处理

- API Key 无效 → 返回带 error 的 LLMResponse
- 网络超时 → 返回带 error 的 LLMResponse
- 模型不存在 → 返回带 error 的 LLMResponse
- **不抛出异常**，统一返回 error 对象

## 4. 验证

- [ ] 用有效的智谱AI配置调用，返回正确结果
- [ ] 用无效 Key 调用，返回 error 对象（不崩溃）
- [ ] 用错误的 baseURL 调用，返回 error 对象（不崩溃）
