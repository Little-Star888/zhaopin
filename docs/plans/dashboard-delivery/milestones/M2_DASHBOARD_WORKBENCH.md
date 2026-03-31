# 里程碑 M2：工作台前端

> 状态：待开始 *(生命周期：待开始 → 进行中 → 阻塞 → [done])*
> 目标：在不依赖后端源码的前提下，基于 API 契约完成 Dashboard 工作台的骨架、主页视觉、第二页功能。
> 注：本文件不是产品说明，不重写 PRD，只把既有产品决策拆成可执行前端里程碑。

## 核心依赖

- M1 产出的 `DASHBOARD_API_CONTRACT.md`（唯一后端输入，不读 server.js/db.js 源码）

## 宏观交付边界

- 本里程碑只产出前端文件（HTML/CSS/JS），不改后端代码、不改 manifest/popup
- AI 匹配本期只做灰色占位按钮，不接入真实 API
- 在线编辑本期只做灰色占位按钮
- 前端可用 Mock 数据独立开发，不强制依赖 Controller 运行

## 节点路径与状态

| 节点 | 状态 | 涉及角色 | 跳转 |
|------|------|---------|------|
| [M2-N1：前端骨架与 API 接线](../nodes/M2_N1_FRONTEND_SKELETON_AND_API.md) | 待开始 | 前端、测试 | → 查看工作包 |
| [M2-N2：首页 UI 与交互](../nodes/M2_N2_HOME_UI_AND_INTERACTION.md) | 待开始 | UI、前端 | → 查看工作包 |
| [M2-N3：第二页与前端验收](../nodes/M2_N3_RESUME_PAGE_AND_FRONTEND_VALIDATION.md) | 待开始 | 前端、测试 | → 查看工作包 |

## 完成判定

- [ ] Dashboard 骨架与 hash 路由可用
- [ ] 首页视觉与交互完成
- [ ] 第二页简历与待投递列表完成
- [ ] 前端冒烟通过
