# 节点 M12-N3：第二轮平台爬虫

> 状态：待开始 *(生命周期：待开始 → 进行中 → 阻塞 → [done])*
> 里程碑：[M12 多平台爬虫](../milestones/M12_MULTI_PLATFORM_CRAWLERS.md)
> 条件触发：M12-N2 调研结论为"可行"时才执行

## 核心依赖

- M12-N2 通过且结论为"可行"

## 宏观交付边界

- 实现 M12-N2 调研确认可行的高门槛平台爬虫
- 技术方案按 M12-N2 评估结论执行
- 如需验证码处理，实现对应机制
- 数据统一写入 `scraped_jobs` 表

## 工作包

| WP | 名称 | 角色 | 预估 | 跳转 |
|----|------|------|------|------|
| [WP1：Content Script实现](../workpacks/M12_N3_WP1_CONTENT_SCRIPT.md) | 前端 | ~150行JS | → 查看 |
| [WP2：Background.js路由与集成](../workpacks/M12_N3_WP2_BG_INTEGRATION.md) | 后端 | ~30行JS | → 查看 |
| [WP3：数据入库与验证](../workpacks/M12_N3_WP3_DATA_INGESTION.md) | 后端 | ~40行JS | → 查看 |
| [WP4：平台爬虫冒烟检测](../workpacks/M12_N3_WP4_CRAWLER_SMOKE_CHECK.md) | 测试 | 手动 | → 查看 |

## 完成判定

- [ ] 第二轮平台 content script 实现并测试通过
- [ ] 采集数据正确写入 `scraped_jobs`
- [ ] Dashboard 首页正确显示新平台数据
- [ ] 端到端冒烟检测通过
