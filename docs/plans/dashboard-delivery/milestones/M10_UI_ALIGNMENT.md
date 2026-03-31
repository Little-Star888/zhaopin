# 里程碑 M10：UI 结构与设计稿对齐

> 状态：待开始 *(生命周期：待开始 → 进行中 → 阻塞 → [done])*
> 设计稿：[constructivism-mockup.html](../../../crawler/extension/constructivism-mockup.html)
> 决策文档：[M10/M11/M12 疑问与分歧](../M10_M11_M12_NEXT_ITERATION_QUESTIONS.md)

## 核心依赖

- M9 全部通过（简历导出功能稳定，dashboard.js 修改已合入）

## 宏观交付边界

- **设计稿优先**：以 `constructivism-mockup.html` 为最终交付标准
- **保留3标签页**：Hash路由 `#home` / `#resume` / `#ai-config` 不变，但视觉对齐 `.vnav`
- **弹窗替代手风琴**：首页卡片展开改为居中弹窗 `.exov+.expanel`（覆盖 M7 手风琴决策）
- **7:3分屏**：工作台改为 `.ws` Grid 布局
- **50/50分屏**：点击投递项后显示 `.split` 左岗位+右简历
- **AI配置内嵌**：从独立 `#ai-config` tab 内嵌到工作台右侧 `.aicfg`
- **为爬虫按钮预留位置**：M11 采集控制面板的 DOM 占位

## 节点路径与状态

| 节点 | 状态 | 角色 | 依赖 | 跳转 |
|------|------|------|------|------|
| [M10-N1：首页Grid与卡片交互](../nodes/M10_N1_HOME_GRID_AND_MODAL.md) | 待开始 | 前端、测试 | M9 全部 | → WP1~WP4 |
| [M10-N2：工作台7:3分屏布局](../nodes/M10_N2_WORKBENCH_SPLIT_LAYOUT.md) | 待开始 | 前端、测试 | M10-N1 | → WP1~WP4 |
| [M10-N3：50/50分屏与功能整合](../nodes/M10_N3_SPLIT_VIEW_INTEGRATION.md) | 待开始 | 前端、测试 | M10-N2 | → WP1~WP5 |
| [M10-N4：导航装饰与预留位](../nodes/M10_N4_NAV_DECORATION_AND_PLACEHOLDER.md) | 待开始 | 前端、测试 | N1 + N2 + N3 | → WP1~WP4 |

## 执行拓扑

```
M9 全部 ──→ M10-N1（首页Grid+弹窗，4 WP）──→ M10-N2（工作台7:3分屏，4 WP）──→ M10-N3（50/50分屏，5 WP）──→ M10-N4（导航+装饰+预留，4 WP）
```

## 完成判定

- [ ] 首页呈现 4 列 8 色 Grid 布局，12 个 SVG 图形循环显示
- [ ] 卡片点击弹出居中弹窗（`.exov+.expanel`），scale 动画，ESC/遮罩可关闭
- [ ] 工作台为 7:3 CSS Grid 分屏，左侧投递列表+右侧简历面板
- [ ] AI 配置面板内嵌在工作台右侧，可折叠展开
- [ ] 点击投递项显示 50/50 分屏（左岗位详情+右简历编辑）
- [ ] 50/50 分屏复用 M8/M9 的简历编辑/导出/AI 功能
- [ ] 导航栏视觉对齐 `.vnav`（黑色背景+红色底边），保留 Hash 路由 3 标签
- [ ] 装饰元素实现（`.vlabel`、`.anim` 动画、`.mock-nav`）
- [ ] 为 M11 采集控制按钮预留 DOM 位置
- [ ] 视觉回归检测通过
