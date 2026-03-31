# M16 工具栏按钮状态 Bug 分析

> 创建时间：2026-03-28
> 状态：待实施
> 前置里程碑：M15（已完成 REQ-1 ~ REQ-5）

---

## 1. 目标

修复工作台简历编辑区工具栏（`res-bar`）中两类 UI 问题：

1. **按钮物理尺寸不一致** — 同一行按钮高度/宽度肉眼可见地不同
2. **激活态互斥失效** — 同一行出现多个红色按钮，应同一时刻仅一个为红色（类似 Tab 切换）

涉及两处工具栏：
- 默认工具栏（`#view-resume` 内，按钮 ID 前缀 `def-`）
- 分屏工具栏（`#splitRight` 内，按钮 ID 前缀 `sp-`）

---

## 2. 背景

### 2.1 工具栏按钮构成

工具栏（`.res-bar`）渲染 6 个按钮，各自使用不同的 CSS 变体类：

```
┌──────────────────────────────────────────────────────────────┐
│  查看       编辑         保存       AI优化    AI配置   下载   │
│  res-btn    res-btn--g   res-btn--g res-btn--ai res-btn--g  res-btn--export │
│  border:    border:      border:    border:     border:     border:          │
│  none       2px solid    2px solid  none        2px solid   none(inherit)   │
└──────────────────────────────────────────────────────────────┘
```

### 2.2 按钮角色语义

| 按钮 | 角色 | 期望行为 |
|------|------|---------|
| 查看 | 模式切换 | 点击后变红（激活），查看模式显示 HTML 渲染 |
| 编辑 | 模式切换 | 点击后变红（激活），编辑模式显示 Markdown textarea |
| 保存 | 动作按钮 | 点击执行保存，不应持久变红（可短暂闪烁反馈） |
| AI优化 | 动作按钮 | 点击触发 AI 优化流程，不应持久变红 |
| AI配置 | 面板开关 | 点击切换配置面板显隐，不应持久变红 |
| 下载简历 | 动作按钮 | 点击触发下载，不应持久变红 |

**用户期望**：只有「查看」和「编辑」作为互斥 Tab 需要持久的红色激活态。其他按钮是瞬态动作，不需要持久激活。

---

## 3. 问题分析

### 3.1 问题一：按钮大小不一致

#### 根因：`border` 差异导致盒模型尺寸不同

```css
/* 基础按钮 — 无 border */
.res-btn {
    border: none;
    padding: 7px 16px;
}

/* 黄色轮廓变体 — 有 2px border */
.res-btn--g {
    border: 2px solid var(--c-yellow);
}

/* AI 按钮 — 无 border */
.res-btn--ai {
    border: none;
}

/* 导出按钮 — 无 border（继承 base） */
.res-btn--export {
    /* 未覆盖 border */
}
```

**效果**：

| 按钮 | border 宽度 | 额外尺寸 |
|------|-----------|---------|
| 查看 (`res-btn`) | 0px | 0 |
| 编辑 (`--g`) | 4px (上下各2px) | +4px 高, +4px 宽 |
| 保存 (`--g`) | 4px | +4px 高, +4px 宽 |
| AI优化 (`--ai`) | 0px | 0 |
| AI配置 (`--g`) | 4px | +4px 高, +4px 宽 |
| 下载 (`--export`) | 0px | 0 |

带 `--g` 的3个按钮比其他3个在两个方向上各多 4px，视觉上高低不平。

#### 我的意见

这部分判断是对的，`border` 差异就是首要原因，且这是 CSS 层面的主问题，不需要优先怀疑 JS。

但这里建议把结论再收紧一点：

1. 文档里默认使用的是 `content-box` 盒模型思路。实际还应确认这些按钮是否继承了全局 `box-sizing: border-box`。  
   如果全局是 `border-box`，那么“额外尺寸 +4px”的表述不准确，但“视觉尺寸不一致”这个结论仍然成立，因为不同 border 会挤占内容区或改变按钮的最终渲染观感。

2. 仅给 `.res-btn` 加透明边框是正确方向，但要同步检查 disabled、hover、focus、active 等状态是否都沿用同一套边框宽度。  
   否则会出现“静态时一样大，hover/disabled 时又跳一下”的二次问题。

3. 如果后续还有图标按钮、loading 按钮、带 badge 按钮，也应统一复用基础类的边框占位规则，不要继续在变体类里各自决定 border 是否存在。

#### 顾问讨论意见

> Claude + 顾问联合验证 | 2026-03-28

**结论：同意上述意见，同时补充以下关键点。**

##### 1. `box-sizing: border-box` 的实际影响

代码验证结果：
- `dashboard.css` 第 24 行确实设置了全局 `box-sizing: border-box`
- **但这不消除尺寸差异**。原因：`.res-btn` 没有设置显式 `height`，浏览器使用 intrinsic sizing。对于 auto-sized 元素，`box-sizing` 只影响显式声明的 `width`/`height` 值，不影响 auto 计算时的 border 叠加

实测推算（假设 `font-size: 10px`、`line-height` 默认约 12px）：

```
.res-btn   (border: none):  7 + 12 + 7        = ~26px
.res-btn--g (border: 2px):  2 + 7 + 12 + 7 + 2 = ~30px  ← 多 ~4px
```

所以文档的 "+4px" 估算方向正确，精确值需要实际渲染后用 DevTools 确认。

##### 2. 修复方案建议补充

方案中 `.res-btn` 加 `border: 2px solid transparent` 的方向正确，但需注意：

- `.res-btn--ai` 当前也是 `border: none`（line 1571），如果只改 base 不改 `--ai`，AI 按钮也不会继承 transparent border——因为 `--ai` 显式声明了 `border: none`，会覆盖 base 的 transparent border
- **建议**：`.res-btn--ai` 改动中应移除 `border: none`，改用 `border: 2px solid var(--c-yellow)` 或 `border-color: var(--c-yellow)`，与 `--g` 保持一致的 2px 边框

##### 3. 验收时的精确测量方法

不要肉眼比，用 DevTools：
1. 在 `.res-bar` 内选中每个按钮
2. 查看 Computed 面板中的 `height` 值
3. 所有值应完全相同（误差 0px）

#### 影响范围

- `dashboard.css`：`.res-btn` (line 1148)、`.res-btn--g` (line 1166)
- 两个工具栏均受影响（`def-` 前缀和 `sp-` 前缀共用同一套 CSS）

---

### 3.2 问题二：多按钮同时红色

#### 根因 A：AI 按钮默认色就是红色

```css
/* AI 按钮的基础样式 — 始终红色 */
.res-btn--ai {
    background: var(--c-red);    /* ← 默认就是红色 */
    color: var(--c-white);
}

/* 激活态 — 也是红色 */
.res-btn--active {
    background: var(--c-red);
    color: var(--c-white);
}
```

`.res-btn--ai` 的**默认**背景色与 `.res-btn--active` 的激活色完全相同（`var(--c-red)`）。这意味着 "AI优化" 按钮在**任何状态下都显示为红色**，与真正激活的 Tab 按钮在视觉上无法区分。

#### 根因 B：排他逻辑仅覆盖 view/edit 两个按钮

```js
// dashboard.js: toggleResumeMode() — line 735-761
function toggleResumeMode(mode, viewMode = 'default') {
    const btnView = document.getElementById(`${idPrefix}-btn-view`);
    const btnEdit = document.getElementById(`${idPrefix}-btn-edit`);
    // ↑ 只获取了 view/edit 两个按钮

    if (mode === 'edit') {
        btnView.classList.remove('res-btn--active');
        btnEdit.classList.add('res-btn--active');
        // ↑ 只在 view ↔ edit 之间互斥
    } else {
        btnView.classList.add('res-btn--active');
        btnEdit.classList.remove('res-btn--active');
    }
}
```

- **保存、AI优化、AI配置、下载** 这 4 个按钮完全不参与 `toggleResumeMode()` 的排他逻辑
- 即使给这些按钮添加 `--active`，也不会被正确移除

#### 根因 C：初始渲染编辑按钮即为激活态

```js
// dashboard.js: renderResumeDualMode() — line 567
<button class="res-btn res-btn--g res-btn--active" id="${idPrefix}-btn-edit">
//                                                         ↑ 默认激活
```

页面加载后，「编辑」是红色（`--active`），「AI优化」也是红色（`--ai` 基础色），导致首屏就出现两个红色按钮。

#### 我的意见

这部分也基本成立，但根因优先级我建议调整为：

1. **第一根因是视觉语义冲突**  
   `--ai` 默认色和 `--active` 色完全相同，导致用户把“特殊按钮”误读为“当前激活按钮”。这比 JS 排他逻辑更本质。

2. **第二根因是状态模型没有文档化**  
   当前实现里实际上混用了三类状态：
   - 持久互斥态：`view/edit`
   - 瞬时动作态：`save/download/ai optimize`
   - 开关态：`AI配置`

   但样式类里只有一个 `--active` 概念，导致不同语义共用同一种颜色表达。  
   从设计上说，应该把“选中态 / 开关态 / 强强调按钮”分开命名，而不是长期让 `--ai` 和 `--active` 共享视觉语言。

3. **根因 B 不是 bug，而是当前职责边界的自然结果**  
   `toggleResumeMode()` 只处理 `view/edit`，本身没错。  
   真正的问题是如果其他按钮未来也被加上 `--active`，目前没有统一状态清理机制，会留下隐患。  
   也就是说：  
   - 现在它不是直接 bug  
   - 但它是后续维护上的风险点

4. **初始渲染不是根因，只是放大器**  
   默认“编辑”为激活态是合理的。  
   问题在于 AI 按钮默认也长得像激活态，所以首屏冲突被放大。

#### Claude + 顾问讨论意见

> 2026-03-28 | 代码验证后联合分析

**结论：同意上述意见中"根因优先级调整"的方向。补充以下验证发现。**

##### 关于"第一根因是视觉语义冲突"的验证

代码确认：
- `.res-btn--ai` (line 1568-1573): `background: var(--c-red); border: none;` — **默认红色、无 border**
- `.res-btn--active` (line 1177-1181): `background: var(--c-red); border-color: var(--c-red);` — **激活红色**

两者使用的 `var(--c-red)` 是同一个 CSS 变量（`#E62B1E`），颜色完全相同。用户无法区分"这是 AI 专属颜色"和"这是当前激活态"。

**这是 bug 的核心**——不是 JS 逻辑错误，而是 CSS 设计语义冲突。

##### 关于"状态模型没有文档化"的验证

代码确认存在三种按钮行为模式，但只用了一种红色表达：

```
状态类型    │ 按钮示例      │ 当前 CSS 类        │ 是否持久
───────────┼───────────────┼───────────────────┼─────────
持久互斥态  │ 查看/编辑     │ res-btn--active    │ 是（直到用户切换）
瞬时动作态  │ 保存/AI优化    │ (无持久态)          │ 否
开关态      │ AI配置        │ (无状态类)          │ 面板显隐
```

**风险点**：如果未来给"AI配置"加了面板展开指示（比如按钮保持某个颜色），当前只有一个 `--active` 类可用，容易复用后再次撞色。

**建议**：在文档或代码注释中声明三类状态的命名规则：
- Tab 互斥态 → `res-btn--active`
- 开关态 → `res-btn--toggled`（新增）
- 瞬态高亮 → `res-btn--flash`（新增，用于点击反馈）

##### 关于根因 B 的定位

同意"不是 bug，是维护风险点"的判断。补充：

- `toggleResumeMode()` 不处理其他按钮是**正确的职责划分**
- 但建议在函数头部加一行注释说明边界：`// 只管理 view/edit 互斥，其他按钮不参与`

##### 关于初始渲染

代码确认 `renderResumeDualMode()` (line 567) 中编辑按钮硬编码 `res-btn--active`：
```html
<button class="res-btn res-btn--g res-btn--active" id="${idPrefix}-btn-edit">
```

这是合理的默认态。问题确实只在 AI 按钮默认也是红色导致首屏冲突。

#### 影响范围

| 文件 | 位置 | 说明 |
|------|------|------|
| `dashboard.css:1568` | `.res-btn--ai` | AI 按钮默认红色 |
| `dashboard.css:1177` | `.res-btn--active` | 激活态红色（与 `--ai` 撞色） |
| `dashboard.js:735` | `toggleResumeMode()` | 排他逻辑只管 view/edit |
| `dashboard.js:1407` | `bindResumeDualModeEvents()` | 事件分发不走排他 |
| `dashboard.js:1815` | `bindSplitEvents()` | 分屏同样的问题 |

---

## 4. 修复方案

### 方案概述

| 修复项 | 做法 | 原理 |
|--------|------|------|
| 统一尺寸 | `.res-btn` 基础样式加 `border: 2px solid transparent` | 透明边框占位，所有按钮统一 2px border，尺寸一致 |
| AI 按钮降色 | `.res-btn--ai` 默认色从红色改为黑色 | 消除与 `--active` 的颜色冲突 |
| hover 保持红色 | `.res-btn--ai:hover` 仍为红色 | 交互反馈不变 |
| transition 补全 | 加 `border-color` 过渡 | 边框色变化更平滑 |

### 4.1 CSS 改动（`dashboard.css`）

#### 改动 1：`.res-btn` 基础样式（line 1148）

```css
/* BEFORE */
.res-btn {
    background: var(--c-yellow);
    color: var(--c-black);
    border: none;
    padding: 7px 16px;
    ...
    transition: background 0.15s, color 0.15s;
}

/* AFTER */
.res-btn {
    background: var(--c-yellow);
    color: var(--c-black);
    border: 2px solid transparent;      /* ← 透明占位，统一尺寸 */
    padding: 7px 16px;
    ...
    transition: background 0.15s, color 0.15s, border-color 0.15s;
}
```

#### 改动 2：`.res-btn--ai`（line 1568）

```css
/* BEFORE */
.res-btn--ai {
    background: var(--c-red);
    color: var(--c-white);
    border: none;
    position: relative;
}

.res-btn--ai:hover:not(:disabled) {
    background: var(--c-black);
    color: var(--c-yellow);
}

/* AFTER */
.res-btn--ai {
    background: var(--c-black);          /* ← 降为黑色 */
    color: var(--c-yellow);              /* ← 黄色文字 */
    border: 2px solid var(--c-yellow);   /* ← 黄色边框，与其他 --g 一致 */
    position: relative;
}

.res-btn--ai:hover:not(:disabled) {
    background: var(--c-red);            /* ← hover 变红 */
    color: var(--c-white);
}
```

#### 改动 3：`.res-btn--export`（line 1642）

```css
/* BEFORE */
.res-btn--export {
    background: var(--c-yellow);
    color: var(--c-black);
}

/* AFTER — 无需改动，已继承 base 的 transparent border */
.res-btn--export {
    background: var(--c-yellow);
    color: var(--c-black);
    border-color: var(--c-yellow);       /* ← 可选：显式黄色边框 */
}
```

#### 改动 4：`.res-btn--g`（line 1166）

```css
/* BEFORE — 不变 */
.res-btn--g {
    background: transparent;
    color: var(--c-yellow);
    border: 2px solid var(--c-yellow);
}
/* 已经是 2px，与改后的 base 一致，无需调整 */
```

### 4.2 JS 改动评估

**当前 JS 无需改动**。理由：

1. `toggleResumeMode()` 只管 view/edit 互斥 — 这是正确的，因为只有它们是 Tab 切换
2. 保存、AI优化、AI配置、下载是瞬态动作，不应持有持久激活态
3. 根因在 CSS 层面的颜色冲突，不在 JS 逻辑

#### 我的意见

这里我不同意“JS 无需改动”这个结论，至少不能下得这么绝对。

更准确的说法应该是：

- **本次 bug 的最小修复可以只改 CSS**
- **但建议顺手在 JS 层补一层状态约束，避免以后回归**

原因如下：

1. 既然文档已经明确“只有查看/编辑是持久激活态”，那这个约束不应该只存在于设计说明里，应该在代码里也能被表达。  
   否则未来有人在动作按钮点击时误加 `res-btn--active`，问题会立刻复发。

2. `AI配置` 严格来说更像“开关态”而不是纯动作态。  
   如果它未来需要表示“面板已展开”，那它就不该复用 `res-btn--active`，而应单独引入类似 `res-btn--toggled` 的状态类。  
   这个设计判断最好在本里程碑文档里提前说明。

3. 推荐的低成本 JS 防御措施：
   - 在 toolbar 初始化或 mode 切换时，显式清理非 `view/edit` 按钮上的 `res-btn--active`
   - 或者新增一个小工具函数，只允许 mode 按钮进入 `res-btn--active`

4. 如果不想在本里程碑里动 JS，文档至少应写清楚：
   - “本次不改 JS 仅因为采用最小修复策略”
   - “后续若引入按钮开关态，需要新增独立状态类，不得复用 `res-btn--active`”

如果未来需要"点击动作按钮时短暂高亮再恢复"的视觉反馈，可以在 JS 层增加短暂的 `--active` 闪烁逻辑，但当前需求未提及此项。

#### Claude + 顾问讨论意见

> 2026-03-28

**结论：同意"最小修复只改 CSS"的策略，但建议补充 JS 层的防御性约束。**

##### 顾问对 JS 是否需要改动的分档建议

| 档位 | 改动范围 | 适用场景 |
|------|---------|---------|
| **最小修复** | 只改 CSS | 本轮 bug fix，快速止血 |
| **推荐修复** | CSS + JS 防御注释 | 本轮做，避免后续维护踩坑 |
| **完整修复** | CSS + JS 状态管理 + 新状态类 | 未来需要按钮开关态/闪烁反馈时 |

##### 推荐：在 `toggleResumeMode()` 加一行防御

最低成本的 JS 防御——在函数头部加安全清理：

```js
function toggleResumeMode(mode, viewMode = 'default') {
    const idPrefix = viewMode === 'default' ? 'def' : 'sp';

    // 防御：清理非 mode 按钮上误加的 --active
    const bar = document.getElementById(`${idPrefix}-res-bar`)  // 需要给 res-bar 加 id
                || document.getElementById('splitResBar');
    if (bar) {
        bar.querySelectorAll('.res-btn--active').forEach(btn => {
            if (!btn.dataset.mode) btn.classList.remove('res-btn--active');
        });
    }
    // ... 原有逻辑
}
```

**不改动也可以，但建议在文档中记录这个决策**：
> "本轮不改 JS 仅因采用最小修复策略。后续若引入按钮开关态，需新增 `res-btn--toggled` 类，不得复用 `res-btn--active`。"

### 4.3 预期效果

修复前：
```
[ 查看 黄实 ] [ 编辑 红实(active) ] [ 保存 黄描(大4px) ] [ AI优化 红实(始终红) ] [ AI配置 黄描(大4px) ] [ 下载 黄实 ]
```

修复后：
```
[ 查看 黄实 ] [ 编辑 红实(active) ] [ 保存 黄描 ] [ AI优化 黑描 ] [ AI配置 黄描 ] [ 下载 黄实 ]
                              ↑ 唯一红色                              ↑ 黑色，hover变红
```

所有按钮高度一致（统一 2px border），同一时刻仅"编辑"为红色。

#### 我的意见

预期效果建议再补两条，否则验收容易漏：

1. **focus-visible 态**  
   键盘导航时，焦点样式不能因为统一 border 而被吃掉；如果当前项目依赖 outline 或 box-shadow，需要验收时一起看。

2. **disabled 态和 loading 态尺寸稳定**
   特别是 AI 按钮未配置、保存中、AI 优化中这类状态，必须保证不会因为边框或文案变化出现抖动。

#### Claude + 顾问讨论意见

> 2026-03-28

**结论：同意补充项，同时建议扩展验收范围到视觉回归测试。**

##### 对预期效果补充的验证

代码确认以下状态需要特别验收：

1. **AI 按钮 disabled 态** (`.res-btn--ai:disabled`)
   - 当前：`background: #444; color: #666;` (line 1580-1584)
   - 修复后：需要确认 disabled 时 border 颜色是否也从黄色变灰
   - 如果 border 保持黄色而背景变灰，会产生视觉不一致
   - **建议**：disabled 态加 `border-color: #555`

2. **AI 按钮 hover 态** (`.res-btn--ai:hover:not(:disabled)`)
   - 修复后 hover 从黑色变红色，border 颜色应同步变红
   - **建议**：hover 态加 `border-color: var(--c-red)`

3. **编辑按钮 active 态** (`.res-btn--g.res-btn--active`)
   - 已有 `border-color: var(--c-red)` (line 1180)，确认一致 ✅

##### 扩展验收矩阵

| 状态 | 查看 | 编辑 | 保存 | AI优化 | AI配置 | 下载 |
|------|------|------|------|--------|--------|------|
| 首屏默认 | 黄实 | **红实** | 黄描 | 黑描 | 黄描 | 黄实 |
| hover | 红实 | 红实 | 黄实 | **红实** | 黄实 | 红实 |
| active(点击) | 红实 | 红实 | — | — | — | — |
| disabled | — | — | — | 灰底灰字灰边框 | — | 灰底灰字 |
| loading | — | — | — | 0.7 透明 + 禁交互 | — | — |

##### 建议验收流程

1. 先用 DevTools 确认所有按钮 `offsetHeight` 一致
2. 截图对比修复前后的首屏、hover、disabled 三种状态
3. 在分屏视图（`sp-` 前缀）重复以上验证

---

## 5. 验证清单

| 验证项 | 方法 | 期望结果 |
|--------|------|---------|
| 按钮尺寸 | 浏览器 DevTools 测量 `.res-bar` 内所有按钮的 `offsetHeight` | 全部相同 |
| 唯一红色 | 页面加载后观察工具栏 | 仅"编辑"为红色 |
| AI优化默认色 | 观察"AI优化"按钮 | 黑色/深色背景，非红色 |
| AI优化 hover | 鼠标悬停"AI优化" | 变为红色 |
| Tab 切换 | 点击"查看" | "查看"变红，"编辑"变黄 |
| Tab 切换回 | 点击"编辑" | "编辑"变红，"查看"变黄 |
| 动作按钮 | 点击"保存"/"AI配置" | 不持久变红 |
| 分屏工具栏 | 打开 50/50 分屏，重复以上验证 | 同样效果 |
| disabled 态 | 未配置 AI 时观察"AI优化"按钮 | 灰色，与修复前一致 |
| AI disabled 边框 | 未配置 AI 时 DevTools 检查 border-color | 灰色边框，不是黄色 |
| AI hover 边框 | hover AI优化按钮 | border-color 变红，与背景一致 |
| focus-visible | Tab 键导航到各按钮 | 焦点轮廓可见，不被 border 遮盖 |

#### Claude + 顾问讨论意见

> 2026-03-28

**建议在原清单基础上增加 3 个验收项**（已补入上表）：

1. **AI disabled 边框色** — 防止 disabled 态出现黄边框+灰背景的视觉违和
2. **AI hover 边框色** — 确认 hover 时 border 随背景一起变红
3. **focus-visible 无损** — 确认统一 border 后键盘焦点样式不受影响

**额外建议**：如果项目有自动化截图回归工具（如 Percy、Chromatic），建议把工具栏的三种状态（默认、hover、disabled）加入快照对比，避免后续 CSS 改动引起尺寸/颜色回归。

---

## 6. 关键代码索引

| 文件 | 行号 | 内容 | 说明 |
|------|------|------|------|
| `dashboard.css` | 1148 | `.res-btn` | 基础按钮样式，需改 border |
| `dashboard.css` | 1166 | `.res-btn--g` | 黄色轮廓变体，无需改 |
| `dashboard.css` | 1177 | `.res-btn--active` | 激活态，无需改 |
| `dashboard.css` | 1568 | `.res-btn--ai` | AI 按钮，需改默认色 |
| `dashboard.css` | 1642 | `.res-btn--export` | 导出按钮，可选改 |
| `dashboard.js` | 561 | `renderResumeDualMode()` | 默认工具栏 HTML 渲染 |
| `dashboard.js` | 735 | `toggleResumeMode()` | view/edit 互斥逻辑 |
| `dashboard.js` | 1407 | `bindResumeDualModeEvents()` | 默认工具栏事件绑定 |
| `dashboard.js` | 1731 | `loadSplitRight()` | 分屏工具栏 HTML 渲染 |
| `dashboard.js` | 1815 | `bindSplitEvents()` | 分屏工具栏事件绑定 |

---

## 7. 统一后实施方案

在综合原分析、补充意见和讨论结果后，建议将本问题收敛为如下统一方案。

### 7.1 统一结论

1. **按钮尺寸不一致的主因是 border 占位不统一**
   - 这是首要问题
   - 应以 CSS 基础类修复为主

2. **多按钮同时红色的主因是视觉语义冲突**
   - `res-btn--ai` 默认红色，与 `res-btn--active` 激活红色撞色
   - JS 排他逻辑不是当前 bug 的直接根因
   - 但 JS 层缺少防御性约束，存在未来回归风险

3. **本轮采用“CSS 最小修复 + JS 决策留痕”的策略**
   - 先解决当前视觉 bug
   - 不扩大改动面
   - 但在文档中明确未来若引入开关态，不能复用 `res-btn--active`

### 7.2 统一修复方案

#### CSS 必改项

1. `.res-btn`
   - 增加 `border: 2px solid transparent`
   - 将 `transition` 补充 `border-color`

2. `.res-btn--ai`
   - 默认背景从红色改为黑色
   - 默认文字改为黄色
   - 增加黄色边框，与其他轮廓按钮在尺寸上统一

3. `.res-btn--ai:hover:not(:disabled)`
   - hover 时背景改红
   - 文字改白
   - `border-color` 同步改红

4. `.res-btn--ai:disabled`
   - 背景、文字、边框统一灰化
   - 避免出现“灰底黄边”这种状态不一致

5. `.res-btn--export`
   - 可以继续继承 base 的透明边框占位
   - 若视觉上需要一致性更强，可显式设置黄色边框

#### JS 本轮策略

1. **允许本轮不改 JS**
   - 因为当前问题可由 CSS 最小修复解决

2. **但必须记录决策边界**
   - 本轮不改 JS 仅因为采用最小修复策略
   - 后续若按钮存在“开关态”，需新增独立状态类，例如：
     - `res-btn--toggled`
   - 不得复用：
     - `res-btn--active`

3. **推荐的低成本防御性改动（可选）**
   - 在 `toggleResumeMode()` 或 toolbar 初始化时
   - 显式清理非 `view/edit` 按钮上的 `res-btn--active`
   - 这样可避免未来误用导致回归

### 7.3 统一后的视觉规范

#### 持久激活态

仅以下按钮允许持久红色：

- 查看
- 编辑

#### 瞬时动作态

以下按钮不允许持久红色：

- 保存
- AI优化
- 下载简历

#### 开关态

以下按钮若未来需要表达“已开启”，必须使用独立样式语义，不得复用激活态：

- AI配置

### 7.4 统一后的验收标准

除原文中的验证项外，最终验收以以下标准为准：

1. 所有按钮默认尺寸完全一致
2. 首屏同一时刻仅一个持久红色按钮
3. AI 按钮默认不是红色，但 hover 可变红
4. disabled 态颜色与边框语义一致
5. focus-visible 焦点样式清晰可见
6. 默认工具栏与分屏工具栏表现一致
7. 不引入 JS 交互回归

### 7.5 推荐实施顺序

1. 先改 `.res-btn` 基础边框占位
2. 再改 `.res-btn--ai` 默认色 / hover / disabled
3. 回归默认工具栏
4. 回归分屏工具栏
5. 检查 focus-visible
6. 如有回归风险，再补最小 JS 防御逻辑

### 7.6 建议的最终状态

如果全部达成统一，建议将本 workpack 的状态从：

- `待实施`

推进为：

- `方案已统一，待编码`

并以本节“统一后实施方案”作为后续实际编码和验收的唯一口径。
