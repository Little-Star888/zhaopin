# 工作包 M7-N3-WP4：简历双模式编辑

> 目标：实现结构化 HTML 渲染 ↔ Markdown 编辑的双模式切换
> 角色：前端
> 预估改动量：新增 ~120 行 JS + ~60 行 CSS

## 1. 前置条件

- M7-N3-WP1 通过（Dashboard CSS 基础就绪）
- M7-N2-WP3 通过（后端 PATCH /api/resume 就绪）

## 2. 读文件（执行前必读）

| 文件 | 读取目的 |
|------|---------|
| `crawler/extension/dashboard.js` loadResume() / loadResumeView() | 现有简历逻辑 |
| `crawler/extension/constructivism-mockup.html` | 简历双模式设计稿 |
| `crawler/extension/dashboard-api.js` | API 客户端（fetchResume 方法） |

## 3. 改动规格

### 3.1 新增 fetchResumeContent API 方法

在 `dashboard-api.js` 中新增：
```js
export async function updateResumeContent(contentMd) {
    const res = await fetch(`${BASE}/api/resume`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content_md: contentMd })
    });
    return res.json();
}
```

### 3.2 双模式切换函数

```js
function toggleResumeMode(mode) {
    // mode: 'view' | 'edit'
    if (mode === 'edit') {
        resumeViewEl.innerHTML = renderResumeEdit();
    } else {
        resumeViewEl.innerHTML = renderResumeHTML(currentResume.content_md);
    }
}
```

### 3.3 结构化 HTML 渲染

`renderResumeHTML(markdown)` 函数：
- 将 Markdown 简单解析为结构化 HTML
- # → 姓名（大号红色文字）
- ## → 章节标题（下划线分隔）
- - 列表 → 结构化列表
- 文本 → 段落

### 3.4 两个视图都支持编辑

默认缩小版简历区域和工作台放大版简历区域都需：
- 显示切换按钮（"查看" / "编辑"）
- 编辑模式使用 `<textarea>` 显示原始 Markdown
- 保存按钮调用 PATCH /api/resume

### 3.5 简历区域简化

默认视图的简历上传区域只保留一个"上传简历"按钮（不显示拖拽区域）。

## 4. 验证

- [ ] 有简历时默认显示结构化 HTML 渲染
- [ ] 点击"编辑"切换为 textarea Markdown 编辑
- [ ] 点击"保存"后调用 API，内容更新
- [ ] 切换回"查看"显示更新后的结构化 HTML
- [ ] 无简历时显示上传按钮
- [ ] 两个视图（默认+放大）都支持编辑
