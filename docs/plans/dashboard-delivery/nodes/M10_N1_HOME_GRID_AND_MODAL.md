# 节点 M10-N1：首页 Grid 与卡片交互

> 状态：待开始 *(生命周期：待开始 → 进行中 → 阻塞 → [done])*
> 里程碑：[M10 UI对齐](../milestones/M10_UI_ALIGNMENT.md)
> 决策依据：[疑问2（展开方式→弹窗）](../M10_M11_M12_NEXT_ITERATION_QUESTIONS.md)

## 核心依赖

- M9 全部通过

## 宏观交付边界

- Grid 布局完全对齐设计稿（4列、8色nth-child循环、gap:4px、黑色背景）
- 卡片类名从 `.job-card` 统一为 `.card` + `.card__*` 子元素
- 展开方式从手风琴改为居中弹窗 `.exov+.expanel`
- 12个 SVG 至上主义图形保留，10%透明度
- **不改动** Hash 路由逻辑

## 工作包

| WP | 名称 | 角色 | 预估 | 跳转 |
|----|------|------|------|------|
| [WP1：Grid CSS 与8色循环](../workpacks/M10_N1_WP1_GRID_CSS.md) | 前端 | ~40行CSS | → 查看 |
| [WP2：卡片类名统一与渲染](../workpacks/M10_N1_WP2_CARD_CLASSNAMES.md) | 前端 | ~60行JS | → 查看 |
| [WP3：居中弹窗展开交互](../workpacks/M10_N1_WP3_MODAL_EXPANSION.md) | 前端 | ~80行JS+CSS | → 查看 |
| [WP4：首页冒烟检测](../workpacks/M10_N1_WP4_HOME_SMOKE_CHECK.md) | 测试 | 手动 | → 查看 |

## 完成判定

- [ ] Grid 4列布局渲染正确，8色循环与设计稿一致
- [ ] 卡片包含编号、标题、平台标签、薪资、公司·城市、标签
- [ ] 点击卡片弹出居中弹窗（scale动画），显示详情
- [ ] ESC 键和点击遮罩可关闭弹窗
- [ ] 再次点击同一卡片可关闭
- [ ] SVG 图形12个循环显示，颜色随nth-child变化
