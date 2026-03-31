# 工作包 M8-N2-WP3：LLM Factory 工厂

> 目标：根据 provider 配置动态实例化对应的 Provider
> 角色：后端
> 预估改动量：新建 ~40 行

## 1. 前置条件

- M8-N2-WP2 通过（Provider 实现就绪）

## 2. 改动规格

### 3.1 新建 `controller/services/llm/llm-factory.js`

```js
const { createOpenAIProvider } = require('./openai-compatible-provider');

/**
 * 根据 provider 创建 LLM 客户端
 * @param {LLMConfig} config
 * @returns {{ chat: (messages: ChatMessage[]) => Promise<LLMResponse> }}
 */
function createLLMClient(config) {
    switch (config.provider) {
        case 'zhipu':
        case 'kimi':
        case 'openai':
        case 'groq':
            return createOpenAIProvider(config);
        default:
            throw new Error(`Unsupported provider: ${config.provider}`);
    }
}

/**
 * 从数据库获取当前激活的 AI 配置并创建客户端
 * @returns {Promise<{ chat: (messages: ChatMessage[]) => Promise<LLMResponse> } | null>}
 */
function createActiveLLMClient(db) {
    const config = db.prepare(
        'SELECT * FROM ai_configs WHERE is_active = 1 LIMIT 1'
    ).get();

    if (!config) return null;

    // 解密 API Key
    const { decrypt } = require('../credential-crypto');
    const apiKey = decrypt(config.api_key_encrypted);

    return createLLMClient({
        provider: config.provider,
        apiKey,
        baseURL: config.base_url,
        model: config.model_name,
    });
}

module.exports = { createLLMClient, createActiveLLMClient };
```

## 4. 验证

- [ ] 传入 zhipu 配置，返回 OpenAI 兼容 Provider
- [ ] 传入不支持的 provider，抛出错误
- [ ] createActiveLLMClient 从数据库读取配置并创建客户端
- [ ] 无激活配置时返回 null
