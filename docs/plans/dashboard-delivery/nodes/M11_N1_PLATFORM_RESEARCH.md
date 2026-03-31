# 节点 M11-N1：平台调研与选型

> 状态：待开始 *(生命周期：待开始 → 进行中 → 阻塞 → [done])*
> 里程碑：[M11 采集控制集成](../milestones/M11_CRAWL_CONTROL_UI.md)
> 决策依据：[疑问6（平台API可行性→先调研）](../M10_M11_M12_NEXT_ITERATION_QUESTIONS.md)

## 核心依赖

- M10 全部通过（UI骨架稳定）

## 宏观交付边界

- 调研猎聘(liepin.com)、51job(51job.com)、智联(zhaopin.com) 三个平台
- 调研内容：内部API可行性、DOM结构、反爬机制、验证码门槛
- 选定第一轮扩展目标平台（最简单的）
- 验证码平台单独列为后续研究项
- **不预设统一爬虫架构**

## 工作包

| WP | 名称 | 角色 | 预估 | 跳转 |
|----|------|------|------|------|
| [WP1：猎聘平台调研](../workpacks/M11_N1_WP1_LIEPIN_RESEARCH.md) | 调研 | 1-2天 | → 查看 |
| [WP2：51job平台调研](../workpacks/M11_N1_WP2_51JOB_RESEARCH.md) | 调研 | 1-2天 | → 查看 |
| [WP3：智联平台调研](../workpacks/M11_N1_WP3_ZHILIAN_RESEARCH.md) | 调研 | 1-2天 | → 查看 |
| [WP4：调研报告与选型](../workpacks/M11_N1_WP4_RESEARCH_REPORT.md) | 调研 | 半天 | → 查看 |

## 完成判定

- [ ] 三平台调研报告完成（API/DOM/反爬/验证码）
- [ ] 第一轮目标平台选定（最简单的）
- [ ] 第二轮目标平台识别（高门槛，需单独研究）
- [ ] manifest.json 需要的 hostname 权限清单列出
