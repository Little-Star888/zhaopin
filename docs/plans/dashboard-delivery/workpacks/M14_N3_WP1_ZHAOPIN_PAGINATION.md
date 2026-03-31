# 工作包 M14-N3-WP1：智联列表分页与数据提取

> 目标：智联招聘基于 `__INITIAL_STATE__` 的 p1→pN 分页 + 结构化数据提取
> 角色：后端
> 预估改动量：~50行JS
> 来源：[稳定方案 §尝试3-6](../workpacks/M14_51JOB_STABILITY_STRATEGY.md)

## 1. 前置条件
- M14-N2 通过（页码任务表 + detail_status 可用）

## 2. 读文件
| 文件 | 读取目的 |
|------|---------|
| `crawler/extension/content-zhaopin.js` | 智联列表抓取逻辑，需要接入分页和 `__INITIAL_STATE__` 提取 |
| `crawler/extension/background.js` | 采集主流程，需要分页调度 |
| `controller/db.js` | `crawl_page_tasks` 表读写接口 |

## 3. 改动规格

### 主数据源：`__INITIAL_STATE__`

智联搜索页加载后，`window.__INITIAL_STATE__` 包含完整的岗位结构化数据：

```js
// 在 content-zhaopin.js 中提取列表数据
function extractFromInitialState() {
    try {
        const state = window.__INITIAL_STATE__;
        if (!state || !state.positionList) return null;

        return state.positionList.map(job => ({
            platformJobId: job.number,           // CC/CCL...J... 格式，唯一标识
            title: job.name,                      // 岗位名称
            company: job.companyName,             // 公司名称
            salary: job.salary60,                 // 薪资显示值（如 "1-1.5万"）
            salaryReal: job.salaryReal,           // 薪资实际值（如 10001-15000）
            location: job.workCity,              // 城市
            district: job.cityDistrict,           // 区域
            education: job.education,             // 学历要求
            experience: job.workingExp,           // 经验要求
            workType: job.workType,               // 工作类型
            industry: job.industryName,           // 行业
            companySize: job.companySize,         // 公司规模
            property: job.property,               // 公司性质
            financingStage: job.financingStage,     // 融资阶段
            jobSummary: job.jobSummary,           // 岗位摘要（200-300字）
            url: job.positionUrl,               // 详情页 URL
            publishTime: job.publishTime,         // 发布时间
            // ... 还有 100+ 其他字段可选
        }));
    } catch (e) {
        console.error('[Zhaopin] __INITIAL_STATE__ extraction failed:', e);
        return null;
    }
}
```

### 分页调度逻辑

1. 采集开始时，为当前 `city + keyword` 创建 `crawl_page_tasks` 记录（status = 'pending'）
2. 逐页执行：从 `crawl_page_tasks` 查询 `status = 'pending'` 的任务，按页码排序
3. 翻页 URL 格式：`https://www.zhaopin.com/sou/jl{cityCode}/kw{keyword}/p{pageNum}`
4. 执行前更新 `status = 'running'`，执行后更新 `status = 'done'`，记录 `jobs_found` 和 `jobs_new`
5. 页终止条件（满足任一即停止翻页）：
   - 空页：当前页返回 0 条岗位
   - 高重复率：当前页新岗位占比 < 10%
   - 连续无新：连续 2 页无任何新岗位
   - 硬上限：单次任务最多翻 N 页（默认 1，可通过 `runtime_config.MAX_LIST_PAGES` 调整）

### 去重键

使用 `positionList[N].number` 字段（CC/CCL...J... 格式）作为 `platformJobId`：
- 跨页去重已验证：p1→p2 仅 2 条重复（10%），p2→p3 零重复

### 参数可配置化

| 参数 | 默认值 | 配置方式 |
|------|--------|---------|
| `MAX_LIST_PAGES` | 1 | `runtime_config` / popup 配置面板 |
| `DETAIL_BUDGET_PER_RUN` | 3 | `runtime_config` |
| `DETAIL_REQUEST_INTERVAL_MS` | 3000 | `runtime_config` |

## 4. 注意事项

- **`__INITIAL_STATE__` 是主数据源**：已验证包含 100+ 字段/条，比 DOM 解析更可靠
- **DOM 解析作为 fallback**：如果 `__INITIAL_STATE__` 提取失败，再降级到 DOM 选择器
- **城市编码确认**：`jl530` = 北京（非上海），需确保传入正确的 cityCode
- **requests 和 AJAX API 直取已证实失败**：纯 HTTP 方案不可行，必须依赖浏览器渲染

## 5. 验证
- [ ] 默认只抓 p1，与当前行为一致
- [ ] 配置 `MAX_LIST_PAGES=3` 后可抓取 p1~p3
- [ ] 每页提取 20 条岗位数据
- [ ] `platformJobId` 使用 `number` 字段（CC/CCL...J... 格式）
- [ ] 空页时自动停止翻页
- [ ] 高重复率时自动停止翻页
- [ ] p1→p2 去重后新岗位比例 > 80%（基于实测数据预期）
- [ ] `crawl_page_tasks` 正确记录每页状态
- [ ] 不影响 Boss/51job 采集
