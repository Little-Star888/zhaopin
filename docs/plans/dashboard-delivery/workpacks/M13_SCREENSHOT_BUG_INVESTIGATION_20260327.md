# M13 截图 Bug 排查报告

> 排查时间：2026-03-27
> 排查对象：Dashboard 首页、工作台收藏列表、收藏接口、后端可用性与生命周期
> 文档目的：汇总截图问题、补充新增 UI 需求、明确短期修复与长期架构边界

---

## 1. 结论摘要

本轮截图问题可归为 5 个独立项：

| # | 问题 | 严重程度 | 结论 |
|---|------|---------|------|
| BUG-1 | 首页卡片错误显示收藏按钮 | 中 | 根因已定位，属于前端渲染冗余 |
| BUG-2 | 收藏/取消收藏统一报 `MISSING OR INVALID ID` | 高 | 根因已定位，属于后端路径解析错误 |
| BUG-3 | 后端未启动时 Dashboard 容易呈现空白态 | 高 | 根因已定位，属于可用性兜底不足 |
| BUG-4 | 后端生命周期不受 Web UI 控制 | 中 | 属于架构能力缺失，不应混入本次小修 |
| BUG-5 | 工作台收藏列表标题黑块 + 取消收藏按钮遮挡文本 | 中 | 根因已定位，属于工作台 DOM/CSS 布局问题 |

本轮建议：

1. `BUG-2` 必须作为 P0 立即修复，否则收藏链路整体不可用。
2. `BUG-1` 与 `BUG-5` 可合并进收藏工作台相关工作包，一次性收敛收藏交互与视觉问题。
3. `BUG-3` 应在 M13 内补上可用性兜底，但不引入额外状态检测链路，只在现有失败分支内渲染明确引导与重试入口。
4. `BUG-4` 不应伪装成小改动，建议单列后续里程碑处理。

### 1.1 方案裁剪结论

结合顾问意见与代码现状，M13 应遵循“效果优先、结构最小化”的裁剪原则：

1. `BUG-1`、`BUG-2` 直接采用顾问方案，不需要再扩展设计。
2. `BUG-5A` 采用“保留节点，但按数量切换 `display`”的方案，收益和风险比最好。
3. `BUG-5B` 采纳顾问的“小包一层 + 右侧操作区”思路，但补上最小必要的结构约束：
   - 信息区单独包裹，确保文本和按钮有明确边界
   - 操作区禁止压缩，并固定右侧对齐
   - 信息区允许收缩，必要时加 `min-width: 0`
   这样仍属于小改动，但比单纯调 `margin` 或只加 `space-between` 更稳。
4. `BUG-3` 采纳顾问的“直接在 `catch` 中兜底”方向，但不建议把一整段带内联样式的 HTML 硬编码进错误分支。更合适的做法是：
   - 在 `dashboard.js` 增加一个小型渲染 helper
   - 复用现有 `.empty-state`，补一个轻量 modifier class
   - 保留“启动提示 + 刷新重试”两项核心信息
   这样不引入新页面、不改 Popup 链路，也不会把样式碎片塞进逻辑代码。

---

## 2. 用户需求汇总

结合已有截图与本轮补充，当前明确需求如下：

1. 首页卡片不应展示收藏按钮，收藏入口只应出现在详情弹窗、工作台或 50/50 分屏等正确位置。
2. 收藏与取消收藏必须可用，不能再出现 `MISSING OR INVALID ID`。
3. 工作台“收藏列表”标题旁不应出现多余黑色方块。
4. 收藏列表中的“取消收藏”按钮不得遮挡岗位标题、公司名、地点等文本。
5. 收藏列表中的“取消收藏”按钮应位于卡片图块最右侧，并与上、下、右边框保持明确留白。
6. 后端未启动时，Dashboard 不应只显示空白区域，应展示清晰的引导页和重试入口。
7. 长期目标是：从扩展打开 Web UI 时后端自动启动，并在 UI 未关闭期间保持存活。

---

## 3. BUG-1：首页卡片不应显示收藏按钮

### 3.1 现象

首页岗位卡片右下角出现 `★ 收藏` / `☆ 取消收藏` 按钮。该入口不符合当前交互要求。

### 3.2 根因

**文件**：`crawler/extension/dashboard.js`

`renderJobCard()` 在首页卡片渲染阶段直接输出了收藏按钮：

```js
const isFav = job.is_favorite || false;
const starClass = isFav ? 'card__star card__star--active' : 'card__star';
const starChar = isFav ? '☆' : '★';

<button class="${starClass}" data-fav-id="${job.id}" ...>
```

同时首页点击事件还专门绑定了 `.card__star` 的拦截与切换逻辑，因此这是完整实现，而不是偶发样式残留。

### 3.3 修复方案

删除首页卡片中的收藏按钮及其配套事件处理，仅保留以下正确入口：

- 详情弹窗中的 `exSelectBtn`
- 工作台收藏列表中的取消收藏操作
- 50/50 分屏中的取消收藏操作

### 3.4 影响范围

| 文件 | 位置 | 改动 |
|------|------|------|
| `crawler/extension/dashboard.js` | `renderJobCard()` | 删除首页收藏按钮 HTML |
| `crawler/extension/dashboard.js` | `handleFavoriteToggle()` | 删除仅供首页卡片使用的逻辑 |
| `crawler/extension/dashboard.js` | `bindCardClickEvents()` | 删除 `.card__star` 点击拦截 |

---

## 4. BUG-2：收藏/取消收藏报 `MISSING OR INVALID ID`

### 4.1 现象

截图中首页收藏、工作台取消收藏、分屏取消收藏均会提示：

```text
MISSING OR INVALID ID
```

### 4.2 根因

**文件**：`controller/jobs-handler.js`

当前实现：

```js
const id = Number(url.pathname.split('/').filter(Boolean).pop());
```

对于路径 `/api/jobs/123/favorite`，`pop()` 取到的是 `'favorite'`，不是 `'123'`。结果：

- `Number('favorite')` 得到 `NaN`
- `if (!id)` 命中
- 返回 400 `Missing or invalid id`

这会导致所有收藏与取消收藏请求统一失败。

### 4.3 修复方案

至少做两步：

```js
const parts = url.pathname.split('/').filter(Boolean);
const id = Number(parts[parts.length - 2]);
```

并将校验从宽松的 `if (!id)` 调整为显式正整数校验，避免把 `0`、`NaN`、非整数混为一类。

### 4.4 影响范围

| 文件 | 位置 | 改动 |
|------|------|------|
| `controller/jobs-handler.js` | `handleToggleFavorite()` | 修正 ID 解析 |
| `controller/jobs-handler.js` | `handleToggleFavorite()` | 强化非法 ID 校验 |

---

## 5. BUG-3：后端未启动时 Dashboard 空白态不可用

### 5.1 现象

从扩展打开 Dashboard 时，如果 Controller 没有运行，页面容易出现空白区域，仅通过 toast 提示错误，缺少明确引导。

### 5.2 根因

当前链路是：

```text
popup.js openDashboard()
→ 直接打开 dashboard.html
→ dashboard.js loadJobs()
→ dashboard-api.js request()
→ fetch('http://127.0.0.1:7893/api/jobs')
→ Controller 未运行
→ TypeError
→ 转译为“后端未启动，请先启动 Controller”
→ 首页容器仅渲染空 empty-state
```

问题不在于“请求没报错”，而在于错误呈现过弱：

- `popup.js` 打开 Dashboard 前不检查后端状态
- `dashboard.js` 报错后只留下空态容器
- 页面没有内嵌启动指引和重试操作

### 5.3 修复方案

短期只做可用性补强，不碰自动启动架构，也不新增 `/status` 预检查链路。

推荐方案：

1. 保持 `loadJobs()` 现有数据请求入口不变，继续以 `fetchJobs()` 作为唯一首屏依赖
2. 在 `catch` 分支内把当前空白 `empty-state` 改成“明确可操作的失败态”
3. 失败态至少包含：
   - “后端未启动或连接失败”标题
   - “请先在终端运行 `npm run start`”提示
   - “刷新页面重试”按钮
4. 样式不要写成大段内联 HTML，建议复用现有 `.empty-state` 并补一个专用 class，例如 `.empty-state--backend`

这样能以最小改动解决“空白页无指引”的核心问题，同时避免为了兜底再引入第二条状态检测路径。

### 5.4 结论

`BUG-3` 是 M13 内可落地的小修，但它解决的是“体验兜底”，不是“自动启动后端”。

同时应明确裁剪边界：

- 不做 `/status` 预探测
- 不改 `popup.js openDashboard()` 打开链路
- 不做独立引导页组件
- 不做 Popup 层提前拦截

本次只修“用户进入后能看懂发生了什么，并且知道下一步怎么做”。

---

## 6. BUG-4：后端生命周期管理缺失

### 6.1 用户期望

用户明确期望：

1. 从扩展打开 Web UI 时，后端自动启动
2. 只要 Web UI 没关闭，后端就不应退出
3. 只有“未进行爬虫”且“Web UI 已关闭”时，后端才允许关闭

### 6.2 当前状态

当前架构不具备这些能力：

- Chrome 扩展本身不能直接 `spawn` 本地 Node.js 进程
- 代码中不存在 Native Messaging Host 集成
- 扩展与 Controller 之间没有“UI 存活即进程存活”的绑定机制

### 6.3 结论

这不是一个前端补丁问题，而是一个本地进程托管架构问题。要实现完整诉求，通常需要：

1. Native Messaging Host 或等价本地代理
2. UI 与本地进程的长连接或心跳
3. Controller 存活状态与爬虫状态联动
4. 关闭 UI 后的优雅退出策略

### 6.4 建议

将 `BUG-4` 单列为独立里程碑，不与 M13 的截图修复混做。

---

## 7. BUG-5：工作台收藏列表标题黑块 + 取消收藏按钮遮挡文本

### 7.1 现象

本轮新增截图确认了两个工作台 UI 问题：

1. “收藏列表”标题后方出现了一个黑色方块
2. 收藏卡片中的“取消收藏”按钮会遮挡岗位文本，不满足可读性要求

用户新增要求：

- 去掉“收藏列表”一词旁边的黑色方块
- “取消收藏”按钮必须位于岗位卡片图块最右侧
- 按钮与上、下、右边框之间要保持明确距离
- 按钮不能遮挡任何文字内容

### 7.2 根因 A：标题黑块

**文件**：`crawler/extension/dashboard.js`、`crawler/extension/dashboard.css`

标题模板是：

```html
<h3 class="ws-del__title">收藏列表 <span id="delivery-count" class="ws-del__count"></span></h3>
```

而 `.ws-del__count` 样式默认带黑底浅字：

```css
.ws-del__count {
  background: var(--c-black);
  color: var(--c-paper);
  padding: 2px 8px;
}
```

当计数为空字符串时，`span` 依然存在，并保留背景与 padding，于是视觉上变成一个黑色方块。

### 7.3 修复方案 A：标题黑块

这里采用顾问建议的更轻量方案，不改模板结构：

1. 保留 `delivery-count` 节点
2. 在更新计数时同步控制显示状态

参考口径：

```js
countEl.textContent = jobs.length > 0 ? `${jobs.length}` : '';
countEl.style.display = jobs.length > 0 ? 'inline-block' : 'none';
```

原因：

- 只改现有赋值逻辑即可，改动最小
- 不需要回退到“延迟渲染节点”或改模板拼接
- 可以稳定消除空字符串 + padding + 背景导致的黑块

### 7.4 根因 B：取消收藏按钮遮挡文本

**文件**：`crawler/extension/dashboard.js`、`crawler/extension/dashboard.css`

当前收藏列表项结构中，按钮位于详情区块的普通文流内：

```html
<div class="delivery-detail__actions">
  <button class="btn-cancel-select" ...>取消收藏</button>
  <button class="btn-ai-match" ...>AI 智能匹配</button>
</div>
```

现有样式只是简单 `display: flex`：

```css
.delivery-detail__actions {
  display: flex;
  gap: 8px;
  margin-top: 4px;
}
```

这说明当前布局没有建立“文本区”和“操作区”的明确边界，也没有为右侧按钮预留稳定空间。在卡片高度、文本行数、主题配色和 hover 状态叠加后，容易出现按钮压住视觉文本区域的问题。

### 7.5 修复方案 B：取消收藏按钮布局

这里不建议做完整“两列重构”，因为当前问题本质是“详情区缺少信息区/操作区边界”，不是复杂栅格失效。

推荐方案是顾问方案的增强版，仍保持小改动：

1. `renderDeliveryItem()` 中把薪资/经验/学历包进单独的信息区容器，例如 `delivery-detail__info`
2. `ws-item-detail` 保持现有详情区语义，但改为：
   - `display: flex`
   - `justify-content: space-between`
   - `align-items: flex-start`
   - `gap: 16px`
3. 信息区设置 `flex: 1; min-width: 0;`
4. 操作区 `delivery-detail__actions` 设置：
   - `flex-shrink: 0`
   - `margin-top: 0`
   - `justify-content: flex-end`
   - 必要时允许纵向堆叠或换行，但不能侵入文本区

这样做的理由是：

- 改动量接近顾问方案，没有升级成完整布局重做
- 比单纯 `space-between + flex-end` 更稳，因为补上了信息区可收缩、操作区不可压缩这两个关键约束
- 更容易满足“按钮在最右侧、与边框有留白、不遮挡文本”三个视觉要求

### 7.6 影响范围

| 文件 | 位置 | 改动 |
|------|------|------|
| `crawler/extension/dashboard.js` | 工作台标题模板 | 去掉空计数黑块来源 |
| `crawler/extension/dashboard.js` | `renderDeliveryItem()` | 调整收藏列表项 DOM 结构 |
| `crawler/extension/dashboard.css` | `.ws-del__count` | 增加空值隐藏或延迟显示策略 |
| `crawler/extension/dashboard.css` | `.delivery-detail__actions` 等 | 调整按钮右侧布局与留白 |

---

## 8. 修复优先级与归属建议

| 优先级 | BUG | 归属建议 | 说明 |
|--------|-----|---------|------|
| P0 | BUG-2 收藏 ID 解析错误 | 合并到 `M13-N4-WP2` | 不修复则收藏链路全部失效 |
| P1 | BUG-1 首页卡片收藏按钮 | 合并到 `M13-N4-WP2` | 与收藏入口收敛属于同一类修复 |
| P1 | BUG-5 工作台标题黑块 | 合并到 `M13-N4-WP2` 或其子任务 | 属于收藏工作台展示修复 |
| P1 | BUG-5 工作台取消收藏按钮遮挡文本 | 合并到 `M13-N4-WP2` 或其子任务 | 属于收藏工作台布局修复 |
| P1 | BUG-3 后端失败态引导与重试 | 新增独立工作包 | 属于 Dashboard 可用性补强 |
| P2 | BUG-4 后端生命周期管理 | 独立后续里程碑 | 属于架构升级 |

建议归并方式：

1. `M13-N4-WP2` 负责收藏能力本身与收藏列表 UI 收口：
   - 修 BUG-1
   - 修 BUG-2
   - 修 BUG-5
2. 新增一个工作包负责 Dashboard 后端可用性兜底：
   - `loadJobs()` 失败态引导
   - 启动命令提示
   - 重试按钮
   - 失败态样式补强
3. `BUG-4` 只在报告内记录，不在本轮承诺交付。

---

## 9. 建议的文档口径

为了避免后续误解，这份报告建议统一口径为：

- `BUG-1`、`BUG-2`、`BUG-5`：当前版本应修，属于截图可直接复现问题
- `BUG-3`：当前版本应补兜底，但目标是“避免空白页”，不是“自动启动后端”，也不是“新增一套状态探测流程”
- `BUG-4`：记录为长期架构诉求，不作为 M13 的验收前提

---

## 10. 关键代码索引

| 文件 | 关键位置 | 说明 |
|------|---------|------|
| `crawler/extension/dashboard.js` | 首页 `renderJobCard()` | BUG-1：首页卡片错误渲染收藏按钮 |
| `crawler/extension/dashboard.js` | `handleFavoriteToggle()` | BUG-1：首页收藏事件处理 |
| `crawler/extension/dashboard.js` | `bindCardClickEvents()` | BUG-1：首页 `.card__star` 拦截 |
| `controller/jobs-handler.js` | `handleToggleFavorite()` | BUG-2：收藏接口 ID 解析错误 |
| `crawler/extension/dashboard-api.js` | `request()` | BUG-3：后端不可达时报错转换 |
| `crawler/extension/dashboard.js` | `loadJobs()` | BUG-3：报错后页面仅显示空态 |
| `crawler/extension/dashboard.js` | 工作台标题模板 | BUG-5：空计数节点导致黑块 |
| `crawler/extension/dashboard.js` | `renderDeliveryItem()` | BUG-5：收藏列表操作区结构 |
| `crawler/extension/dashboard.css` | `.ws-del__count` | BUG-5：标题黑块的直接样式来源 |
| `crawler/extension/dashboard.css` | `.ws-item-detail` / `.delivery-detail__actions` | BUG-5：信息区与按钮区的布局边界 |
