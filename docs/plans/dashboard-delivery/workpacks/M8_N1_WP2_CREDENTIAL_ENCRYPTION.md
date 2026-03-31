# 工作包 M8-N1-WP2：凭据加密存储服务

> 目标：实现 API Key 的 AES 加密/解密服务
> 角色：后端
> 预估改动量：新建 ~40 行

## 1. 前置条件

- M8-N1-WP1 通过（ai_configs 表已创建）

## 2. 改动规格

### 3.1 新建 `controller/services/credential-crypto.js`

使用 Node.js 内置 `crypto` 模块，不引入额外依赖。

```js
/**
 * 凭据加密/解密服务
 * 使用 AES-256-GCM 对称加密
 */
const ALGORITHM = 'aes-256-gcm';
// 加密密钥从环境变量或配置中读取，不硬编码
const KEY = process.env.CREDENTIAL_ENCRYPTION_KEY || 'default-dev-key-32bytes!!';

function encrypt(text) { ... }
function decrypt(encryptedText) { ... }
function maskKey(apiKey) {
    // 脱敏：sk-abc123...xyz → sk-abc...xyz
    if (apiKey.length <= 8) return '***';
    return apiKey.slice(0, 6) + '...' + apiKey.slice(-4);
}

module.exports = { encrypt, decrypt, maskKey };
```

### 3.2 安全约束

- 密钥不从代码中硬编码
- 加密后的密文包含 IV（初始化向量）
- 解密失败时抛出明确错误，不返回 null
- `maskKey()` 仅用于前端回显，不存储

## 4. 验证

- [ ] 加密 → 解密后原文一致
- [ ] 不同原文的密文不同（随机 IV）
- [ ] maskKey() 正确脱敏
- [ ] 空字符串加密/解密正常
