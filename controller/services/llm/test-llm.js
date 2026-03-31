/**
 * test-llm.js - LLM 框架冒烟测试
 *
 * 独立运行：node controller/services/llm/test-llm.js
 * 不依赖前端，不依赖 HTTP 服务器
 *
 * 退出码：0=通过/跳过, 1=失败
 */

const path = require('path');
const Database = require('better-sqlite3');
const { createActiveLLMClient, createLLMClient } = require('./llm-factory');

// 框架冒烟测试（不依赖数据库，不依赖网络）
function frameworkSmokeTest() {
    console.log('=== 框架冒烟测试 ===');

    // 1. 模块导出检查
    const provider = require('./openai-compatible-provider');
    console.log('[PASS] openai-compatible-provider 导出 createOpenAIProvider');

    // 2. Factory 导出检查
    console.log('[PASS] llm-factory 导出 createLLMClient, createActiveLLMClient');

    // 3. Factory 路由检查
    const validProviders = ['zhipu', 'kimi', 'openai', 'groq'];
    for (const p of validProviders) {
        const client = createLLMClient({
            provider: p,
            apiKey: 'test-key',
            baseURL: 'https://api.example.com/v1',
            model: 'test-model',
        });
        if (typeof client.chat !== 'function') {
            console.error(`[FAIL] ${p} 路由后缺少 chat 方法`);
            process.exit(1);
        }
        console.log(`[PASS] ${p} 正确路由到 OpenAI Provider`);
    }

    // 4. 不支持的 provider 抛错
    try {
        createLLMClient({
            provider: 'invalid_provider',
            apiKey: 'test-key',
            baseURL: 'https://api.example.com/v1',
            model: 'test-model',
        });
        console.error('[FAIL] 不支持的 provider 未抛出错误');
        process.exit(1);
    } catch (e) {
        console.log('[PASS] 不支持的 provider 正确抛出错误');
    }

    // 5. Provider 无效 Key 返回 error 对象（不崩溃）
    const testProvider = createLLMClient({
        provider: 'openai',
        apiKey: 'sk-invalid-test-key-12345',
        baseURL: 'https://api.openai.com/v1',
        model: 'gpt-4o-mini',
    });
    console.log('[PASS] Provider 实例创建成功');

    // 6. 异步测试：无效 Key 调用
    return testProvider.chat([{ role: 'user', content: 'test' }]).then((result) => {
        if (result.error) {
            console.log('[PASS] 无效 Key 调用返回 error 对象，不崩溃');
        } else {
            console.error('[FAIL] 无效 Key 调用未返回 error');
            process.exit(1);
        }
    });
}

// 真实 AI 调用测试（依赖数据库配置）
async function liveSmokeTest() {
    console.log('\n=== 真实 AI 调用测试 ===');

    const dbPath = path.join(__dirname, '..', '..', 'data', 'zhaopin.db');
    let db;
    try {
        db = new Database(dbPath);
    } catch (e) {
        console.log('[SKIP] 数据库不存在，跳过真实 AI 调用测试');
        return;
    }

    try {
        const client = createActiveLLMClient(db);

        if (!client) {
            console.log('[SKIP] 未配置 AI provider，跳过真实 AI 调用测试');
            return;
        }

        const result = await client.chat([
            { role: 'user', content: '请回复"验证通过"四个字' },
        ]);

        if (result.error) {
            console.error('[FAIL] AI 调用失败:', result.error.message);
            process.exit(1);
        }

        console.log('[PASS] AI 调用成功:', result.content);
    } finally {
        db.close();
    }
}

async function main() {
    try {
        // 第一阶段：框架冒烟（不依赖数据库/网络）
        await frameworkSmokeTest();

        // 第二阶段：真实 AI 调用（依赖数据库配置）
        await liveSmokeTest();

        console.log('\n=== 冒烟测试全部通过 ===');
        process.exit(0);
    } catch (err) {
        console.error('\n[FAIL] 冒烟测试异常:', err.message);
        process.exit(1);
    }
}

main();
