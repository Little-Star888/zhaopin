# 工作包 M5-N1-WP3：Boss 专用逻辑边界标注

> 目标：标注当前代码中 Boss 专用逻辑，为后续抽象提供边界参考
> 角色：文档
> 预估改动量：新增 1 个 Markdown 文件（~250 行）

## 1. 前置条件

- M5-N1-WP2 通过（Adapter/Executor 接口已定义）

## 2. 读文件（执行前必读）

| 文件 | 读取目的 |
|------|---------|
| `crawler/extension/content.js` | Boss 页面抓取逻辑 |
| `crawler/extension/background.js` | 扩展后台逻辑 |
| `controller/jobs-handler.js` | 后端职位 API |
| `controller/db.js` | 数据库 schema |
| `docs/plans/ADAPTER_EXECUTOR_V2.md` | WP2 产出的接口文档 |

## 3. 标注方法

### 3.1 标注格式

在代码文件中，使用以下注释格式标注 Boss 专用逻辑：

```javascript
// [BOSS_ONLY: P0] — Boss 专用，阻塞主流程抽象
// [BOSS_ONLY: P1] — Boss 专用，可降级处理
// [BOSS_ONLY: P2] — Boss 专用，边缘场景
// [SHARED] — 多平台共享，无需抽象
```

### 3.2 优先级判断标准

| 优先级 | 含义 | 抽象时机 | 示例 |
|--------|------|---------|------|
| **P0** | 阻塞主流程，必须抽象 | Phase C 之前 | CSS 选择器、URL 模式、字段映射 |
| **P1** | 影响功能但可降级 | Phase C 期间 | 特定错误处理、反爬策略 |
| **P2** | 边缘场景，低优先级 | Phase D | 日志格式、调试代码 |

### 3.3 识别方法

执行者通过以下方式识别 Boss 专用逻辑：
1. **硬编码字符串搜索**：`grep -n 'zhipin\|boss\|bossZhipin'` 找出包含平台名称的位置
2. **CSS 选择器搜索**：`grep -n 'querySelector.*\.'` 找出 DOM 操作
3. **URL 模式搜索**：`grep -n 'url.*zhipin\|hostname.*zhipin'` 找出 URL 匹配
4. **字段映射搜索**：`grep -n 'jobName\|companyName\|platformJobId'` 找出字段硬编码

## 4. 产出模板（执行者必须按此结构产出）

```markdown
# Boss 专用逻辑边界

> 日期：YYYY-MM-DD | 基于：Adapter/Executor 接口 V2

## 1. 标注概览

| 文件 | P0 标注数 | P1 标注数 | P2 标注数 | SHARED 标注数 |
|------|---------|---------|---------|--------------|
| content.js | ... | ... | ... | ... |
| background.js | ... | ... | ... | ... |
| jobs-handler.js | ... | ... | ... | ... |
| db.js | ... | ... | ... | ... |

## 2. P0 标注详情（阻塞主流程）

### 2.1 content.js

| 行号范围 | 逻辑描述 | 硬编码内容 | 抽象建议 |
|---------|---------|-----------|---------|
| ... | ... | ... | ... |

### 2.2 background.js

（同上格式）

## 3. P1 标注详情（可降级处理）

（同上格式）

## 4. 共享代码清单

### 4.1 可直接复用的代码

| 文件 | 代码/模块 | 说明 |
|------|----------|------|
| dashboard.js | 路由、渲染、Toast | UI 层完全共享 |
| jobs-db.js | CRUD 操作 | DB 层共享 |
| server.js | HTTP 路由框架 | API 层框架共享 |

## 5. 抽象风险点

| 风险 | 涉及文件 | 原因 | 应对 |
|------|---------|------|------|
| ... | ... | ... | ... |
```

## 5. 禁止

- 不编写任何代码
- 不添加标注注释到实际代码文件（只在文档中描述位置）

## 6. 验收标准

- [ ] 文档存在且按模板结构产出（至少包含 5 个章节）
- [ ] 每个文件都有 P0/P1/P2/SHARED 标注计数
- [ ] P0 标注详情包含行号范围和具体硬编码内容
- [ ] 共享代码清单至少覆盖 dashboard.js、jobs-db.js、server.js
- [ ] 风险点至少列出 3 项，每项包含应对方案

## 7. 回退方案

- 删除 `docs/plans/BOSS_SPECIFIC_BOUNDARY.md`
