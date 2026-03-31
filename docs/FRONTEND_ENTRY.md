# 前端接入文档入口

> 版本：1.0 | 日期：2026-03-24
> 作用：为扩展执行层和未来插件 UI 相关工作提供总入口，具体实现细节通过路径渐进披露。

## 1. 当前前端是什么

当前前端由两部分组成：

1. **Chrome 扩展执行层** — 在 Boss 直聘页面中执行采集
2. **Dashboard 工作台** — 独立标签页中的数据管理界面

### 1.1 扩展执行层

核心路径：

1. `crawler/extension/background.js`
2. `crawler/extension/content.js`
3. `crawler/extension/popup.js`
4. `crawler/extension/manifest.json`

### 1.2 Dashboard 工作台

Dashboard 文件结构（均位于 `crawler/extension/` 下）：

| 文件 | 说明 |
|------|------|
| `dashboard.html` | 主 HTML 页面 |
| `dashboard.js` | 主逻辑（Hash 路由、视图切换、数据渲染） |
| `dashboard-api.js` | API 客户端封装（调用 `/api/*` 端点） |
| `dashboard.css` | 样式表 |

## 2. 当前前端职责

### 2.1 扩展执行层

1. 自动同步 controller 运行参数
2. 自动 claim / 执行 / report
3. 页面环境中的搜索、翻页、详情抓取
4. 最小可用的 popup 状态面板

### 2.2 Dashboard 工作台

1. 职位列表浏览与多条件筛选（平台、关键词、分页）
2. 职位详情查看
3. 选中/取消选中职位（待投递管理）
4. 简历上传与管理
5. 待投递列表查看

## 3. Dashboard 路由机制

Dashboard 使用 Hash 路由（`dashboard.js` → `initRouter()`）：

| Hash | 视图 | 说明 |
|------|------|------|
| `#home` | 职位列表 | 默认首页，加载职位列表与筛选 |
| `#resume` | 工作台 | 简历管理与待投递列表 |

- 监听 `window.onhashchange` 事件
- 通过 `display: block/none` 切换视图 DOM
- 导航栏高亮当前活跃 tab

## 4. Popup 单例入口

`popup.js` 中的 `openDashboard()` 函数实现了 Dashboard 单例打开模式：

- 如果 Dashboard 标签页已存在 → 聚焦该标签页
- 如果不存在 → 创建新标签页
- 打开后自动关闭 popup 窗口

入口：`popup.html` 中的"打开工作台"按钮

## 5. 多平台兼容性要求

未来多平台接入后，插件层必须体现“平台选择与接入状态”。

建议前端能力：

1. 平台开关与状态展示
2. 平台权限与 cookie 授权状态展示
3. 平台执行器配置入口
4. 平台健康检查入口

## 6. cookie / 抓取接入方向

优先方案：

1. 通过扩展权限与 `chrome.cookies` API 在用户已登录、已授权前提下读取目标站点 cookie
2. 通过平台 executor 使用这些 cookie 执行抓取
3. 尽量避免要求用户手动复制原始 cookie 文本

建议的前端接入体验：

1. 用户在 popup 中选择平台
2. 点击“检测登录状态”
3. 扩展检查站点权限、cookie 可用性、目标域名是否可访问
4. 返回“可抓取 / 未登录 / 权限不足 / 需人工辅助”状态

## 7. 详细文档路径

1. 总体架构：`docs/ARCHITECTURE.md`
2. 总体产品定义：`PROJECT_PRD.md`
3. 平台抽象草案：`ADAPTER_EXECUTOR_INTERFACE_DRAFT.md`
4. 统一模型草案：`UNIFIED_JOB_MODEL_DRAFT.md`
