# 工作包 M14-N4-WP1：51job SPA 分页修复与列表分页

> 目标：修复 51job SPA 分页 Bug + 实现基于页码任务表的 p1→pN 分页
> 角色：后端
> 预估改动量：~60行JS
> 来源：[稳定方案 §Bug1：第二页被判全重复](../workpacks/M14_51JOB_STABILITY_STRATEGY.md)

## 1. 前置条件
- M14-N2 通过（页码任务表 + 去重可用）

## 2. 读文件
| 文件 | 读取目的 |
|------|---------|
| `crawler/extension/content-51job.js` | 51job 列表抓取逻辑，需要修复分页和 jobId 提取 |
| `crawler/extension/background.js` | 采集主流程，需要分页调度 |
| `controller/db.js` | `crawl_page_tasks` 表读写接口 |

## 3. 改动规格

### Bug 1 修复：SPA 分页方式（最高优先级）

**问题**：当前通过 `curr=N` URL 参数翻页，但 51job 是 SPA，翻页后 URL 不变，导致第二页数据与第一页完全相同。

**修复**：改为页内点击翻页方式：

```js
// 在 content-51job.js 中，翻页改为点击页码按钮
async function navigateToPage(targetPage) {
    const pageButton = document.querySelector(`.jpag .jpages a[data-page="${targetPage}"]`);
    if (pageButton) {
        pageButton.click();
        // 等待 SPA 状态更新
        await waitForPageChange(targetPage);
    }
}

async function waitForPageChange(expectedPage) {
    const maxWait = 10000;
    const interval = 500;
    const start = Date.now();
    while (Date.now() - start < maxWait) {
        const firstItem = document.querySelector('.joblist-item');
        if (firstItem) {
            const sensors = parseSensorsData(firstItem);
            if (sensors && sensors.pageNum === expectedPage) {
                return true;
            }
        }
        await new Promise(r => setTimeout(r, interval));
    }
    console.warn(`[51job] Page change timeout for page ${expectedPage}`);
    return false;
}
```

### Bug 1 修复：jobId 提取 fallback 移除

**问题**：`content-51job.js:444` 中 `extractJobId(window.location.href)` 提取的是搜索页 URL 而非卡片详情入口，应移除。

```js
// 修复前（错误）
const jobId = sensors.jobId || extractJobId(window.location.href) || '';

// 修复后
const jobId = sensors.jobId || '';
```

### 分页调度逻辑

与智联共享 `crawl_page_tasks` 表的分页机制：

1. 采集开始时，创建 `crawl_page_tasks` 记录（`platform = '51job'`）
2. 逐页执行，更新任务状态
3. 页终止条件（满足任一即停止翻页）：
   - 空页：当前页返回 0 条岗位
   - 高重复率：当前页新岗位占比 < 10%
   - 连续无新：连续 2 页无任何新岗位
   - 硬上限：单次任务最多翻 N 页（默认 1，可通过 `runtime_config.MAX_LIST_PAGES` 调整）

### 去重

复用 M14-N2-WP2 的 `platform + platformJobId` 唯一约束：
- 入库前 `INSERT OR IGNORE`
- 统计 `jobs_found`（本页总量）和 `jobs_new`（新入库量）
- 写入 `crawl_page_tasks`

## 4. 注意事项

- **不要用 `curr=N` URL 参数翻页**：已被实测证明无效，会导致第二页与第一页数据完全相同
- **翻页后必须等待 DOM 更新**：不能立即解析，要等 `sensorsdata.pageNum` 变化
- **`sensorsdata.pageNum` 可作为真实页码依据**：用户已在浏览器中验证

## 5. 验证
- [ ] 默认只抓 p1，与当前行为一致
- [ ] 配置 `MAX_LIST_PAGES=3` 后可抓取 p1~p3
- [ ] 翻页后 sensorsdata.pageNum 与目标页码一致
- [ ] 空页/高重复率时自动停止翻页
- [ ] 重复岗位不被重复入库
- [ ] `crawl_page_tasks` 正确记录每页状态
- [ ] 不影响 Boss/智联采集
