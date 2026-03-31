# 工作包 M1-N2-WP1：CORS 与路由风格

> 目标：将现有 `setCORS(res)` 改为动态白名单，安装 formidable，确立新增路由编码风格。
> 角色：后端
> 预估改动量：修改 ~20 行（server.js）+ 安装 1 个依赖

## 1. 前置条件

- M1-N1 全部工作包通过（DB 层可用，包括 WP4 自检）

## 2. 读文件（执行前必读）

| 文件 | 读取目的 |
|------|---------|
| `controller/server.js`（全文） | 理解现有 `setCORS` 函数位置和所有调用点 |
| `docs/plans/DIVERGENCE_DASHBOARD_AND_MULTIPLATFORM.md` Q13 | CORS 动态白名单正则 |

## 3. 改文件

| 文件 | 改动位置 | 改动内容 |
|------|---------|---------|
| `controller/server.js` | `setCORS` 函数定义 | 签名改为 `(req, res)`，内部按 Q13 白名单正则判断 |
| `controller/server.js` | 所有调用 `setCORS(res)` 的位置 | 改为 `setCORS(req, res)` |

## 4. 安装依赖

```bash
cd /home/xixil/kimi-code/zhaopin/controller && npm install formidable
```

## 5. 技术约束与改动规格

### 5.1 CORS 白名单正则（Q13 决策）

```javascript
const ALLOWED_ORIGIN_RE = /^(chrome-extension:\/\/[a-z]{32}|https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?)/;
```

### 5.2 setCORS 改造

```javascript
function setCORS(req, res) {
  const origin = req.headers.origin || '';
  if (ALLOWED_ORIGIN_RE.test(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }
  // 不匹配时静默不设置 CORS 头（安全默认拒绝）
}
```

### 5.3 路由风格确认（Q12 决策）

- 保持精确匹配，不用正则路由
- ID 通过 `parsedUrl.searchParams.get('id')` 获取
- 新增路由用 if 分支，业务逻辑抽为独立 Handler 函数
- 现有路由风格不变

## 6. 测试上下文

- Controller 需要启动（`node server.js`）
- 测试时使用 `curl -H "Origin: ..."` 模拟不同来源

## 7. 验收标准（可执行命令）

```bash
# 0. 启动 Controller（假设已启动在 7893 端口）

# 1. chrome-extension 来源通过
curl -s -I -H "Origin: chrome-extension://abcdefghijklmnopqrstuvwxyz123456" \
  http://127.0.0.1:7893/api/status
# 预期：响应头含 Access-Control-Allow-Origin

# 2. localhost 来源通过
curl -s -I -H "Origin: http://localhost:3000" http://127.0.0.1:7893/api/status
# 预期：响应头含 Access-Control-Allow-Origin

# 3. 恶意来源被拒绝
curl -s -I -H "Origin: http://evil.com" http://127.0.0.1:7893/api/status
# 预期：响应头不含 Access-Control-Allow-Origin

# 4. 现有端点回归
curl -s http://127.0.0.1:7893/api/status
# 预期：正常返回 JSON

# 5. formidable 已安装
ls /home/xixil/kimi-code/zhaopin/controller/node_modules/formidable/package.json
# 预期：文件存在
```

## 8. 影响范围（Blast Radius）

| 影响对象 | 影响程度 | 说明 |
|---------|---------|------|
| 所有现有 API 端点 | 需验证 | setCORS 签名变更，所有调用点必须同步更新 |
| Dashboard 前端 | 下游依赖 | CORS 通过后前端才能正常调用 API |
| 现有采集链路 | 无影响 | 采集不走 HTTP API，不受 CORS 影响 |

## 9. 契约变更

| 变更类型 | 内容 | 向后兼容 |
|---------|------|---------|
| 函数签名 | `setCORS(res)` → `setCORS(req, res)` | 不兼容，内部函数 |
| 新增依赖 | `formidable` | 兼容，新增 npm 包 |

## 10. 回退方案

- `setCORS` 签名改回 `(res)`
- `npm uninstall formidable`

## 11. 边界（不做什么）

- 不新增 API 端点
- 不改 `db.js`
- 不创建前端文件
- 不处理 OPTIONS 预检请求（Chrome 扩展 fetch 默认不需要）
