# 节点 M10-N4：导航、装饰与预留位

> 状态：待开始 *(生命周期：待开始 → 进行中 → 阻塞 → [done])*
> 里程碑：[M10 UI对齐](../milestones/M10_UI_ALIGNMENT.md)
> 决策依据：[疑问4（导航→保留Hash+视觉对齐）](../M10_M11_M12_NEXT_ITERATION_QUESTIONS.md)、[疑问9（装饰→按设计稿实现）](../M10_M11_M12_NEXT_ITERATION_QUESTIONS.md)

## 核心依赖

- M10-N1 + M10-N2 + M10-N3 全部通过

## 宏观交付边界

- 导航栏视觉对齐 `.vnav`（黑色背景+红色底边+大写字母+letter-spacing）
- 保留 Hash 路由和 3 标签页结构不变
- `.mock-nav` 子导航实现
- `.vlabel` 大字背景（SUPRE/SOVT）
- `.anim` + IntersectionObserver 入场动画
- Toast 样式对齐设计稿（红色成功 `.t--ok`、黑底黄字错误 `.t--er`）
- 为 M11 采集控制面板预留 DOM 位置

## 工作包

| WP | 名称 | 角色 | 预估 | 跳转 |
|----|------|------|------|------|
| [WP1：导航栏视觉对齐](../workpacks/M10_N4_WP1_NAV_STYLE.md) | 前端 | ~30行CSS | → 查看 |
| [WP2：装饰元素实现](../workpacks/M10_N4_WP2_DECORATIONS.md) | 前端 | ~40行CSS+JS | → 查看 |
| [WP3：爬虫按钮预留位](../workpacks/M10_N4_WP3_CRAWL_PLACEHOLDER.md) | 前端 | ~10行HTML | → 查看 |
| [WP4：M10整体视觉回归检测](../workpacks/M10_N4_WP4_VISUAL_REGRESSION.md) | 测试 | 手动 | → 查看 |

## 完成判定

- [ ] 导航栏样式对齐 `.vnav`（黑色+红色底边+大写+letter-spacing）
- [ ] 3 个标签页 Hash 路由正常工作
- [ ] `.mock-nav` 子导航在每个 section 中正确显示
- [ ] `.vlabel` 大字背景在首页和工作台正确渲染
- [ ] 卡片入场动画（IntersectionObserver）正常触发
- [ ] Toast 样式对齐设计稿
- [ ] 采集控制面板预留 DOM 位置存在
- [ ] 与 constructivism-mockup.html 逐项对比无遗漏差异
