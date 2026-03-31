# 工作包 M3-N1-WP1：manifest.json 与 host_permissions

> 目标：更新 manifest.json，添加 Dashboard 所需的权限配置。
> 角色：前端
> 预估改动量：修改 ~5 行（manifest.json）

## 1. 前置条件

- M2 前端完成（dashboard 文件就绪）
- M1 后端完成（API 端点可用）

## 2. 读文件（执行前必读）

| 文件 | 读取目的 |
|------|---------|
| `crawler/extension/manifest.json` | 现有 manifest 结构 |
| `docs/plans/DIVERGENCE_DASHBOARD_AND_MULTIPLATFORM.md` Q5 + Q13 | host_permissions 和 CORS 白名单 |

## 3. 改文件

| 文件 | 改动位置 | 改动内容 |
|------|---------|---------|
| `crawler/extension/manifest.json` | `host_permissions` 数组 | 新增 `"http://127.0.0.1:7893/*"` |

## 4. 技术约束与改动规格

### 4.1 权限变更

```json
{
  "host_permissions": [
    "https://www.zhipin.com/*",
    "https://open.feishu.cn/*",
    "http://127.0.0.1:7893/*"
  ]
}
```

### 4.2 关键规则

- 只新增与 Dashboard 直接相关的权限（Controller API 地址）
- 不新增与 Dashboard 无关的 content script
- 不预埋猎聘或其他下阶段平台占位代码（最小改动原则）

## 5. 测试上下文

- Chrome 扩展管理页面（`chrome://extensions`）

## 6. 验收标准

```bash
# 1. Chrome 加载更新后的 manifest 无报错
# 操作：chrome://extensions → 重新加载扩展
# 预期：无黄色/红色错误提示

# 2. 权限验证
# 操作：chrome://extensions → 扩展详情 → 权限
# 预期：host_permissions 中包含 http://127.0.0.1:7893/*
```

## 7. 影响范围（Blast Radius）

| 影响对象 | 影响程度 | 说明 |
|---------|---------|------|
| 现有 content script | 无影响 | 只新增 host_permissions |
| 现有采集功能 | 无影响 | 不改 background.js |
| Dashboard | 下游依赖 | 获得访问 Controller API 的权限 |

## 8. 契约变更

| 变更类型 | 内容 | 向后兼容 |
|---------|------|---------|
| manifest 权限 | 新增 host_permissions | 兼容，新增权限 |

## 9. 回退方案

- 从 `host_permissions` 移除 `http://127.0.0.1:7893/*`

## 10. 边界（不做什么）

- 不改 popup（WP2 处理）
- 不改 dashboard 文件（M2 已锁定）
- 不改后端代码（M1 已锁定）
- 不预埋猎聘或其他下阶段平台占位代码
