# 工作包 M14-N3-WP2：智联详情 backlog 与自动降级

> 目标：基于 detail_status 的 backlog 队列消费 + 连续失败熔断
> 角色：后端
> 预估改动量：~50行JS
> 来源：[稳定方案 §阶段2](../workpacks/M14_51JOB_STABILITY_STRATEGY.md)

## 1. 前置条件
- M14-N3-WP1 通过（分页可用）

## 2. 读文件
| 文件 | 读取目的 |
|------|---------|
| `crawler/extension/content-zhaopin.js` | 智联详情抓取逻辑，需要接入 backlog 和降级 |
| `crawler/extension/background.js` | 详情抓取调度，需要接入优先级队列 |
| `controller/db.js` | detail_status 相关查询接口 |

## 3. 改动规格

### 详情页数据提取

智联详情页的 `__INITIAL_STATE__` 包含完整岗位和公司详情：

```js
// 在 content-zhaopin.js 详情页中提取
function extractDetailFromInitialState() {
    try {
        const state = window.__INITIAL_STATE__;
        if (!state || !state.jobInfo || !state.jobInfo.jobDetail) return null;

        const detail = state.jobInfo.jobDetail;
        const position = detail.detailedPosition;
        const company = detail.detailedCompany;

        return {
            description: position.description || position.jobDesc || '',  // 纯文本 5K+ 字符
            welfareTags: position.welfareTags || [],
            labels: position.labels || [],
            skillLabel: position.skillLabel || '',
            recruitNumber: position.recruitNumber || '',
            companyDescription: company.companyDescription || '',  // 500-1000 字公司简介
            // ... 其他详情字段
        };
    } catch (e) {
        console.error('[Zhaopin] Detail __INITIAL_STATE__ extraction failed:', e);
        return null;
    }
}
```

### Backlog 队列

每轮采集完成后，从 `scraped_jobs` 中查询待补详情的岗位：

```sql
SELECT * FROM scraped_jobs
WHERE platform = 'zhaopin'
  AND detail_status IN ('pending', 'anti_bot')
  AND (next_detail_retry_at IS NULL OR next_detail_retry_at <= datetime('now', 'localtime'))
ORDER BY
  CASE detail_status WHEN 'pending' THEN 0 WHEN 'anti_bot' THEN 1 ELSE 2 END,
  crawled_at ASC
LIMIT ?
```

`?` 为 `DETAIL_BUDGET_PER_RUN` 参数值（默认 3）。

详情页 URL 从列表页 `positionList[N].positionUrl` 获取，格式为：
`https://www.zhaopin.com/jobdetail/{jobId}.htm`

### 自动降级（连续失败熔断）

- 维护 `consecutiveDetailFailCount` 计数器
- 每次详情失败：`consecutiveDetailFailCount++`
- 每次详情成功：`consecutiveDetailFailCount = 0`
- 当 `consecutiveDetailFailCount >= 2`：停止本轮详情抓取，仅继续列表
- 降级后记录日志：`[Zhaopin] Detail degradation triggered after N consecutive failures`

### 指数退避

在详情失败时计算 `next_detail_retry_at`：

```js
const backoffMs = [5 * 60 * 1000, 30 * 60 * 1000, 2 * 3600 * 1000, 24 * 3600 * 1000];
const idx = Math.min(detail_attempt_count - 1, backoffMs.length - 1);
const nextRetry = new Date(Date.now() + backoffMs[idx]);
```

### 状态更新

- 详情成功：`detail_status = 'success'`，清空 `detail_error_code`，重置 `detail_attempt_count`
- 风控拦截：`detail_status = 'anti_bot'`，`detail_error_code = 'anti_bot'`，更新退避时间
- 正文为空：`detail_status = 'empty'`，`detail_error_code = 'empty_content'`，更新退避时间
- 解析失败：`detail_status = 'error'`，`detail_error_code` 记录具体错误
- 达到 max_attempts (5)：`detail_status = 'skipped'`

## 4. 注意事项

- **详情页 3/3 已验证成功**：同一 session 内连续访问 4 页面（1 搜索 + 3 详情）未触发风控
- **建议每轮控制在 3 页列表 + 5 详情以内**，间隔 3-5 秒
- **详情页 `__INITIAL_STATE__` 约 85K 字符**：数据完整，包含 `description`（纯文本）和 `jobDesc`（HTML 格式）
- **`positionUrl` 是最可靠的详情入口**：从搜索页 `positionList[N].positionUrl` 获取，格式已验证

## 5. 验证
- [ ] 每轮按预算补抓 N 条详情
- [ ] `pending` 优先于 `anti_bot` 消费
- [ ] 详情页描述长度 > 1000 字符（基于实测 5K+ 字符预期）
- [ ] 连续 2 次失败后触发降级，只抓列表
- [ ] 退避时间计算正确（5min → 30min → 2h → 24h）
- [ ] 达到 max_attempts 后标记为 `skipped`，不再重试
- [ ] 降级后列表抓取不受影响
