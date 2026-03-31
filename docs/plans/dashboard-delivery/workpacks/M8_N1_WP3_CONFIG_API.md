# 工作包 M8-N1-WP3：配置管理 API

> 目标：新增 GET/POST/PUT /api/ai/config 端点
> 角色：后端
> 预估改动量：新建 ~80 行

## 1. 前置条件

- M8-N1-WP1、WP2 通过

## 2. 改动规格

### 3.1 新建 `controller/ai-handler.js`

### 3.2 GET /api/ai/config

```
GET /api/ai/config

Response: {
    "configs": [
        {
            "id": 1,
            "provider": "zhipu",
            "api_key_masked": "abc123...xyz",
            "base_url": "https://open.bigmodel.cn/api/coding/paas/v4",
            "model_name": "glm-5-turbo",
            "is_active": 1
        }
    ]
}
```

- `api_key_masked` 使用 `maskKey()` 脱敏
- 不返回加密后的原始密文

### 3.3 POST /api/ai/config

```
POST /api/ai/config
Content-Type: application/json

Body: {
    "provider": "zhipu",
    "api_key": "sk-xxx",
    "base_url": "https://open.bigmodel.cn/api/coding/paas/v4",
    "model_name": "glm-5-turbo"
}

Response: { "success": true, "id": 1 }
```

- 接收明文 API Key，加密后存储
- 如果 provider 已存在，更新现有记录
- 自动设置 is_active = 1

### 3.4 在 server.js 中注册路由

```js
const aiHandler = require('./ai-handler');
app.get('/api/ai/config', aiHandler.getConfig);
app.post('/api/ai/config', aiHandler.saveConfig);
```

## 4. 验证

- [ ] GET 返回脱敏后的配置列表
- [ ] POST 保存配置后，数据库中 api_key_encrypted 为密文
- [ ] 重复保存同一 provider，更新而非新增
- [ ] 无配置时 GET 返回空数组
