# 工作包 M3-N2-WP3：最终合并门禁

> 目标：作为整个 Dashboard 项目的最终门禁，确认一切就绪并可合并。
> 角色：测试/检验
> 预估改动量：0 行（纯检测）

## 1. 前置条件

- M3-N2-WP1（端到端检测）通过
- M3-N2-WP2（文档更新）通过

## 2. 检测清单

### 2.1 功能完整性

- [ ] M1 后端：DB（scraped_jobs + resumes）+ 7 个 API 端点 + CORS 全部通过
- [ ] M2 前端：骨架 + Bento Grid + Glassmorphism（卡片+导航栏）+ 环境背景与 Neumorphism 工具类 + Micro-interactions + Toast + 第二页全部通过
- [ ] M3 集成：manifest 权限 + popup 单例 + 端到端 + 文档全部通过

### 2.2 代码质量

- [ ] 无 `console.log` 调试残留
- [ ] 无未完成的 TODO 注释（除非有对应 issue）
- [ ] 新增文件命名规范一致（jobs-db.js, resume-db.js, jobs-handler.js, resume-handler.js）
- [ ] CSS 变量使用统一（不硬编码色值）

### 2.3 工作树

```bash
cd /home/xixil/kimi-code/zhaopin && git status && git log --oneline -10
```
- [ ] `git status` 干净（无未提交改动）
- [ ] `git log` 显示清晰的 commit 历史

### 2.4 文档同步

- [ ] `DASHBOARD_API_CONTRACT.md` 存在且与代码一致
- [ ] `BACKEND_ENTRY.md` 已更新
- [ ] `FRONTEND_ENTRY.md` 已更新
- [ ] `PROJECT_MASTER_HANDOFF.md` 已更新
- [ ] 所有文档无死链接

### 2.5 新增文件清单

| 文件 | 类型 |
|------|------|
| `controller/jobs-db.js` | 后端 - DB 层 |
| `controller/resume-db.js` | 后端 - DB 层 |
| `controller/jobs-handler.js` | 后端 - API 层 |
| `controller/resume-handler.js` | 后端 - API 层 |
| `docs/plans/DASHBOARD_API_CONTRACT.md` | 文档 - API 契约 |
| `crawler/extension/dashboard.html` | 前端 - 入口 |
| `crawler/extension/dashboard.css` | 前端 - 样式 |
| `crawler/extension/dashboard.js` | 前端 - 逻辑 |
| `crawler/extension/dashboard-api.js` | 前端 - API 客户端 |

### 2.6 修改文件清单

| 文件 | 改动内容 |
|------|---------|
| `controller/db.js` | 新增 V5 + V6 migration |
| `controller/server.js` | 新增 7 个路由分支 + CORS 白名单 |
| `controller/package.json` | 新增 formidable 依赖 |
| `crawler/extension/manifest.json` | 新增 host_permissions |
| `crawler/extension/popup.html` | 新增"打开工作台"按钮 |
| `crawler/extension/popup.js` | 新增 openDashboard 单例函数 |

## 3. 建议的 Commit 结构

```
feat(backend): add scraped_jobs/resumes tables, 7 dashboard endpoints, dynamic CORS whitelist
feat(dashboard): implement Bento Grid, Glassmorphism, Neumorphism, ambient background, Toast, resume page, hash routing
feat(extension): add manifest host_permissions, popup singleton dashboard entry
docs: update BACKEND_ENTRY, FRONTEND_ENTRY, MASTER_HANDOFF for dashboard delivery
```

## 4. 通过标准

- 上述全部通过
- 项目进入可验收状态

## 5. 通过后动作

- 更新节点状态：M3-N2 → `[done]`
- 更新里程碑状态：M3 → `[done]`
- 更新 PRD 进度面板：M1/M2/M3 全部标记为完成
- 项目进入可交付状态

## 6. 边界（不做什么）

- 不修改任何代码
- 不新增功能
- 不做性能优化
