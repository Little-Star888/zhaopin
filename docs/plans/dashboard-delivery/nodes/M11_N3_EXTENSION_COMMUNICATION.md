# 节点 M11-N3：Extension 通信与状态同步

> 状态：待开始 *(生命周期：待开始 → 进行中 → 阻塞 → [done])*
> 里程碑：[M11 采集控制集成](../milestones/M11_CRAWL_CONTROL_UI.md)
> 决策依据：[疑问7（Extension页面通信→chrome.runtime.sendMessage）](../M10_M11_M12_NEXT_ITERATION_QUESTIONS.md)

## 核心依赖

- M11-N1 通过（消息协议设计需要平台信息）
- M11-N2 通过（UI就绪，需要绑定通信事件）

## 宏观交付边界

- background.js 新增消息处理：`START_CRAWL`、`GET_STATUS`、`STOP_CRAWL`
- Dashboard 通过 `chrome.runtime.sendMessage` 发送采集指令
- background.js 将采集结果转发给 Node.js 后端写入 `scraped_jobs`
- 采集进度通过消息实时推送给 Dashboard
- **不引入 bridge 服务**
- **验收范围**：N3 仅基于 Boss 平台验收，不等待新平台爬虫就绪

## 工作包

| WP | 名称 | 角色 | 预估 | 跳转 |
|----|------|------|------|------|
| [WP1：background.js消息协议](../workpacks/M11_N3_WP1_MESSAGE_PROTOCOL.md) | 后端 | ~50行JS | → 查看 |
| [WP2：Dashboard→background通信](../workpacks/M11_N3_WP2_DASHBOARD_COMM.md) | 前端 | ~40行JS | → 查看 |
| [WP3：采集状态同步](../workpacks/M11_N3_WP3_STATUS_SYNC.md) | 前端、后端 | ~40行JS | → 查看 |
| [WP4：端到端采集集成检测](../workpacks/M11_N3_WP4_E2E_CRAWL_CHECK.md) | 测试 | 手动 | → 查看 |

## 完成判定

- [ ] Dashboard 发送 START_CRAWL → background.js 正确接收并启动采集
- [ ] 采集进度实时推送到 Dashboard（已采集N条）
- [ ] 采集数据写入 `scraped_jobs` 表，`platform` 字段正确
- [ ] STOP_CRAWL 可正常停止采集
- [ ] 错误状态正确反馈（网络错误、反爬拦截等）
- [ ] 端到端检测通过（Dashboard触发→采集→入库→UI展示）
