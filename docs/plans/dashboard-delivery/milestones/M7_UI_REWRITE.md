# 里程碑 M7：UI 风格改写 + 简历解析 + Dashboard 重构

> 状态：待开始 *(生命周期：待开始 → 进行中 → 阻塞 → [done])*
> 全局架构决策：[M7_M8_PLAN.md](../../../crawler/extension/M7_M8_PLAN.md)
> 分歧记录：[M7_M8_DIVERGENCES.md](../../../crawler/extension/M7_M8_DIVERGENCES.md)

## 核心依赖

- M6-N2 通过（Popup Neumorphism 样式已就绪）

## 宏观交付边界

- **纯 CSS/JS 风格替换**：PANTONE → Constructivism（红#E62B1E / 黑#1A1A1A / 米白#F4F0EA）
- **SMACSS 状态类命名**：`.is-active` / `.is-expanded` / `.is-visible`，删除 `.neu-*` `.glass-*`
- **零构建零编译**：纯 JavaScript CommonJS，不引入 TypeScript
- **前后端可并行**：M7-N1（前端 Popup）和 M7-N2（后端解析）互不依赖

## 节点路径与状态

| 节点 | 状态 | 角色 | 依赖 | 跳转 |
|------|------|------|------|------|
| [M7-N1：Popup Constructivism PoC](../nodes/M7_N1_POPUP_CONSTRUCTIVISM_POC.md) | 待开始 | 前端、测试 | M6-N2 | → WP1~WP4 |
| [M7-N2：简历解析与 Schema 迁移](../nodes/M7_N2_RESUME_PARSER_AND_SCHEMA.md) | 待开始 | 后端、测试 | M3-N1 | → WP1~WP4 |
| [M7-N3：Dashboard CSS+JS 全面重构](../nodes/M7_N3_DASHBOARD_REWRITE.md) | 待开始 | 前端、测试 | M7-N1 + M7-N2 | → WP1~WP6 |
| [M7-N4：文档归档与验收](../nodes/M7_N4_DOC_ARCHIVE_AND_ACCEPTANCE.md) | 待开始 | 文档、测试 | N1 + N2 + N3 | → WP1~WP3 |

## 执行拓扑

```
M6-N2 ──→ M7-N1（前端 Popup，4 WP）──┐
                                      ├──→ M7-N3（前端 Dashboard，6 WP）──→ M7-N4（3 WP）
M3-N1 ──→ M7-N2（后端解析，4 WP）───┘
```

## 完成判定

- [ ] Popup 完成Constructivism风格改写，冒烟检测通过
- [ ] 后端简历解析引擎就绪（DOCX→MD + PDF→MD），content_md 可存储
- [ ] Dashboard 完成CSS Grid + 手风琴 + 简历双模式编辑，视觉回归检测通过
- [ ] 旧文档归档，M7 规范文档新建
- [ ] 端到端验收通过
