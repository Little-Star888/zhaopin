# 节点 M11-N2：Dashboard 采集控制面板

> 状态：待开始 *(生命周期：待开始 → 进行中 → 阻塞 → [done])*
> 里程碑：[M11 采集控制集成](../milestones/M11_CRAWL_CONTROL_UI.md)
> 决策依据：[疑问7（Dashboard→Extension页面通信）](../M10_M11_M12_NEXT_ITERATION_QUESTIONS.md)

## 核心依赖

- M10-N4 通过（爬虫按钮预留位就绪）
- **不硬依赖 M11-N1**：N2 可与 N1 并行开发

## 宏观交付边界

- 在 Dashboard 首页（或预留位）添加采集控制面板
- 平台选择（Select 下拉）
- 搜索关键词和城市参数输入
- 开始/停止采集按钮
- 采集状态通过 Toast 反馈（复用 `.tc` 系统）
- 采集结果实时更新首页 Grid

## 并行开发契约

N2 与 N1 并行开发期间的 Mock 数据约定：
- **平台选择下拉**：开发阶段硬编码 `[{value: 'boss', label: 'Boss直聘'}]` 作为唯一选项
- **N1 完成后合并**：N1 调研结论产出选定平台列表，N2 更新下拉选项
- **消息协议占位**：N2 仅负责 UI 渲染和事件绑定，不实现通信逻辑（N3 负责）
- **UI 验收**：N2 可独立验收（Boss 平台 UI 交互正确即可）

## 工作包

| WP | 名称 | 角色 | 预估 | 跳转 |
|----|------|------|------|------|
| [WP1：采集控制面板UI](../workpacks/M11_N2_WP1_CONTROL_PANEL_UI.md) | 前端 | ~60行HTML+CSS | → 查看 |
| [WP2：采集状态反馈](../workpacks/M11_N2_WP2_STATUS_FEEDBACK.md) | 前端 | ~40行JS | → 查看 |
| [WP3：采集结果展示](../workpacks/M11_N2_WP3_RESULT_DISPLAY.md) | 前端 | ~30行JS | → 查看 |

## 完成判定

- [ ] 采集控制面板 UI 渲染正确（Constructivism 风格）
- [ ] 平台选择下拉包含已调研的平台
- [ ] 开始/停止按钮交互正常
- [ ] 采集状态通过 Toast 实时反馈
- [ ] 采集完成后首页 Grid 自动刷新显示新数据
