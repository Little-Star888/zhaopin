# 工作包 M2-N3-WP1：简历管理面板

> 目标：实现第二页左侧的简历上传和管理功能。
> 角色：前端
> 预估改动量：修改 ~150 行（CSS + JS）

## 1. 前置条件

- M2-N2 全部工作包通过（首页视觉完成）

## 2. 读文件（执行前必读）

| 文件 | 读取目的 |
|------|---------|
| `crawler/extension/dashboard.js` | 现有 `initDashboard` 和路由逻辑 |
| `crawler/extension/dashboard.css` | 现有样式 |
| `docs/plans/DASHBOARD_API_CONTRACT.md` | 简历上传/读取端点规格 |

## 3. 改文件

| 文件 | 改动位置 | 改动内容 |
|------|---------|---------|
| `crawler/extension/dashboard.css` | 新增样式区 | 简历面板、上传区域、文件信息样式 |
| `crawler/extension/dashboard.js` | `#view-resume` 视图 | 实现简历上传和管理逻辑 |

## 4. 技术约束与改动规格

> **设计语言**：本工作包的 `.resume-panel` 面板属于**非卡片固定层**，应使用 Neumorphism（新态拟物）风格，而非 Glassmorphism。具体阴影参数参考 M2-N2-WP4 的 `.neu-flat` / `.neu-raised` 工具类。

### 4.1 第二页布局

```
┌──────────────────────────────────────┐
│ #view-resume                         │
│ ┌──────────────┬───────────────────┐ │
│ │ 简历管理面板  │  待投递列表(WP2)  │ │
│ │ (WP1)        │                   │ │
│ └──────────────┴───────────────────┘ │
└──────────────────────────────────────┘
```

### 4.2 上传区域样式

```css
.upload-zone {
    border: 2px dashed var(--c-gray);
    border-radius: 12px;
    padding: 40px;
    text-align: center;
    cursor: pointer;
    transition: border-color 200ms, background-color 200ms;
}
.upload-zone.drag-over {
    border-color: var(--c-teal);
    background: rgba(42, 93, 105, 0.1);
}
```

### 4.3 交互逻辑

- `initResumeView()` — 初始化第二页视图
- `loadResume()` — 调用 `GET /api/resume` 加载当前简历
- `handleResumeUpload(file)` — 拖拽/选择后调用 `POST /api/resume/upload`
- 拖拽事件：`dragover` / `dragleave` / `drop`
- 上传成功 → 刷新简历信息 + `showToast('简历上传成功', 'success')`
- 上传失败 → `showToast('上传失败: ...', 'error')`
- "在线编辑"按钮：灰色禁用，`title="即将上线"`（Q4 决策）

### 4.4 简历信息展示

```html
<div class="resume-info">
    <div class="resume-name">文件名.pdf</div>
    <div class="resume-meta">大小: 1.2MB · 上传时间: 2026-03-25</div>
    <button class="btn-reupload">重新上传</button>
    <button class="btn-disabled" title="即将上线">在线编辑</button>
</div>
```

## 5. 测试上下文

- Chrome 打开 dashboard.html
- Controller 需运行中（上传/读取端点）
- 准备一个测试 PDF 文件

## 6. 验收标准

```bash
# 浏览器验收：
# 1. 切换到 #resume 视图，看到上传区域
# 2. 拖拽文件到上传区域 → 悬停时边框变色+背景变色
# 3. 松开鼠标 → 文件上传成功 → Toast "简历上传成功"
# 4. 显示文件名、大小、上传时间
# 5. 点击上传区域 → 文件选择器弹出 → 选择后上传成功
# 6. "重新上传"按钮可用 → 点击后可重新选择文件
# 7. "在线编辑"按钮为灰色，hover 不可点击，title 显示"即将上线"
# 8. 上传失败时 Toast 显示错误信息
```

## 7. 影响范围（Blast Radius）

| 影响对象 | 影响程度 | 说明 |
|---------|---------|------|
| 首页视图 | 无修改 | `#view-home` 不受影响 |
| API 调用 | 新增 | `uploadResume` / `fetchResume` 被调用 |
| 后端 | 依赖 | 需要 `/api/resume/upload` 和 `/api/resume` 端点 |

## 8. 契约变更

无 API/DB 契约变更。

## 9. 回退方案

- `git checkout` 恢复 CSS 和 JS 文件

## 10. 边界（不做什么）

- 不做 AI 评分（本期占位）
- 不做在线编辑功能（本期占位）
- 不改首页视觉
- 默认不拆 `dashboard-resume.js`；若后续确需拆分，应在实现后同步更新文档
