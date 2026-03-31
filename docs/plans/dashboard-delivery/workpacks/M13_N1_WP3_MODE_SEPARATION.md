# 工作包 M13-N1-WP3：手动/自动模式区分

> 目标：在消息协议和运行时配置中显式区分手动模式与自动模式
> 角色：后端
> 预估改动量：~20行JS

## 1. 前置条件
- M13-N1-WP2 通过（停止机制稳定）

## 2. 读文件
| 文件 | 读取目的 |
|------|---------|
| `crawler/extension/background.js` L530-555 | `START_CRAWL` 消息处理（手动触发入口） |
| `crawler/extension/background.js` L382-397 | `restoreAlarms()` 自动调度入口 |
| `crawler/extension/background.js` L124-129 | `crawlState` 初始状态 |

## 3. 改动规格
- `START_CRAWL` 消息体中增加 `source: 'manual'` 字段
- 自动调度路径标记 `source: 'auto'`
- 采集执行函数根据 `source` 选择不同配置：
  - `manual`：使用用户输入关键词、手动冷却窗口（3-5 分钟）
  - `auto`：使用 Controller 队列关键词、原有冷却策略
- `crawlState` 中记录当前 `source`，便于后续查询
- 现有排障阶段的"手动绕过冷却"逻辑收编为 `manual` 模式的正式配置

## 4. 验证
- [ ] Dashboard 手动触发采集，关键词为用户输入值
- [ ] 自动调度采集，关键词为 Controller 队列值
- [ ] 手动模式冷却时间为 3-5 分钟
- [ ] 自动模式冷却策略不受影响
- [ ] `crawlState.source` 正确记录来源
