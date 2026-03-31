# 节点 M2-N1：前端骨架与 API 接线

> 状态：待开始
> 归属里程碑：M2 工作台前端
> 目标：建立 Dashboard 的 HTML 骨架、hash 路由和 API 客户端，不依赖后端源码。

## 业务角色导航

### 前端

- [ ] [WP1：Dashboard 文件骨架](../workpacks/M2_N1_WP1_DASHBOARD_FILE_SCAFFOLD.md)
- [ ] [WP2：Hash 路由与 API 客户端](../workpacks/M2_N1_WP2_HASH_ROUTING_AND_API_CLIENT.md)

### 测试/检验

- [ ] [WP3：前端冒烟检测](../workpacks/M2_N1_WP3_FRONTEND_SMOKE_CHECK.md)

## 前置条件

- M1 产出的 `DASHBOARD_API_CONTRACT.md` 已存在

## 边界

- 只处理骨架、路由和 API 封装
- 不做视觉样式（Bento Grid、Glassmorphism 在 N2 处理）
- 不做第二页功能（N3 处理）
- 不读 server.js / db.js 源码
- 不改 manifest.json / popup（M3 处理）
