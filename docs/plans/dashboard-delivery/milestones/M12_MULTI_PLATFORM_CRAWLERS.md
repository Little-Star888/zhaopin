# 里程碑 M12：多平台爬虫扩展

> 状态：待开始 *(生命周期：待开始 → 进行中 → 阻塞 → [done])*
> 前置：[M11 采集控制集成](./M11_CRAWL_CONTROL_UI.md)
> 决策文档：[M10/M11/M12 疑问与分歧](../M10_M11_M12_NEXT_ITERATION_QUESTIONS.md)

## 核心依赖

- M11-N1 通过（平台调研完成，第一轮目标平台已选定）
- M11-N3 通过（Extension 通信集成完成，采集控制闭环）

## 宏观交付边界

- **分轮次扩展**：不把所有平台一次性做完，按难度分轮
- **第一轮**：最简单平台（M11 调研选定），普通爬虫即可
- **第二轮**：高门槛平台（需手机验证码等），单独研究后决定是否实现
- **独立文件优先**：每个平台使用独立 content script，manifest.json hostname 匹配
- **不预设统一架构**：在完成两个平台后，再决定是否引入 BaseScraper/class 抽象
- **极简路由分发**：background.js 使用 Object mapping（`scrapers['boss'] = handler`），无 class 框架
- **基础数据适配**：入库前归一化各平台字段格式（salary/experience/education/keywords），以 Boss 格式为基准
- **统一数据格式**：所有平台数据写入 `scraped_jobs` 表，`platform` 字段区分来源

## 节点路径与状态

| 节点 | 状态 | 角色 | 依赖 | 跳转 |
|------|------|------|------|------|
| [M12-N1：第一轮平台爬虫](../nodes/M12_N1_FIRST_PLATFORM_CRAWLER.md) | 待开始 | 前端、后端、测试 | M11 全部 | → WP1~WP5 |
| [M12-N2：高门槛平台调研](../nodes/M12_N2_HARD_PLATFORM_RESEARCH.md) | 待开始 | 调研 | M12-N1 | → WP1~WP3 |
| [M12-N3：第二轮平台爬虫](../nodes/M12_N3_SECOND_PLATFORM_CRAWLER.md) | 待开始 | 前端、后端、测试 | M12-N2 | → WP1~WP4 |

## 执行拓扑

```
M11 全部 ──→ M12-N1（第一轮平台爬虫，5 WP）──→ M12-N2（高门槛平台调研，3 WP）──→ M12-N3（第二轮平台爬虫，4 WP，条件触发）
```

> M12-N3 为条件触发节点：只有当 M12-N2 调研结论为"可行"时才执行。如果验证码平台技术方案不可行，N3 标记为"跳过"。

## 完成判定

### 第一轮（必须完成）
- [ ] 第一轮目标平台的 content script 实现并测试通过
- [ ] manifest.json 配置正确的 hostname 权限和 content script 匹配
- [ ] background.js 正确路由分发到对应平台的爬虫逻辑
- [ ] 采集数据正确写入 `scraped_jobs` 表，`platform` 字段值正确
- [ ] Dashboard 首页 Grid 正确显示新平台数据（平台标签+8色循环）
- [ ] 端到端冒烟检测通过（Dashboard触发→Extension采集→数据入库→UI展示）

### 第二轮（条件完成）
- [ ] 高门槛平台的验证码机制分析完成
- [ ] 可行技术方案评估报告完成
- [ ] 如方案可行：第二轮平台爬虫实现并检测通过
- [ ] 如方案不可行：文档记录原因和替代建议
