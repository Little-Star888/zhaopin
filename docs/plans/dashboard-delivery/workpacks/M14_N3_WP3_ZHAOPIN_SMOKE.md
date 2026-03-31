# 工作包 M14-N3-WP3：智联完整链路冒烟检测

> 目标：端到端验证智联招聘完整采集链路（基于 `__INITIAL_STATE__` 数据源）
> 角色：测试
> 预估改动量：无代码改动
> 来源：[稳定方案 §第四轮实际爬取尝试](../workpacks/M14_51JOB_STABILITY_STRATEGY.md)

## 1. 前置条件
- M14-N3-WP1 ~ WP2 全部通过

## 2. 测试场景

### 场景 1：`__INITIAL_STATE__` 数据提取验证
1. 在智联搜索页触发采集（1城市 × 1关键词 × p1）
2. 确认从 `__INITIAL_STATE__.positionList` 提取了 20 条岗位
3. 确认每个岗位包含关键字段：`number`、`name`、`companyName`、`salary60`、`positionUrl`
4. 确认 `platformJobId` 使用 `number` 字段（CC/CCL...J... 格式）
5. 确认 `url` 字段存储了 `positionUrl`（格式为 `https://www.zhaopin.com/jobdetail/{jobId}.htm`）
6. 确认 `jobSummary` 非空（200-300 字岗位摘要）

### 场景 2：列表分页验证
1. 配置 `MAX_LIST_PAGES = 2`，触发智联采集（1城市 × 1关键词）
2. 确认 p1 和 p2 均被抓取
3. 确认 `crawl_page_tasks` 有 2 条 `done` 记录
4. 确认 p1 提取约 20 条，p2 提取约 20 条
5. 确认 p1 与 p2 去重后新岗位比例 > 80%（基于实测数据：p2 仅 2 条与 p1 重复）
6. 恢复默认 `MAX_LIST_PAGES = 1`

### 场景 3：详情页 `__INITIAL_STATE__` 提取验证
1. 触发智联采集，等待详情补全
2. 查询 `detail_status = 'success'` 的岗位
3. 确认 `description` 字段非空且长度 > 1000 字符（基于实测 5K+ 字符预期）
4. 确认描述数据来自 `__INITIAL_STATE__.jobInfo.jobDetail.detailedPosition.description`
5. 确认 `companyDescription` 非空（基于实测 500-1000 字预期）
6. 确认 `welfareTags` 和 `labels` 数组已正确提取

### 场景 4：详情 backlog 优先级消费
1. 确保数据库中有 `detail_status IN ('pending', 'anti_bot')` 的记录
2. 触发第二轮采集，确认只补抓这些待补岗位
3. 确认 `pending` 优先于 `anti_bot` 消费
4. 确认不超过 `DETAIL_BUDGET_PER_RUN` 条/轮

### 场景 5：自动降级与退避
1. 在详情频繁失败的环境中触发采集（或手动模拟）
2. 确认连续 2 次详情失败后停止详情抓取
3. 确认控制台输出 `[Zhaopin] Detail degradation triggered after N consecutive failures`
4. 确认列表抓取不受影响
5. 查看 `next_detail_retry_at` 字段，确认退避时间：首次 5min → 30min → 2h → 24h
6. 确认达到 max_attempts (5) 后 `detail_status = 'skipped'`

### 场景 6：参数可配置
1. 修改 `runtime_config` 中的 `DETAIL_BUDGET_PER_RUN` 为 5
2. 触发采集，确认每轮补抓 5 条详情
3. 修改 `DETAIL_REQUEST_INTERVAL_MS` 为 5000
4. 确认详情请求间隔约 5 秒
5. 恢复默认值

## 3. 验证清单
- [ ] 所有场景通过
- [ ] `__INITIAL_STATE__` 是主数据源，DOM 解析仅作为 fallback
- [ ] 不影响 Boss/51job 采集
- [ ] 列表数据完整性不受详情失败影响
- [ ] 单 session 内 3 列表 + 3 详情未触发风控（基于实测验证）
- [ ] 采集日志中无异常错误
