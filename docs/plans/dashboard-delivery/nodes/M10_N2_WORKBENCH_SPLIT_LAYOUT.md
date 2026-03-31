# 节点 M10-N2：工作台 7:3 分屏布局

> 状态：待开始 *(生命周期：待开始 → 进行中 → 阻塞 → [done])*
> 里程碑：[M10 UI对齐](../milestones/M10_UI_ALIGNMENT.md)
> 决策依据：[疑问3（工作台布局→7:3分屏）](../M10_M11_M12_NEXT_ITERATION_QUESTIONS.md)

## 核心依赖

- M10-N1 通过

## 宏观交付边界

- 工作台从堆叠布局改为 CSS Grid 7:3 分屏 `.ws`
- 左侧 `.ws-del`：投递列表，奇白偶黑交替色，hover变色
- 右侧 `.ws-res`：简历预览面板（深色背景）
- AI 配置面板内嵌到工作台右侧 `.aicfg`（可折叠展开）
- 简历双模式编辑复用 M8/M9 产物
- 窄屏（<900px）回退为单列

## 工作包

| WP | 名称 | 角色 | 预估 | 跳转 |
|----|------|------|------|------|
| [WP1：分屏布局重构](../workpacks/M10_N2_WP1_SPLIT_LAYOUT.md) | 前端 | ~50行HTML+CSS | → 查看 |
| [WP2：投递列表样式](../workpacks/M10_N2_WP2_DELIVERY_LIST_STYLE.md) | 前端 | ~30行CSS | → 查看 |
| [WP3：简历面板与AI配置内嵌](../workpacks/M10_N2_WP3_RESUME_PANEL_INLINE.md) | 前端 | ~80行JS | → 查看 |
| [WP4：工作台冒烟检测](../workpacks/M10_N2_WP4_WORKBENCH_SMOKE_CHECK.md) | 测试 | 手动 | → 查看 |

## 完成判定

- [ ] 工作台 7:3 分屏渲染正确
- [ ] 投递列表奇偶交替色，hover 变黄/红
- [ ] 简历预览在右侧面板正确显示
- [ ] AI 配置面板可折叠展开，保存功能正常
- [ ] 简历编辑/保存功能正常
- [ ] 窄屏回退为单列
