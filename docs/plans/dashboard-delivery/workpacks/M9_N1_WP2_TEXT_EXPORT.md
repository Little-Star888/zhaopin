# 工作包 M9-N1-WP2：纯文本导出引擎（MD/HTML）

> 目标：实现 Markdown 和 HTML 格式的纯前端 Blob 下载
> 角色：前端
> 预估改动量：新增 ~50 行 JS
> 关联：M9-N1-WP1（导出 UI 就绪）

## 1. 前置条件

- M9-N1-WP1 通过（导出 UI 就绪）

## 2. 改动规格

### 2.1 Markdown 导出

直接下载 `content_md` 原始内容：

```js
function exportMarkdown(content, fileName) {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    triggerDownload(blob, `${fileName}.md`);
}
```

### 2.2 HTML 导出

使用 `marked` 将 Markdown 渲染为 HTML，包裹在完整文档中。HTML/CSS 模板与后端 PDF 导出**共用同一份**（见 WP3 的 `resume-template.html`）：

```js
function exportHTML(content, fileName) {
    const bodyHTML = marked.parse(content);
    const html = RESUME_TEMPLATE.replace('{BODY}', bodyHTML);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    triggerDownload(blob, `${fileName}.html`);
}
```

> 前端不需要文件系统，在 popup.html 初始化时将模板字符串内联为常量 `RESUME_TEMPLATE`。模板内容与 WP3 后端的 `controller/services/templates/resume-template.html` 保持完全一致。
```

### 2.3 通用下载触发

```js
function triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}
```

### 2.4 turndown 配置统一（列表符号）

在 DOCX→MD 解析链中（M7-N2），turndown 初始化时统一列表符号：

```js
new TurndownService({ bulletListMarker: '-' });
```

## 3. 涉及文件

| 文件 | 改动类型 | 说明 |
|------|---------|------|
| `dashboard.js` | 修改 | 添加 exportMarkdown、exportHTML、buildResumeHTML、triggerDownload |

## 4. 验证

- [ ] 选择 MD → 浏览器下载 .md 文件，内容与编辑器一致
- [ ] 选择 HTML → 浏览器下载 .html 文件
- [ ] 离线打开 HTML 文件，样式正确（Constructivism 风格内联 CSS）
- [ ] HTML 文件中文显示正常
- [ ] 文件名使用简历标题或默认名
