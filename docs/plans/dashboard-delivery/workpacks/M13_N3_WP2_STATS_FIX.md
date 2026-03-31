# 工作包 M13-N3-WP2：统计口径验证与修正

> 目标：确认"含描述条数"统计根因并修正
> 角色：后端
> 预估改动量：~15行JS

## 1. 前置条件
- M13-N1 通过（采集控制链路稳定，可正常触发采集进行验证）

## 2. 读文件
| 文件 | 读取目的 |
|------|---------|
| `crawler/extension/background.js` L1113-1135 | `executeCrawlTask` 返回值中的统计：`allJobs.filter(j => j.description?.length > 0).length` |
| `crawler/extension/background.js` L1940-1964 | `buildTaskResult` 中的统计：`this.runStats.detailDescriptionNonEmptyCount` |
| `crawler/extension/background.js` L955-1026 | 详情抓取循环（确认 description 写入时机） |

## 3. 改动规格
- **验证阶段**（优先）：
  - 在 `buildTaskResult` 中临时打印两条统计路径的值进行对比
  - 触发一次完整采集，观察控制台输出差异
- **当前推测/待验证结论**：
  - 代码中存在两条统计路径：`allJobs.filter(j => j.description?.length > 0).length` 和 `this.runStats.detailDescriptionNonEmptyCount`
  - 当前推测：Dashboard 可能走的是后者分支导致值不准确，该结论需以实际日志验证结果为准
- **修正阶段**（验证确认后）：
  - 根据验证结果统一为正确的统计路径
  - 如根因是详情抓取写入时机问题，在详情写入完成后重新计算统计

## 4. 验证
- [ ] 已完成数据验证（两条统计路径值对比）
- [ ] "入库 N 条"的统计与 UI 展示一致
- [ ] "含描述条数"与实际有描述的岗位数量一致（或已临时隐藏）
