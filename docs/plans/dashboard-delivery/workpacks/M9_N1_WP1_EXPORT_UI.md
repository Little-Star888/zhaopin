# 工作包 M9-N1-WP1：导出交互 UI

> 目标：在简历视图中添加"下载简历"按钮和格式选择下拉
> 角色：前端
> 预估改动量：新增 ~40 行 HTML/JS + ~20 行 CSS
> 关联：M7-N3-WP4（简历双模式编辑就绪）

## 1. 前置条件

- M7-N3-WP4 通过（简历双模式编辑就绪）

## 2. 改动规格

### 2.1 简历工具栏新增按钮

在简历视图（两个视图均需）的工具栏区域添加"下载简历"按钮：
```html
<button class="btn-export" id="btn-export-resume">下载简历</button>
```

### 2.2 格式选择下拉菜单

点击"下载简历"按钮后，弹出 Constructivism 风格的下拉菜单：
```html
<div class="export-menu is-visible">
    <button data-format="md">Markdown (.md)</button>
    <button data-format="html">HTML (.html)</button>
    <button data-format="pdf">PDF (.pdf)</button>
    <button data-format="docx">Word (.docx)</button>
</div>
```

### 2.3 CSS 样式

```css
.export-menu {
    display: none;
    position: absolute;
    background: var(--c-white);
    border: 3px solid var(--c-black);
    z-index: 50;
}
.export-menu.is-visible { display: block; }
.export-menu button {
    display: block;
    width: 100%;
    padding: 10px 16px;
    border: none;
    border-bottom: 1px solid var(--c-black);
    background: var(--c-white);
    text-align: left;
    cursor: pointer;
    font-family: 'Courier New', monospace;
    text-transform: uppercase;
    letter-spacing: 1px;
}
```

### 2.4 交互逻辑

- 点击按钮 → 显示下拉菜单
- 点击菜单外 → 关闭
- 选择格式 → 调用对应的导出函数，关闭菜单
  - `md` / `html` → 前端本地导出（WP2）
  - `pdf` → 调用后端 API（WP3），显示 loading 状态
  - `docx` → 前端本地导出（WP4）
- 无简历内容时 → 按钮禁用，hover 提示"请先上传简历"

### 2.5 PDF 导出的 loading 状态

PDF 需要后端渲染，增加 loading 反馈：
```js
// PDF 导出时显示 loading
async function handleExportPDF(content) {
    showToast('正在生成 PDF...');
    try {
        const blob = await exportPDFViaAPI(content);
        triggerDownload(blob, '简历.pdf');
        showToast('PDF 生成成功');
    } catch (err) {
        showToast('PDF 生成失败：' + err.message);
    }
}
```

## 3. 涉及文件

| 文件 | 改动类型 | 说明 |
|------|---------|------|
| `dashboard.html` | 修改 | 添加导出按钮和下拉菜单 HTML |
| `dashboard.css` | 修改 | 添加导出菜单 CSS 样式 |
| `dashboard.js` | 修改 | 添加导出交互逻辑、格式分发 |

## 4. 验证

- [ ] "下载简历"按钮在两个简历视图中均可见
- [ ] 点击显示格式选择菜单（MD / HTML / PDF / DOCX）
- [ ] 点击菜单外关闭菜单
- [ ] 无简历时按钮禁用
- [ ] 选择 PDF 时显示 loading 状态
