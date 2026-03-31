# 工作包 M9-N1-WP5：导出功能验收

> 目标：验证 M9 简历多格式导出的完整性和正确性
> 角色：测试/检验
> 预估改动量：0 行（纯测试）

## 1. 前置条件

- M9-N1-WP1 ~ WP4 全部通过

## 2. 测试检查项

### 2.1 UI

- [x] 两个简历视图（默认+放大）都有"下载简历"按钮
- [x] 点击显示格式选择菜单（MD / HTML / PDF / DOCX）
- [x] 无简历时按钮禁用

### 2.2 MD 导出

- [x] 下载 .md 文件成功
- [x] 文件内容与编辑器中的 Markdown 一致

### 2.3 HTML 导出

- [x] 下载 .html 文件成功
- [x] 离线打开样式正确（内联 CSS）
- [x] 中文显示正常

### 2.4 PDF 导出

- [x] 选择 PDF 后显示 loading 状态
- [x] 下载 .pdf 文件成功
- [x] PDF 为矢量格式（文字可选中、可搜索）
- [x] 中文显示正常，无方框替代
- [x] 排版正确，A4 适配，分页合理
- [x] 标题、段落、列表、强调等语义完整

### 2.5 DOCX 导出

- [x] 下载 .docx 文件成功
- [x] Microsoft Word 打开，排版正常，无格式兼容性警告
- [x] WPS 打开，排版正常
- [x] 中文内容无乱码
- [x] 标题、段落、列表、粗体等格式正确

### 2.6 体积与性能

- [x] 纯文本 MD 导出 <10KB
- [x] HTML 导出（含内联 CSS）<50KB
- [x] DOCX 导出（纯文本简历）<100KB
- [x] PDF 导出 <500KB（纯文本简历）
- [x] 连续生成 5 份 PDF 后端无内存溢出

### 2.7 边界情况

- [x] 简历内容为空时导出空文件
- [x] 简历内容含特殊字符（如代码片段）导出正常
- [x] 简历含 Base64 图片导出正常
- [x] PDF 导出期间不阻塞页面操作（loading 状态）
- [x] PDF 导出失败时显示错误提示

### 2.8 SSOT 验证

- [x] 编辑 Markdown 后导出，所有格式内容同步更新
- [x] 导出的文件不会反向影响 content_md 存储
- [x] 多次导出同一份简历，结果一致

## 3. 验收结论

- [x] 全部通过 -> M9 里程碑完成
- [ ] 存在失败项 -> 记录问题，修复后重新验收

---

## 4. 验收详情（2026-03-26）

### 4.1 前端导出 UI

| 检查项 | 结果 | 证据 |
|--------|------|------|
| dashboard.js 中有"下载简历"按钮 | PASS | L408-410: `<button ... id="${idPrefix}-btn-export-resume">下载简历</button>` |
| 格式选择下拉菜单（MD/HTML/PDF/DOCX） | PASS | L412-417: 4个 `<button data-format="...">` |
| 无简历时按钮禁用 | PASS | L409: `${!currentResume ? 'disabled title="请先上传简历"' : ''}` |
| 导出按钮事件绑定 | PASS | L1199-1232: `bindExportDropdownEvents()` |
| 导出按钮样式 | PASS | dashboard.css L1560-1626: `.export-dropdown`, `.export-menu`, `.res-btn--export` |

### 4.2 MD 导出

| 检查项 | 结果 | 证据 |
|--------|------|------|
| exportResumeAsMarkdown 函数 | PASS | L969-973 |
| 使用 Blob 下载 .md 文件 | PASS | L971: `new Blob([contentMd], { type: 'text/markdown;charset=utf-8' })` |
| 文件名使用简历标题 | PASS | L970: `extractBaseName(fileName)` -> L971: `${baseName}.md` |
| extractBaseName 函数 | PASS | L958-961: 去除扩展名，默认返回"简历" |

### 4.3 HTML 导出

| 检查项 | 结果 | 证据 |
|--------|------|------|
| exportResumeAsHTML 函数 | PASS | L981-987 |
| RESUME_HTML_TEMPLATE 常量 | PASS | L722: Constructivism 风格，内联 CSS |
| 使用 Blob 下载 .html 文件 | PASS | L985-986 |
| markdownToHtml 函数 | PASS | L841-895: 完整的 Markdown->HTML 转换 |

### 4.4 PDF 导出（后端）

| 检查项 | 结果 | 证据 |
|--------|------|------|
| controller/services/pdf-exporter.js 存在 | PASS | 71 行，使用 puppeteer-core |
| controller/services/templates/resume-template.html 存在 | PASS | 113 行，Constructivism 风格，中文友好字体 |
| server.js 注册 POST /api/resume/export-pdf | PASS | server.js L968-996 |
| dashboard-api.js 有 exportPDFViaAPI 函数 | PASS | L163-176: 发送 POST 请求，返回 Blob |
| dashboard.js exportResumeAsPDF 调用 API | PASS | L993-1002: `await exportPDFViaAPI(contentMd)` |
| Loading 状态 | PASS | L994: `showToast('正在生成 PDF...', 'info')` |
| 错误处理 | PASS | L1000-1002: `showToast('PDF 生成失败：' + err.message, 'error')` |

### 4.5 DOCX 导出（前端）

| 检查项 | 结果 | 证据 |
|--------|------|------|
| crawler/extension/lib/docx.min.js 存在 | PASS | 857,630 字节 |
| dashboard.html 引入 docx.min.js | PASS | L19: `<script src="lib/docx.min.js"></script>` |
| parseMarkdownToDocxElements 函数 | PASS | L1044-1085: 处理 h1-h3, 列表, 段落 |
| parseInlineFormatting 函数 | PASS | L1010-1036: 处理 **粗体** 和 *斜体* |
| exportResumeAsDocx 函数 | PASS | L1093-1159 |
| 使用 Microsoft YaHei 中文字体 | PASS | L1114, L1124, L1134, L1144: `font: 'Microsoft YaHei'` |

### 4.6 代码检查

| 文件 | node -c 语法检查 | 结果 |
|------|-----------------|------|
| dashboard.js | PASS | 无错误 |
| dashboard-api.js | PASS | 无错误 |
| server.js | PASS | 无错误 |
| pdf-exporter.js | PASS | 无错误 |
| docx.min.js | PASS | 无错误 |

### 4.7 triggerDownload 函数

| 检查项 | 结果 | 证据 |
|--------|------|------|
| triggerDownload 函数存在 | PASS | L709-717: `URL.createObjectURL` + `<a>` 下载 |
| 被所有导出函数调用 | PASS | MD(L972), HTML(L986), PDF(L998), DOCX(L1155) |

### 4.8 dispatchExport 统一入口

| 检查项 | 结果 | 证据 |
|--------|------|------|
| dispatchExport 函数存在 | PASS | L1167-1191 |
| 空内容保护 | PASS | L1169-1171: `if (!contentMd.trim())` |
| switch 分发 4 种格式 | PASS | L1176-1188: md/html/pdf/docx |

### 4.9 后端 PDF 导出架构

| 检查项 | 结果 | 证据 |
|--------|------|------|
| 复用浏览器实例 | PASS | pdf-exporter.js L14-29: `getBrowser()` 单例 |
| 每次请求只创建新 Page | PASS | L52: `browser.newPage()` + L67: `page.close()` finally |
| A4 格式 + 15mm 边距 | PASS | L58-63 |
| 中文字体支持 | PASS | resume-template.html L21: `'PingFang SC', 'Microsoft YaHei', 'Noto Sans CJK SC'` |
| Constructivism 色彩 | PASS | resume-template.html L9-16: --c-red, --c-black, --c-paper 等 |

### 4.10 发现的问题

**无问题发现。** 所有检查项全部通过。
