# 工作包 M2-N3-WP2：待投递列表

> 目标：实现第二页右侧的已选岗位待投递列表。
> 角色：前端
> 预估改动量：修改 ~120 行（CSS + JS）

## 1. 前置条件

- M2-N3-WP1（简历面板）通过

## 2. 读文件（执行前必读）

| 文件 | 读取目的 |
|------|---------|
| `crawler/extension/dashboard.js` | 现有路由和数据加载逻辑 |
| `crawler/extension/dashboard.css` | 现有样式 |
| `docs/plans/DASHBOARD_API_CONTRACT.md` | `GET /api/delivery/selected` 端点规格 |

## 3. 改文件

| 文件 | 改动位置 | 改动内容 |
|------|---------|---------|
| `crawler/extension/dashboard.css` | 新增样式区 | 待投递列表、详情展开、取消按钮样式 |
| `crawler/extension/dashboard.js` | `#view-resume` 视图 | 实现待投递列表渲染和交互 |

## 4. 技术约束与改动规格

> **设计语言**：本工作包的 `.delivery-panel` 面板属于**非卡片固定层**，应使用 Neumorphism（新态拟物）风格，而非 Glassmorphism。具体阴影参数参考 M2-N2-WP4 的 `.neu-flat` / `.neu-raised` 工具类。

### 4.1 列表结构（Q4 决策：`<details>` 内联展开）

```html
<div class="delivery-panel">
    <h3>待投递列表</h3>
    <div class="delivery-list">
        <details class="delivery-item">
            <summary class="delivery-summary">
                <span class="job-title">前端工程师</span>
                <span class="company-name">A公司</span>
                <span class="platform-tag">Boss</span>
            </summary>
            <div class="delivery-detail">
                <p>薪资：15-25K</p>
                <p>城市：北京</p>
                <p>经验：3-5年</p>
                <button class="btn-cancel-select" data-id="1">取消选择</button>
                <button class="btn-disabled" title="即将上线">AI 智能匹配</button>
            </div>
        </details>
    </div>
</div>
```

### 4.2 交互逻辑

- `loadDeliveryList()` — 调用 `GET /api/delivery/selected` → 渲染列表
- "取消选择"按钮 → 调用 `selectJob(id, false)` → 刷新列表 + `showToast('已取消选择')`
- 取消选择后首页卡片状态同步更新（需要重新 `loadJobs()`）
- "AI 智能匹配"按钮：灰色禁用态，`title="即将上线"`
- 空列表显示"暂无待投递岗位"

### 4.3 数据同步

- 切换到 `#resume` 视图时自动加载待投递列表
- 从首页"加入待投递"后，切换到第二页时列表自动更新
- 取消选择后，首页对应卡片的 selected 标记应同步消失

## 5. 测试上下文

- Chrome 打开 dashboard.html
- Controller 需运行中
- 需要先从首页选中一些岗位

## 6. 验收标准

```bash
# 前置：从首页选中 2-3 个岗位

# 浏览器验收：
# 1. 切换到 #resume 视图，右侧显示待投递列表
# 2. 列表项显示岗位名、公司、平台标签
# 3. 点击 <details> → 展开详情（薪资、城市、经验等）
# 4. 再次点击 → 收起详情
# 5. "取消选择"按钮 → 岗位从列表移除 + Toast "已取消选择"
# 6. 切换回首页 → 对应卡片 selected 标记消失
# 7. 空列表显示"暂无待投递岗位"
# 8. "AI 智能匹配"按钮为灰色禁用态
```

## 7. 影响范围（Blast Radius）

| 影响对象 | 影响程度 | 说明 |
|---------|---------|------|
| 首页视图 | 轻微 | 取消选择时需刷新首页数据 |
| 简历面板 | 无修改 | 左侧面板不变 |
| API 调用 | 新增 | `fetchDeliveryList` + `selectJob` 取消选中 |

## 8. 契约变更

无 API/DB 契约变更。

## 9. 回退方案

- `git checkout` 恢复 CSS 和 JS 文件

## 10. 边界（不做什么）

- 不做 AI 匹配功能（本期占位）
- 不做批量操作（批量取消选择等）
- 不改首页视觉
- 默认不拆 `dashboard-resume.js`
