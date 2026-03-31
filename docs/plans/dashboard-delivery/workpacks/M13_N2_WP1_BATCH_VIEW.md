# 工作包 M13-N2-WP1：首页批次视图

> 目标：首页从"全库视图"切换为"本次采集结果视图"
> 角色：前端、后端
> 预估改动量：~40行JS + 10行SQL

## 1. 前置条件
- M13-N1 通过（采集控制链路稳定，手动采集可正常执行）

## 2. 读文件
| 文件 | 读取目的 |
|------|---------|
| `crawler/extension/dashboard.js` | 首页数据加载和渲染逻辑 |
| `crawler/extension/dashboard-api.js` | `/api/jobs` 接口调用 |
| `controller/jobs-handler.js` | 后端 jobs 查询接口实现 |
| `controller/db.js` L856-876 | `scraped_jobs` 表结构（含 `crawl_batch_id`） |

## 3. 改动规格
- **后端**：`/api/jobs` 接口增加可选 `batch_id` 查询参数
  - 有 `batch_id`：`WHERE crawl_batch_id = ?`
  - 无 `batch_id`：返回全量（保持兼容）
- **前端**：
  - 采集开始时（`START_CRAWL` 成功响应），记录当前 `crawl_batch_id` 到全局状态
  - **持久化**：`crawl_batch_id` 同时存入 `localStorage`，页面初始化时优先读取
    - 有 localStorage 值：默认使用该 batch_id 进入批次视图
    - 无 localStorage 值：默认进入全库视图
    - 新采集开始时覆盖 localStorage 中的值
  - 首页轮询请求默认带 `batch_id` 参数
  - 增加"全部岗位"入口按钮，点击后请求不带 `batch_id`
  - 当前视图状态通过 UI 标识（如标签切换样式）
- 不删除历史数据，仅做查询过滤

## 4. 验证
- [ ] 手动采集开始后，首页自动切换到当前批次视图
- [ ] 首页只展示当前 `crawl_batch_id` 的数据
- [ ] 点击"全部岗位"可切回全库视图
- [ ] 切回全库视图后历史数据正常显示
- [ ] 再次开始新采集时，首页重新切换到新批次视图
- [ ] Dashboard 刷新（F5）后，首页仍保持在当前批次视图
