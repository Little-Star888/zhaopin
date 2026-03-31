# 节点 M16-N1：AI 配置页面清理

> 状态：待开始 *(生命周期：待开始 → 进行中 → 阻塞 → [done])*
> 里程碑：[M16 AI配置清理与全平台采集](../milestones/M16_AI_CONFIG_CLEANUP_AND_ALL_PLATFORM.md)

## 核心依赖

- M15 全部通过

## 宏观交付边界

- 仅删除 AI 配置页面的 UI 和初始化代码
- **保留** `aiConfigured` 全局变量、`AI_PROVIDER_DEFAULTS` 常量
- **保留** 智能匹配、AI 优化等功能按钮及其启用/禁用逻辑
- **不修改** dashboard.css（AI 配置样式保留不删除，避免误删共用样式）

## 工作包

| WP | 名称 | 角色 | 预估 | 跳转 |
|----|------|------|------|------|
| [WP1：AI 配置页面删除](../workpacks/M16_N1_WP1_AI_CONFIG_REMOVE.md) | 前端 | ~5行HTML删除+~260行JS删除 | → 查看 |

## 完成判定

- [ ] 侧边栏无"AI 配置"导航链接
- [ ] `#view-ai-config` section 已从 HTML 中删除
- [ ] `loadAIConfigView()` 函数已删除
- [ ] 路由映射中 `#ai-config` 已删除
- [ ] 控制台无 JS 报错
- [ ] 智能匹配按钮正常工作
