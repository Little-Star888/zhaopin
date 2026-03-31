# 待讨论问题汇总：Dashboard Web UI + 多平台扩展

> 版本：0.4 | 日期：2026-03-25
> 状态：**待讨论**
> 用途：汇总所有需要与上级顾问（Aurai Advisor）讨论的未解决问题，一次性提交，避免反复拉扯

---

## 已决策事项（不在此重复讨论）

以下事项已由用户做出最终决策，不需要再讨论：

1. AI 匹配度评分：本期只做接口占位，不做真实 LLM 评分
2. 多平台技术路径：猎聘先走 Chrome 扩展 PoC，51job/智联先做可行性探测
3. UI 技术栈：纯 HTML/CSS/JS，零构建工具、零框架依赖
4. UI 物理形态：Sidecar 模式（独立全屏标签页）
5. 数据来源：Dashboard 直接调 Controller API，不经过 background.js
6. 简历存储：本地（Controller 侧）
7. 色值：用户指定的 8 个色值

> 详细决策记录和验收口径已归档到 `PROJECT_DECISIONS.md`（第 11-13 条）和 `CURRENT_PRIORITY.md`（Phase UI 部分）。

---

## 待讨论问题

### Q1：Controller 增量 API 设计

Dashboard 需要以下新 API 端点，请确认数据格式和接口设计是否合理：

| 端点 | 用途 | 待确认 |
|------|------|--------|
| `GET /api/jobs` | 分页查询岗位列表（支持 platform/city/keyword 过滤） | 分页参数、返回格式、是否复用现有 delivery_queue 还是新建表 |
| `GET /api/jobs/:id` | 单个岗位详情 | ID 是 delivery_queue 的 id 还是 platformJobId |
| `POST /api/resume` | 上传简历（multipart/form-data） | 文件大小限制、存储格式（原文件 vs base64）、存储路径 |
| `GET /api/resume` | 获取简历（返回文件内容或元信息） | 是否支持多份简历、返回格式 |
| `GET /api/jobs/:id/match` | AI 匹配度评分（占位） | 当前返回 `{matchStatus: "not_ready"}` 即可 |
| `POST /api/jobs/:id/select` | 选中岗位加入待投递列表 | 待投递列表是独立表还是 delivery_queue 加标记 |

**核心问题**：现有 `delivery_queue` 表是投递队列（状态驱动），Dashboard 展示的是"已采集岗位"（浏览驱动）。这两个是否应该分开？还是复用同一张表加查询过滤？

**我的意见**：

- 不建议直接复用 `delivery_queue` 承担 Dashboard 主列表。两者语义不同：`delivery_queue` 是流程队列表，Dashboard 首页是浏览/筛选视图，后续还会挂接平台、匹配状态、选中状态、简历关联等前台字段，强行复用会让状态语义越来越混乱。
- 当前阶段建议采用“轻量分层”而不是大重构：保留 `delivery_queue` 继续承担投递流程；新增一个面向展示的岗位表/镜像表，或先用现有明细来源做只读聚合 API，但不要把“已采集岗位”和“待投递状态”硬塞进同一套状态字段。
- `GET /api/jobs/:id` 建议使用系统内部主键；`platformJobId` 作为平台侧外键保留，避免跨平台 ID 规则不一致。
- `POST /api/resume` 建议存原文件，不要存 base64；返回元信息即可。base64 会徒增体积，也不利于后续在线编辑与版本管理。
- `GET /api/resume` 建议先只支持单份“当前生效简历”，接口返回元信息；多份简历留到下一阶段，否则 UI 和数据模型都会扩范围。
- `GET /api/jobs/:id/match` 当前就返回占位结构即可，但建议把未来字段一次定死，例如 `matchStatus`、`matchScore`、`matchReason`，避免后面 UI 二次返工。
- `POST /api/jobs/:id/select` 不建议在 `delivery_queue` 上直接打补丁式加标记，最好有独立的“selection”语义层；如果为了加速落地必须复用，也要把字段命名成前台选择语义，不要混进投递状态字段。

---

### Q2：Dashboard 主页 Bento Grid 布局细节

用户要求"卡片大小要有对比"，请确认布局策略：

- **大卡片**（跨 2 列）：哪些信息放这里？热门岗位？高匹配度岗位？
- **标准卡片**（1 列）：默认岗位卡片
- **布局方式**：CSS Grid `grid-template-areas` 手动定义区域，还是 `auto-fit` 自动填充？
- **响应式**：是否需要适配不同窗口宽度？Dashboard 是全屏标签页，是否可以假设最小 1280px？

**卡片内容**：岗位名称、城市、平台标识、关键词标签、AI 匹配度标签。其中平台标识用什么样式（色点？图标？文字标签？）

**我的意见**：

- Bento Grid 的重点不是“随机大小”，而是“有明确主次”。主页建议固定少量大卡片，其余走标准卡片，不要做瀑布流式不确定布局。
- 大卡片不应该绑定“高匹配度”，因为本期 AI 评分还没做；更稳妥的是绑定“最近入库”或“用户已关注/已选中”的岗位，避免占位字段反客为主。
- 布局方式建议优先用 CSS Grid 的明确列规则，桌面端做受控布局，移动/窄屏再降级。不要一开始就靠 `auto-fit` 自动填充，否则“卡片大小要有对比”这件事很难稳定复现。
- 不建议假设最小宽度 1280px。既然是全屏标签页，也应该兼容至少 1024px 这一档，否则窗口半屏时会很难看。
- 平台标识建议先用“文字标签 + 固定色值”，不要上图标体系。原因很简单：零构建、零框架下，文字标签最稳，识别成本也最低。
- AI 匹配度标签本期只做占位，视觉上要弱于岗位主信息，避免用户误以为真的有评分结果。

---

### Q3：Glassmorphism 浮窗具体参数

用户要求"高斯模糊要强" + "叠加淡淡的白色噪点纹理"，请确认：

- `backdrop-filter: blur()` 值：建议 24px-40px，是否合理？
- 背景透明度：rgba(43, 44, 48, 0.6) 还是更低？
- 噪点纹理实现：SVG filter（`feTurbulence`）vs CSS 伪元素叠加噪点图片？
- 浮窗关闭方式：点击遮罩关闭？ESC 关闭？还是都有？
- 浮窗内容：岗位名称、地点、岗位详情（完整 JD）、平台、跳转链接。是否需要"加入待投递"按钮？

**我的意见**：

- `blur()` 建议从 24px 左右起步，不要一上来冲到 40px。过强模糊容易把内容层次打散，也会增加性能压力，尤其多个浮层叠加时更明显。
- 背景透明度建议先偏保守，保证可读性优先于“仙气”。如果底图和卡片内容都偏复杂，透明度过低会直接影响阅读。
- 噪点纹理优先建议用 CSS 伪元素叠加轻量噪点资源，不建议这期上 SVG `feTurbulence`。后者更“纯技术正确”，但实现和调参成本高，不适合当前零框架快速落地。
- 关闭方式建议同时支持遮罩点击和 `ESC`。这属于基本可用性，不值得省。
- 浮窗里建议直接放“加入待投递”按钮，因为这是从浏览页到操作页的最短路径；否则用户要回列表页再操作，交互会断。
- 浮窗不要承载过多编辑能力，当前只做查看详情 + 选择动作即可，避免它变成第二套页面。

---

### Q4：第二页（简历 + 待投递）交互设计

用户描述的第二页布局：

- **左侧**：简历展示 + 上传按钮（右下方）
- **右侧**：选中的待投递岗位列表

请确认交互细节：

- 岗位选中流程：主页点击卡片 → 自动加入右侧列表？还是需要手动点击"加入"？
- 岗位展开：右侧列表点击卡片后展开详情，是用内联展开（accordion）还是弹窗？
- 简历修改："用户可根据岗位修改简历"具体是什么意思？上传一份简历后可以针对不同岗位生成不同版本？还是纯文本编辑？
- "AI 辅助"按钮：用户说"可拓展"，本期是显示一个灰色占位按钮，还是直接不显示？

**我的意见**：

- 岗位选中流程建议是“主页点击进入详情，详情里明确点击加入”。不要做成点击卡片就自动加入，否则误操作率会很高。
- 右侧列表的岗位详情建议优先用内联展开，而不是再开弹窗。第二页本来就是操作页，再套浮窗会让信息层级过深。
- “用户可根据岗位修改简历”这句话，本期不要过度解读为多版本简历生成。当前更合理的落点是：先支持上传一份主简历，并预留后续在线编辑入口。
- 如果现在就做“按岗位生成不同版本简历”，那就等于把 AI、模板、版本管理一起带进来了，明显超出本期范围。
- “AI 辅助”按钮建议显示为灰色占位，并附上明确文案如“后续开放”。直接不显示会让界面缺少扩展预期，也不利于后续接入口。

---

### Q5：manifest.json 多平台权限配置

当前 manifest.json 只有 `zhipin.com`，扩展到四平台需要改动：

```json
{
  "host_permissions": [
    "https://www.zhipin.com/*",
    "https://www.liepin.com/*",      // 新增
    "https://open.feishu.cn/*"
  ],
  "content_scripts": [
    {
      "matches": ["https://www.zhipin.com/*"],
      "js": ["content.js"]
    }
    // 猎聘的 content_script 是在这里加，还是单独一个条目？
  ]
}
```

**核心问题**：猎聘的 content script 是在 manifest.json 的 `content_scripts` 中注册（按 URL 自动注入），还是通过 `chrome.scripting.executeScript` 由 background.js 动态注入？前者更简单但需要页面加载时就注入，后者更灵活但需要 background.js 改动。

**我的意见**：

- 结合当前“Boss-first、尽量少改背景链路”的原则，猎聘第一阶段优先走 `content_scripts` 静态注册。这样改动面最小，也更符合现有扩展结构。
- 动态注入适合后面做更细的权限收缩或按需执行，但那是第二阶段优化，不是当前 PoC 的最短路径。
- manifest 里建议每个平台独立一个条目，不要把多个平台脚本混在同一个条目里。这样后续排查、灰度和禁用单平台更清晰。
- `host_permissions` 也建议按实际 PoC 平台逐步加，不要为了“未来四平台”一次全开，避免权限面无意义扩大。

---

### Q6：background.js 平台路由最小改动方案

当前 background.js 的 `claimAndProcessTask` 完全是 Boss 逻辑。需要最小改动支持多平台：

**方案 A：配置字典 + 条件分支**
```javascript
// 在 CONFIG 中添加
PLATFORM_CONFIG = {
  boss: { startUrl: 'https://www.zhipin.com/web/geek/job', ... },
  liepin: { startUrl: 'https://www.liepin.com/zhaopin/', ... }
}

// 在任务处理中
const platform = task.platform || 'boss';
const config = PLATFORM_CONFIG[platform];
```

**方案 B：策略模式**
```javascript
const strategies = { boss: new BossStrategy(), liepin: new LiepinStrategy() };
const strategy = strategies[task.platform || 'boss'];
await strategy.execute(task);
```

**核心问题**：方案 A 改动最小但 background.js 会越来越臃肿，方案 B 更干净但引入抽象层。考虑到"不激进重构"原则，是否接受方案 A 作为过渡，等第三平台接入后再考虑方案 B？

**我的意见**：

- 我支持方案 A 作为过渡，但前提是“按平台收口到配置和少量函数”，不是简单堆 `if/else`。
- 当前代码还在 Boss 主链路稳定阶段，直接引入策略类抽象有设计正确性，但不一定有交付收益，容易把 PoC 做成重构。
- 更稳妥的做法是：先做 `platform -> config/handler` 的轻量路由，把平台差异集中在少数入口函数里；等猎聘跑通、第三平台确定接入时，再评估是否升级成策略模式。
- 也就是说，现在要的是“可演进结构”，不是“一次设计到位”。避免为了未来三平台，把当前一平台半的复杂度提前支付掉。

---

### Q7：各平台城市代码映射

Boss 使用天气网城市代码（101010100=北京），其他平台的城市编码体系完全不同。

- 猎聘的城市编码是什么格式？
- 51job 的城市编码是什么格式？
- 智联的城市编码是什么格式？
- 是否应该在 Controller 端维护一个"统一城市名 → 各平台城市代码"的映射表？

**核心问题**：用户提交任务时输入"北京"，Controller 需要根据目标平台转换成对应的平台城市代码。这个转换应该在哪一层做？Controller 端统一转换？还是各平台 content script 各自转换？

**我的意见**：

- 城市名到平台代码的转换应放在 Controller 端统一做，不建议散落到各平台 content script。
- 原因很直接：任务是从 Controller 发出的，平台参数也应在 Controller 侧被标准化；否则同一个“北京”会在不同脚本里各自维护映射，后期很难对齐。
- content script 更适合处理“页面执行”和“平台内细节抓取”，不适合承担跨平台基础字典管理。
- 建议尽早建立一层统一映射表，哪怕一开始只覆盖 Boss + 猎聘，也比把规则埋进脚本里要稳。

---

### Q8：猎聘页面结构和 API 分析

在开始猎聘 PoC 之前，需要确认：

- 猎聘是否有类似 Boss 的内部 JSON API（`/wapi/...`），可以直接调用获取结构化数据？
- 还是只能通过 DOM 解析获取数据？
- 猎聘的登录态是通过 cookie 维护还是 token 维护？
- 猎聘的反爬机制强度如何？（是否有验证码、频率限制、IP 封禁？）
- 猎聘搜索结果最多返回多少条？是否有分页参数？

**如果无法获取以上信息，是否应该先做一轮手动页面分析再讨论方案？**

**我的意见**：

- 是，必须先做一轮手动页面分析，再决定 PoC 代码怎么写。这个问题不适合纸面推演。
- 当前仓库里已经是明确的 Boss 扩展链路，猎聘如果要接入，首先需要确认它是“API 优先”还是“DOM 优先”；这一点不看页面和请求流，讨论再多都不稳。
- 建议把猎聘 PoC 切成两个小步骤：先做页面/请求分析记录，再做最小抓取实验。不要直接开写完整 content script。
- 另外，文档里如果还引用不存在于当前仓库的 Python 爬虫骨架路径，建议后续删掉或改成“待验证能力”，避免文档与代码现实脱节。

---

### Q9：文档体系待同步项

以下文档需要同步更新以反映新决策，请确认是否有遗漏：

| 文档 | 需要更新的内容 | 状态 |
|------|----------------|------|
| `CURRENT_PRIORITY.md` | 移除"不要做前台工作台"，增加 Phase UI | 已完成 |
| `PROJECT_PRODUCT_STATUS.md` | 增加 Phase UI 状态和未完成项 | 已完成 |
| `PROJECT_DECISIONS.md` | 增加第 11-13 条决策 | 已完成 |
| `docs/READING_BY_STAGE.md` | Phase UI 和角色路径 | 已完成 |
| `PROJECT_PRD.md` | 1.7 节增加分歧文档入口 | 已完成 |
| `PROJECT_MASTER_HANDOFF.md` | 是否需要提及 Dashboard UI？ | **待确认** |
| `docs/ARCHITECTURE.md` | 是否需要更新架构图反映 Sidecar 模式？ | **待确认** |
| `docs/FRONTEND_ENTRY.md` | 是否需要增加 Dashboard 的入口说明？ | **待确认** |
| `docs/BACKEND_ENTRY.md` | 是否需要增加 Controller 增量 API 说明？ | **待确认** |

**我的意见**：

- 这四个文档里，`PROJECT_MASTER_HANDOFF.md` 和 `docs/BACKEND_ENTRY.md` 应该优先更新，因为它们直接影响后续接手人理解入口和新增 API 边界。
- `docs/FRONTEND_ENTRY.md` 也建议补，但可以在 Dashboard 文件结构定下来之后再写，避免先写空入口。
- `docs/ARCHITECTURE.md` 是否更新取决于你们是否已经确定 Sidecar 模式会进入稳定架构，而不是试验性实现；如果只是当前阶段新增 UI，可先在 handoff 和 entry 文档体现，不急着改总架构图。
- 总体原则是：优先更新“影响开发入口和交接”的文档，架构总图类文档可以稍后。

---

## 顾问协作备忘

与上级顾问讨论时注意以下事项：

1. **信息一次性给全**：顾问无法读取上传文件，所有需要的信息必须压缩为结构化摘要（500 字以内）直接写入 `answers_to_questions`
2. **不要反复提供同一信息**：如果顾问索要已提供的信息，直接告诉它"已在上下文中"
3. **采纳架构方向，校验实现细节**：顾问的架构建议可信，但行号、色值、API 等细节需本地验证
4. **主动收边界**：顾问倾向于扩大范围，每次讨论后对照用户原始需求裁剪
5. **框架引入倾向**：已明确"零构建工具、零框架依赖"，顾问如果再推 React/Vue 直接拒绝

---

## 关联文档

- 产品总纲：`PROJECT_PRD.md`
- 当前优先级：`CURRENT_PRIORITY.md`
- 产品状态：`PROJECT_PRODUCT_STATUS.md`
- 决策记录：`PROJECT_DECISIONS.md`
- 分阶段阅读：`docs/READING_BY_STAGE.md`
- 多平台 PRD：`MULTI_PLATFORM_PHASE_PRD.md`
- 统一职位模型：`UNIFIED_JOB_MODEL_DRAFT.md`
- 接口草案：`ADAPTER_EXECUTOR_INTERFACE_DRAFT.md`
