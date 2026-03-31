# 里程碑 M11：采集控制集成到 Web UI

> 状态：待开始 *(生命周期：待开始 → 进行中 → 阻塞 → [done])*
> 前置：[M10 UI对齐](./M10_UI_ALIGNMENT.md)
> 决策文档：[M10/M11/M12 疑问与分歧](../M10_M11_M12_NEXT_ITERATION_QUESTIONS.md)

## 核心依赖

- M10 全部通过（UI 骨架稳定，爬虫按钮预留位就绪）
- 当前 Dashboard 运行在 Chrome Extension 页面内（`chrome-extension://...`）

## 宏观交付边界

- **Extension 页面通信**：通过 `chrome.runtime.sendMessage` 与 background.js 通信
- **不引入 bridge 服务**：暂不迁移到独立网页
- **平台调研先行**：先调研猎聘/51job/智联的 API 可行性和门槛，再决定第一轮目标
- **不预设爬虫架构**：在调研完成前不引入 BaseScraper/class 等抽象层
- **分轮次推进**：至少有一个简单平台可先做，验证码平台单独研究
- **并行开发**：N1（调研）与 N2（控制面板UI）并行，N2 使用硬编码 Boss 作为 Mock 数据源

## 节点路径与状态

| 节点 | 状态 | 角色 | 依赖 | 跳转 |
|------|------|------|------|------|
| [M11-N1：平台调研与选型](../nodes/M11_N1_PLATFORM_RESEARCH.md) | 待开始 | 后端、调研 | M10 全部 | → WP1~WP4 |
| [M11-N2：Dashboard采集控制面板](../nodes/M11_N2_CRAWL_CONTROL_PANEL.md) | 待开始 | 前端、测试 | M10-N4 | → WP1~WP3 |
| [M11-N3：Extension通信与状态同步](../nodes/M11_N3_EXTENSION_COMMUNICATION.md) | 待开始 | 前端、后端、测试 | M11-N1 + M11-N2 | → WP1~WP4 |

## 执行拓扑

```
M10 全部 ──┬──→ M11-N1（平台调研，4 WP）──┐
            │                              ├──→ M11-N3（Extension通信，4 WP）
            └──→ M11-N2（控制面板UI，3 WP）─┘
```

> **并行策略**：M11-N1（调研）与 M11-N2（控制面板UI）可并行开发。
> - N2 的 UI 骨架（布局、按钮、Toast）不依赖 N1
> - N2 开发期间平台选择下拉使用硬编码 Boss 作为默认值
> - N1 调研完成后，将选定平台列表合并到 N2 下拉选项
> - N3 强依赖 N1（消息协议）+ N2（UI 绑定），必须两者都完成后才能集成
> - N3 验收仅基于 Boss 平台，不等待新平台爬虫就绪

## 完成判定

- [ ] 三平台（猎聘/51job/智联）的 API 可行性和门槛调研完成
- [ ] 选定第一轮扩展目标平台（最简单的）
- [ ] Dashboard 中有采集控制面板（平台选择+参数配置+开始/停止按钮）
- [ ] 采集状态通过 Toast 实时反馈（开始采集、已采集N条、错误提示）
- [ ] 通过 Dashboard 触发爬虫任务，Extension background.js 正确接收并执行
- [ ] 采集数据正确写入 `scraped_jobs` 表（`platform` 字段正确）
- [ ] 端到端采集集成检测通过
