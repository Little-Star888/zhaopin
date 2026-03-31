# 工作包 M16-N1-WP1：AI 配置页面删除

> 目标：删除 Dashboard 中的 AI 配置页面 UI 和初始化代码
> 角色：前端
> 预估改动量：~5行HTML删除 + ~260行JS删除

## 1. 前置条件
- M15 全部通过

## 2. 读文件
| 文件 | 读取目的 |
|------|---------|
| `crawler/extension/dashboard.html` L14 | 侧边栏"AI 配置"导航链接 |
| `crawler/extension/dashboard.html` L61 | `#view-ai-config` section |
| `crawler/extension/dashboard.js` L59 | 路由映射 `#ai-config` |
| `crawler/extension/dashboard.js` L81 | `loadAIConfigView()` 调用 |
| `crawler/extension/dashboard.js` L1972-2232 | `loadAIConfigView()` 函数体 |

## 3. 改动规格

### HTML 删除
- 删除 `<a href="#ai-config" class="nav-tab">AI 配置</a>` 导航链接
- 删除 `<section id="view-ai-config">...</section>` 整个 section

### JS 删除
- 删除路由映射中的 `'#ai-config': document.getElementById('view-ai-config')` 条目
- 删除 `if (hash === '#ai-config') loadAIConfigView();` 分支
- 删除 `loadAIConfigView()` 函数定义（约 260 行）
- 删除 `let aiConfigInitialized = false` 变量（如仅被 loadAIConfigView 使用）

### JS 保留（不动）
- `aiConfigured` 全局变量（被智能匹配等功能引用）
- `AI_PROVIDER_DEFAULTS` 常量（被 AI 功能引用）
- 所有 `if (!aiConfigured)` 条件判断（功能按钮启用/禁用逻辑）
- `checkAIConfigured()` 函数

## 4. 验证
- [ ] 侧边栏无"AI 配置"入口
- [ ] 直接访问 `#ai-config` hash 不报错（无对应 section）
- [ ] 控制台无 `Cannot read properties of null` 报错
- [ ] 智能匹配按钮正常显示（启用/禁用逻辑不受影响）
- [ ] AI 优化按钮正常显示
