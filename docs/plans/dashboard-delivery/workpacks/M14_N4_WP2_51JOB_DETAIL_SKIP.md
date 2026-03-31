# 工作包 M14-N4-WP2：51job 详情 URL 还原与状态化跳过

> 目标：基于 sensorsdata 还原详情 URL + 详情状态化跳过 + DOM 签名校验
> 角色：后端
> 预估改动量：~40行JS
> 来源：[稳定方案 §Bug2：详情 URL 生成规则不完整](../workpacks/M14_51JOB_STABILITY_STRATEGY.md)

## 1. 前置条件
- M14-N4-WP1 通过（分页可用）

## 2. 读文件
| 文件 | 读取目的 |
|------|---------|
| `crawler/extension/content-51job.js` | 51job 列表入库逻辑，需要写入 detail_status 和还原详情 URL |
| `crawler/extension/background.js` | 采集结果处理 |

## 3. 改动规格

### 详情 URL 还原（基于 sensorsdata）

当前代码（L467）使用错误模板 `https://jobs.51job.com/{jobId}.html`，需改为基于 sensorsdata 还原：

```js
function build51JobDetailUrl(sensors) {
    // 优先使用页面可见的真实详情链接
    const realLink = getRealDetailLink();
    if (realLink) return realLink;

    // 基于 sensorsdata 还原详情 URL
    if (!sensors || !sensors.jobId) return '';

    const jobId = sensors.jobId;
    const pageCode = sensors.pageCode ? sensors.pageCode.replace(/\|/g, '_') : '';
    const requestId = sensors.requestId || '';
    const areaSlug = resolveAreaSlug(sensors.jobArea);

    // 格式：https://jobs.51job.com/{area-slug}/{jobId}.html?s={pageCode}&t=0_0&req={requestId}
    if (areaSlug) {
        return `https://jobs.51job.com/${areaSlug}/${jobId}.html?s=${pageCode}&t=0_0&req=${requestId}`;
    }
    // 无区域 slug 时降级为不带区域的 URL
    return `https://jobs.51job.com/${jobId}.html`;
}

// 区域 slug 映射表（逐步补齐）
const AREA_SLUG_MAP = {
    '北京·通州区': 'beijing-tzq',
    '深圳·福田区': 'shenzhen-ftq',
    '深圳·龙岗区': 'shenzhen-lgq',
    // 后续根据实测数据补充...
};

function resolveAreaSlug(jobArea) {
    return AREA_SLUG_MAP[jobArea] || '';
}
```

**已验证的 URL 映射关系**：
- `jobId = 170309339` → `/170309339.html`
- `pageCode = sou|sou|soulb` → `s=sou_sou_soulb`
- `requestId = 1194008c...` → `req=1194008c...`
- `jobArea = 北京·通州区` → `beijing-tzq`

### 详情状态化跳过

51job 列表入库时，统一标记：

```js
const job = {
    platform: '51job',
    platformJobId: sensors.jobId,
    title: sensors.jobName,
    // ... 其他字段
    url: build51JobDetailUrl(sensors),  // 还原的详情 URL
    detail_status: 'skipped',
    detail_error_code: 'platform_restricted',
    detail_attempt_count: 0
};
```

### DOM 结构签名校验

```js
function checkDomSignature() {
    const testItem = document.querySelector('.joblist-item');
    if (!testItem) {
        console.warn('[51job] DOM signature check failed: .joblist-item not found');
        return false;
    }
    const titleEl = testItem.querySelector('.jname');
    if (!titleEl) {
        console.warn('[51job] DOM signature check failed: .jname not found inside .joblist-item');
        return false;
    }
    return true;
}
```

在校验失败时：
- 记录告警日志
- 返回空结果（不静默返回假数据）
- 在采集结果中标记 `detail_error_code = 'dom_structure_drift'`

## 4. 注意事项

- **详情 URL 还原是架构预留**：当前不自动抓取详情，但 URL 应正确生成并入库，为后续状态化补抓做准备
- **`resolveAreaSlug` 映射表需要逐步补齐**：首次运行时可能很多区域无映射，这是已知限制
- **不要手动拼接旧模板 URL**：`https://jobs.51job.com/{jobId}.html` 已证实缺失城市路径段

## 5. 验证
- [ ] 详情 URL 格式符合 `https://jobs.51job.com/{area-slug}/{jobId}.html?s=...&req=...`
- [ ] 51job 入库岗位 `detail_status = 'skipped'`
- [ ] 51job 入库岗位 `detail_error_code = 'platform_restricted'`
- [ ] 入库岗位 `url` 字段存储了还原的详情 URL（非空）
- [ ] DOM 结构正常时校验通过
- [ ] DOM 结构变化时触发告警日志
- [ ] 不尝试访问 51job 详情页
