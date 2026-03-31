# 节点 M12-N1：第一轮平台爬虫

> 状态：待开始 *(生命周期：待开始 → 进行中 → 阻塞 → [done])*
> 里程碑：[M12 多平台爬虫](../milestones/M12_MULTI_PLATFORM_CRAWLERS.md)
> 决策依据：[疑问5（爬虫架构→独立文件优先）](../M10_M11_M12_NEXT_ITERATION_QUESTIONS.md)

## 核心依赖

- M11 全部通过（调研完成、通信集成完成）

## 宏观交付边界

- 实现 M11-N1 选定的最简单平台的爬虫
- 使用独立 content script 文件（不重构现有 Boss 爬虫）
- manifest.json 配置 hostname 匹配和权限
- background.js 按 hostname 路由分发到对应爬虫（极简 Object mapping，无 class）
- 数据入库前进行**基础字段归一化**（salary/experience/education/keywords 统一格式）
- 数据统一写入 `scraped_jobs` 表，`platform` 字段标识来源
- **不引入 BaseScraper/class 抽象层**

## 工作包

| WP | 名称 | 角色 | 预估 | 跳转 |
|----|------|------|------|------|
| [WP1：Content Script实现](../workpacks/M12_N1_WP1_CONTENT_SCRIPT.md) | 前端 | ~100行JS | → 查看 |
| [WP2：极简路由分发](../workpacks/M12_N1_WP2_BG_ROUTING.md) | 后端 | ~30行JS | → 查看 |
| [WP3：基础数据适配](../workpacks/M12_N1_WP3_DATA_NORMALIZATION.md) | 后端 | ~30行JS | → 查看 |
| [WP4：数据入库与验证](../workpacks/M12_N1_WP4_DATA_INGESTION.md) | 后端 | ~40行JS | → 查看 |
| [WP5：平台爬虫冒烟检测](../workpacks/M12_N1_WP5_CRAWLER_SMOKE_CHECK.md) | 测试 | 手动 | → 查看 |

## 完成判定

- [ ] 新平台 content script 实现并测试通过
- [ ] manifest.json 正确配置 hostname 权限
- [ ] background.js 极简路由（Object mapping）正确分发，未命中平台有 console.warn 兜底
- [ ] 各平台字段归一化后写入 `scraped_jobs`，格式与 Boss 基准一致
- [ ] 缺失字段按降级策略处理（null 或默认值），不因字段缺失导致入库失败
- [ ] Dashboard 首页 Grid 正确显示新平台数据
- [ ] 平台标签正确显示（猎聘/51job/智联）
- [ ] 端到端冒烟检测通过
