# 工作包 M2-N1-WP3：前端冒烟检测

> 目标：在进入视觉节点前，确认骨架和 API 对接可用。
> 角色：测试/检验
> 预估改动量：0 行（纯检测，不改代码）

## 1. 前置条件

- M2-N1-WP2（Hash 路由与 API 客户端）通过
- Controller 运行中（M1 后端可用）

## 2. 读文件（执行前必读）

| 文件 | 读取目的 |
|------|---------|
| `crawler/extension/dashboard.html` | 确认文件结构 |
| `crawler/extension/dashboard.js` | 确认路由和渲染逻辑 |

## 3. 检测动作

### 3.1 文件加载

- [ ] Chrome 加载 `dashboard.html` 无 CSP 报错
- [ ] Console 无 JS 模块加载错误
- [ ] Console 无语法错误

### 3.2 路由

- [ ] 默认显示 `#home` 视图
- [ ] 点击"工作台"tab → hash 变为 `#resume`，视图切换
- [ ] 点击"首页"tab → hash 变为 `#home`，视图切换
- [ ] 浏览器刷新后 hash 路由恢复到当前视图

### 3.3 API 对接（需 Controller 运行）

> **⚠️ 架构边界说明**：N1 节点的 API 冒烟检测是**骨架联通性验证**（确认 API 客户端能正常调用后端）。这与 N2/N3 视觉审查的"M2 不阻塞 API 联调"决策**不冲突**——视觉审查可以用 Mock 数据，但骨架冒烟仍需验证真实 API 通路。

```bash
# 前置：确保有测试数据
cd /home/xixil/kimi-code/zhaopin/controller
node -e "
const j = require('./jobs-db');
j.batchInsertJobs([
  {platform:'boss',platformJobId:'SM1',title:'测试岗位',company:'测试公司',location:'北京'}
]);
"
```

- [ ] 首页加载时 Network 面板可见 `GET /api/jobs` 请求
- [ ] 请求返回 200，岗位列表显示数据
- [ ] Console 无网络错误（无 CORS 错误、无 500 错误）
- [ ] 空态（清空数据后）显示空列表，不报错

## 4. 通过标准

- 上述全部通过
- CSP 报错或 JS 错误必须修复后重跑

## 5. 失败处理

- CSP 报错 → 检查 manifest.json 或内联脚本
- 路由不切换 → 检查 hashchange 事件监听
- API 调用失败 → 检查 Controller 是否运行、CORS 是否配置
- 模块加载错误 → 检查 ESM import 路径

## 6. 边界（不做什么）

- 不修改任何代码
- 不做视觉检查
- 不测试第二页功能
