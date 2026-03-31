# 工作包 M15-N2-WP2：fetch AbortController 绑定

> 目标：`executeInPageContext` 超时后 abort 底层 fetch，避免僵尸请求
> 角色：后端
> 预估改动量：~10行JS

## 1. 前置条件
- M15-N2-WP1 通过

## 2. 读文件
| 文件 | 读取目的 |
|------|---------|
| `crawler/content.js` | `executeInPageContext` 函数实现（含 30 秒超时） |

## 3. 改动规格
- 在 `executeInPageContext` 中创建 `AbortController` 实例
- 将 `signal` 传递给底层的 `fetch` 调用
- 30 秒超时触发时，调用 `controller.abort()`
- 确保 abort 后 Promise 正确 reject，且无未捕获异常
- 不修改超时时间（保持 30 秒）

## 4. 验证
- [ ] 正常请求（30 秒内完成）不受影响
- [ ] 超时场景：Chrome DevTools Network 面板确认请求被标记为 canceled
- [ ] 连续多次超时后，浏览器并发连接数正常（无泄漏）
- [ ] 无控制台 uncaught 异常
