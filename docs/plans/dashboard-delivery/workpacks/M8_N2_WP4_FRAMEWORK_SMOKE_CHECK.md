# 工作包 M8-N2-WP4：框架冒烟检测（含最小业务桩）

> 目标：验证 LLM Factory 的独立可用性，包含真实 provider 调用
> 角色：测试/检验
> 约束：必须包含一个最小可运行验证用例，不能只交付空框架

## 1. 前置条件

- M8-N2-WP1、WP2、WP3 全部通过

## 2. 最小验证桩

### 2.1 验证脚本 `controller/services/llm/test-llm.js`

```js
// 独立运行：node controller/services/llm/test-llm.js
// 不依赖前端，不依赖 HTTP 服务器

const { createActiveLLMClient } = require('./llm-factory');
const Database = require('better-sqlite3');

async function runSmokeTest() {
    const db = new Database('crawler.db');
    const client = createActiveLLMClient(db);

    if (!client) {
        console.log('SKIP: 未配置 AI provider，跳过验证桩');
        process.exit(0);
    }

    const result = await client.chat([
        { role: 'user', content: '请回复"验证通过"四个字' }
    ]);

    if (result.error) {
        console.error('FAIL:', result.error.message);
        process.exit(1);
    }

    console.log('PASS:', result.content);
    process.exit(0);
}

runSmokeTest();
```

### 2.2 验证桩要求

- 向已配置的 AI provider 发送固定 prompt
- 成功 → 输出 `PASS: <AI返回内容>`
- 失败 → 输出 `FAIL: <错误信息>`
- 未配置 → 输出 `SKIP` 并正常退出（不阻塞 CI）

## 3. 测试检查项

### 3.1 文件结构

- [ ] `controller/services/llm/llm-contracts.js` 存在
- [ ] `controller/services/llm/openai-compatible-provider.js` 存在
- [ ] `controller/services/llm/llm-factory.js` 存在

### 3.2 独立验证

- [ ] 纯后端脚本可独立运行（`node test-llm.js`）
- [ ] 有效配置时返回 AI 结果
- [ ] 无效配置时返回明确错误
- [ ] 未配置时正常跳过

### 3.3 代码检查

- [ ] 无 TypeScript 文件（.ts）
- [ ] 无 types.js 文件（使用 llm-contracts.js）
- [ ] npm 依赖中包含 openai
