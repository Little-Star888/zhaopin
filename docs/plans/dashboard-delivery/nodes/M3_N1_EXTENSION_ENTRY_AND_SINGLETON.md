# 节点 M3-N1：扩展入口与单例

> 状态：待开始
> 归属里程碑：M3 扩展入口、联调、收口
> 目标：更新 manifest.json 和 popup，实现 Dashboard 单例打开入口。

## 业务角色导航

### 前端

- [ ] [WP1：manifest.json 与 host_permissions](../workpacks/M3_N1_WP1_MANIFEST_HOST_PERMISSIONS.md)
- [ ] [WP2：Popup 单例入口](../workpacks/M3_N1_WP2_POPUP_SINGLETON_ENTRY.md)

### 测试/检验

- [ ] [WP3：扩展冒烟检测](../workpacks/M3_N1_WP3_EXTENSION_SMOKE_CHECK.md)

## 前置条件

- M2 前端完成（dashboard 全套文件就绪）
- M1 后端完成（API 端点可用）

## 边界

- 只处理 manifest 和 popup
- 不改 dashboard.html/css/js（M2 已锁定）
- 不改后端代码（M1 已锁定）
- 不预埋猎聘或其他下阶段平台占位代码
