# M15 截图反馈：新需求与问题排查

> 创建时间：2026-03-27
> 来源：用户截图反馈 + 代码分析
> 状态：待讨论

---

## 0. 复核结论

对照当前代码后，有两点需要修正文档口径：

1. `REQ-3` 不是“待确认”，而是已经可以确认存在字段模型不一致：
   - 工作台列表接口读取的是 `selected = 1`
   - 取消收藏按钮切换的是 `is_favorite`
   这意味着“取消收藏后卡片是否消失”不是单纯的刷新时机问题，而是列表语义和按钮语义没有对齐。
2. `REQ-4` 的 Boss 原链接读取时补全逻辑已经存在于当前分支的 `handleGetJobDetail()` 中，因此这项不能直接继续按“未修复的 P0”定性。更合理的动作是先复验当前分支是否仍复现，再决定是否补首页列表链路或历史数据兼容。

因此，M15 的实施重点应从“纯 UI 修修补补”调整为“先纠正数据语义，再处理剩余交互细节”。

---

## 需求汇总

| # | 需求 | 严重程度 | 类型 |
|---|------|---------|------|
| REQ-1 | 首页移除"本次采集"/"全部岗位"视图切换器 | 低 | UI 清理 |
| REQ-2 | 详情弹窗收藏按钮应支持切换：收藏 ↔ 取消收藏 | 中 | 功能缺陷 |
| REQ-3 | 工作台取消收藏后，卡片应从列表消失 | 中 | 功能缺陷 |
| REQ-4 | 所有岗位都没有原链接 | 高 | 数据问题 |
| REQ-5 | 采集平台选择器缺少"猎聘"选项 | 低 | UI 缺失 |

---

## REQ-1：首页移除视图切换器

### 现象

首页顶部有"本次采集"和"全部岗位"两个切换按钮，用户不需要这个功能。

### 根因

`dashboard.js` 中 `loadJobs()` 渲染首页时调用了 `renderViewSwitcher(total)`：

```js
container.innerHTML = `${renderViewSwitcher(total)}${renderJobGrid(jobs)}`;
```

`renderViewSwitcher()` 根据批次视图状态生成切换按钮 HTML。

### 影响范围

| 文件 | 位置 | 改动 |
|------|------|------|
| `dashboard.js` | `loadJobs()` | 移除 `renderViewSwitcher` 调用 |
| `dashboard.js` | `renderViewSwitcher()` | 可选：删除整个函数 |
| `dashboard.js` | `bindCardClickEvents()` | 移除 `#btn-all-jobs` / `#btn-batch-view` 点击处理 |
| `dashboard.js` | `initBatchState()` / `setCurrentBatchId()` 等批次相关函数 | 可选：如批次功能完全弃用则清理 |
| `dashboard.css` | `.view-switcher*` 样式 | 可选：清理 |

### 待讨论

批次视图（batch view）功能是否完全弃用？如果弃用，相关函数和 localStorage 键也可以一并清理。

---

## REQ-2：详情弹窗收藏按钮应支持取消收藏

### 现象

详情弹窗中的收藏按钮：
- 未收藏时显示 `★ 收藏` ✓
- 收藏后显示 `已收藏` 且按钮 disabled ✗
- **无法点击取消收藏**

用户期望：收藏后应显示 `取消收藏`，点击可取消。

### 根因

`dashboard.js` 中弹窗渲染逻辑：

```js
<button ... id="exSelectBtn" ${isFav ? 'disabled' : ''}>
  ${isFav ? '已收藏' : '★ 收藏'}
</button>
```

按钮事件绑定中：

```js
if (selectBtn && !isFav) {
  selectBtn.addEventListener('click', async () => { ... });
}
```

已收藏状态下按钮被 `disabled`，且不绑定任何事件，因此无法取消收藏。

### 修复方案

1. 移除 `disabled` 属性
2. 已收藏时文本改为 `☆ 取消收藏`
3. 点击后调用 `favoriteJob(id)` 切换状态，刷新按钮文案
4. 取消收藏后同步刷新工作台列表

### 影响范围

| 文件 | 位置 | 改动 |
|------|------|------|
| `dashboard.js` | `loadExDetail()` | 修改按钮文案和 disabled 逻辑 |
| `dashboard.js` | `loadExDetail()` 事件绑定 | 改为始终绑定，区分收藏/取消逻辑 |

---

## REQ-3：工作台取消收藏后卡片应从列表消失

### 现象

50/50 分屏中点击"取消收藏"后：
- `loadDeliveryList()` 被调用 ✓
- `closeSplitView()` 关闭分屏 ✓
- `loadJobs()` 刷新首页 ✓
- **但实际列表中卡片是否真的消失需要验证**

### 根因分析

查看 `bindDeliveryEvents` 中的取消收藏处理：

```js
const cancelBtn = e.target.closest('.btn-cancel-select');
if (cancelBtn) {
  const jobId = parseInt(cancelBtn.dataset.id, 10);
  await favoriteJob(jobId);
  showToast('已取消收藏', 'success');
  loadDeliveryList();
}
```

调用 `favoriteJob(jobId)` 后，后端只会切换 `is_favorite`。

但当前工作台列表接口 `/api/delivery/selected` 读取的是 `getSelectedJobs()`，也就是 `selected = 1` 的记录，而不是 `is_favorite = 1` 的记录。

这意味着当前问题已经可以确认：

- UI 标题写的是“收藏列表”
- 操作按钮文案写的是“取消收藏”
- 但实际数据源仍是 `selected` 模型

所以这里的根因不是“列表刷新可能不及时”，而是**收藏模型与工作台列表模型不一致**。

### 判断

这一项需要先做产品语义决策，再做代码改动：

1. 如果工作台左侧确实是“收藏列表”，则接口应切换到 `is_favorite = 1`
2. 如果工作台左侧本意是“待投递列表”，则标题、按钮文案和调用接口都应改回 `selected` 语义

在当前截图语义下，更合理的方向是第一种：让“收藏列表”真正读取收藏数据。

### 影响范围

| 文件 | 位置 | 改动 |
|------|------|------|
| `dashboard.js` | `bindDeliveryEvents()` | 取消收藏后的 UI 联动 |
| `controller/jobs-handler.js` | `handleGetDeliveryList()` / `handleToggleFavorite()` | 对齐列表数据源与收藏切换 |
| `controller/jobs-db.js` | `getSelectedJobs()` / `getFavoriteJobs()` / `toggleFavorite()` | 修正工作台列表查询条件 |

---

## REQ-4：所有岗位都没有原链接

### 现象

首页卡片和详情弹窗中都显示"暂无原链接"而非可点击的链接。

### 根因

经复核，当前分支的 `handleGetJobDetail()` 已经存在 Boss 直聘的读取时补全逻辑：

```js
url: payload.url ||
     (payload.encryptJobId ? `https://www.zhipin.com/job_detail/${payload.encryptJobId}.html` : '') ||
     mergedJob.url || ''
```

因此这项不能直接判定为“当前代码仍缺失修复”。更准确的判断是：

1. 详情页链路的 Read-Time Polyfill 已存在
2. 如果截图里仍显示“暂无原链接”，需要先确认：
   - 截图是否来自旧版本
   - 问题是否发生在首页列表而非详情弹窗
   - 对应数据里是否连 `encryptJobId` 也不存在

Boss 直聘的岗位链接应该可以由 `encryptJobId` 拼接：

```
https://www.zhipin.com/job_detail/{encryptJobId}.html
```

`raw_payload` 中有 `encryptJobId` 字段。

### 修复方案（先复验，再决定是否补链路）

优先动作不是立刻改代码，而是先做复验：

1. 用当前分支重新打开详情弹窗，确认“查看原链接”是否仍缺失
2. 抽样检查出问题职位的 `raw_payload.encryptJobId`
3. 区分问题发生位置：
   - 若仅首页卡片缺链接，是首页列表链路未补全
   - 若详情页也缺链接，再补 `handleGetJobDetail()` 之外的数据来源

若当前分支仍复现，仍然优先采用读取时兼容，而不是数据清洗脚本。

### 影响范围

| 文件 | 位置 | 改动 |
|------|------|------|
| `controller/jobs-handler.js` | `handleGetJobDetail()` | 复验当前 Read-Time Polyfill 是否覆盖详情链路 |
| `controller/jobs-handler.js` | `handleBatchInsert()` | 如需扩大覆盖面，可在写入时补全 |
| `dashboard.js` | `renderSourceLink()` 调用点 | 区分首页与详情是否走同一 URL 来源 |

### 待讨论

1. 当前分支是否还真实复现？先确认这一点。
2. 修复应该放在写入时还是读取时？写入时补全更彻底，读取时更轻量。
2. 其他平台（51job、智联）的 URL 是否也有同样问题？
3. 是否需要写一个数据修复脚本补全历史数据的 URL？

---

## REQ-5：采集平台选择器缺少猎聘

### 现象

`dashboard.html` 中采集平台下拉框只有 4 个选项：全部、Boss直聘、前程无忧、智联招聘。猎聘被注释掉了。

### 根因

```html
<select id="crawl-platform">
  <option value="all">全部</option>
  <option value="boss" selected>Boss直聘</option>
  <option value="51job">前程无忧</option>
  <!-- 猎聘：即将支持 -->
  <!-- <option value="liepin">猎聘</option> -->
  <option value="zhaopin">智联招聘</option>
</select>
```

猎聘选项被 HTML 注释禁用了。

但 `background.js` 中全平台列表 `ALL_PLATFORMS = ['boss', '51job', 'zhaopin']` 也没有包含 `liepin`，且没有 `executeLiepinCrawl()` 方法。

### 修复方案（顾问确认：占位且禁用）

猎聘底层采集功能未实现，UI 上显示为不可选的占位选项：

```html
<option value="liepin" disabled>猎聘 (即将支持)</option>
```

这样共 5 个选项：全部、Boss直聘、前程无忧、猎聘(禁用)、智联招聘。

### 影响范围

| 文件 | 位置 | 改动 |
|------|------|------|
| `crawler/extension/dashboard.html` | `<select id="crawl-platform">` | 取消猎聘注释或显示为禁用 |
| `crawler/extension/background.js` | `ALL_PLATFORMS` | 如功能完成则加入 liepin |

---

## 顾问讨论结论

### 与顾问达成一致的决策

| 需求 | 决策 | 理由 |
|------|------|------|
| REQ-1 | 渐进式清理：先移除 UI 入口，底层逻辑暂留 | 避免耦合代码报错，影响范围最小 |
| REQ-2 | 移除 disabled，始终绑定事件，实现 toggle | 改动最小且语义正确 |
| REQ-3 | 先修正列表数据源语义，再决定是否加 DOM 即时移除 | 先解根因，再做视觉反馈 |
| REQ-4 | 先复验当前分支是否仍复现，再决定是否补首页/写入链路 | 避免对已存在修复重复施工 |
| REQ-5 | 猎聘显示为 `disabled` 占位选项 | 管理用户预期，底层未实现不应可选 |

### 分歧

无分歧。顾问方案与初始分析一致。

### 实施优先级

| 优先级 | 需求 | 改动量 |
|--------|------|--------|
| P0 | REQ-3 收藏列表语义与数据源对齐 | 中 |
| P1 | REQ-4 原链接复验与补链路 | 小到中 |
| P1 | REQ-2 收藏按钮 toggle | ~15 行改动 |
| P2 | REQ-1 视图切换器移除 | ~10 行改动 |
| P2 | REQ-5 猎聘占位选项 | 1 行改动 |

---

## 关键代码索引

| 文件 | 位置 | 说明 |
|------|------|------|
| `dashboard.js:211` | `renderViewSwitcher(total)` | REQ-1：视图切换器调用点 |
| `dashboard.js:238-248` | `renderViewSwitcher()` | REQ-1：视图切换器函数 |
| `dashboard.js:373` | `exSelectBtn` 按钮渲染 | REQ-2：收藏按钮 disabled 逻辑 |
| `dashboard.js:378-392` | `exSelectBtn` 事件绑定 | REQ-2：只绑定未收藏状态 |
| `dashboard.js:1554-1561` | `btn-cancel-select` 事件 | REQ-3：工作台取消收藏 |
| `jobs-handler.js:113` | `handleGetDeliveryList()` | REQ-3：当前列表仍读取 selected 模型 |
| `jobs-db.js:286-314` | `getSelectedJobs()` / `getFavoriteJobs()` / `toggleFavorite()` | REQ-3：selected 与 is_favorite 并存 |
| `dashboard.html:23-30` | `<select id="crawl-platform">` | REQ-5：采集平台选择器 |
| `background.js:484` | `ALL_PLATFORMS` | REQ-5：全平台列表 |
| `jobs-handler.js:59` | `url: payload.url ... encryptJobId ...` | REQ-4：当前详情链路已存在 URL 补全 |
