# 工作包 M9-N1-WP4：DOCX 导出引擎（`docx` npm 包）

> 目标：使用 `docx` npm 包在前端生成真正的 .docx 文件
> 角色：前端
> 预估改动量：新增 ~120 行 JS
> 关联：M9-N1-WP1（导出 UI 就绪）

## 1. 前置条件

- M9-N1-WP1 通过（导出 UI 就绪）

## 2. 设计决策

> 为什么不用 HTML 包裹 .doc？
> - HTML 包裹 .doc 不是真正的 .docx 格式
> - Word 打开会提示格式兼容性警告
> - WPS/LibreOffice 兼容性差
> - `docx` npm 包周下载 100万+，同时支持浏览器和 Node.js
> - 支持中文 `font: { eastAsia: "微软雅黑" }` 原生设置

> Chrome 扩展 MV3 限制：
> - `docx` 生成 Blob 并触发下载的逻辑**必须放在 Popup 页面中执行**
> - 不能放在 Background Service Worker 中

## 3. 改动规格

### 3.1 引入方式

> Chrome 扩展（非 webpack 打包）环境中没有 `require()`，需要使用 UMD 构建。

**方案：通过 `<script>` 标签引入 UMD 构建**

```html
<!-- 在 popup.html 中引入 -->
<script src="lib/docx.min.js"></script>
```

获取方式：
```bash
# 从 npm 下载 UMD 构建
npm install docx
# 复制构建产物到扩展目录
cp node_modules/docx/build/index.umd.js popup/lib/docx.min.js
```

使用时通过全局变量 `docx`：
```js
const { Document, Packer, Paragraph, TextRun, HeadingLevel,
        AlignmentType, BorderStyle } = docx;
```

### 3.2 核心实现

function parseMarkdownToDocxElements(markdown) {
    const lines = markdown.split('\n');
    const elements = [];

    for (const line of lines) {
        if (line.startsWith('### ')) {
            elements.push(new Paragraph({
                text: line.slice(4),
                heading: HeadingLevel.HEADING_3,
                spacing: { before: 200, after: 100 }
            }));
        } else if (line.startsWith('## ')) {
            elements.push(new Paragraph({
                text: line.slice(3),
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 300, after: 100 },
                border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: '333333' } }
            }));
        } else if (line.startsWith('# ')) {
            elements.push(new Paragraph({
                children: [new TextRun({ text: line.slice(2), bold: true, size: 32, color: 'E62B1E' })],
                spacing: { after: 100 }
            }));
        } else if (line.startsWith('- ') || line.startsWith('* ')) {
            elements.push(new Paragraph({
                text: line.slice(2),
                bullet: { level: 0 },
                spacing: { before: 40, after: 40 }
            }));
        } else if (line.trim() === '') {
            // 空行跳过
        } else {
            // 处理行内格式（**粗体**、*斜体*）
            elements.push(new Paragraph({
                children: parseInlineFormatting(line),
                spacing: { before: 40, after: 40 }
            }));
        }
    }

    return elements;
}

function parseInlineFormatting(text) {
    // 简单解析 **粗体** 和 *斜体*
    const runs = [];
    const regex = /\*\*(.+?)\*\*|\*(.+?)\*/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
        if (match.index > lastIndex) {
            runs.push(new TextRun({ text: text.slice(lastIndex, match.index) }));
        }
        if (match[1]) {
            runs.push(new TextRun({ text: match[1], bold: true }));
        } else if (match[2]) {
            runs.push(new TextRun({ text: match[2], italics: true }));
        }
        lastIndex = regex.lastIndex;
    }
    if (lastIndex < text.length) {
        runs.push(new TextRun({ text: text.slice(lastIndex) }));
    }
    return runs.length > 0 ? runs : [new TextRun({ text })];
}

async function exportDOCX(content, fileName) {
    const elements = parseMarkdownToDocxElements(content);

    const doc = new Document({
        sections: [{
            properties: {
                page: {
                    margin: { top: 720, bottom: 720, left: 720, right: 720 }
                }
            },
            children: elements
        }],
        styles: {
            default: {
                document: {
                    run: {
                        font: 'Microsoft YaHei',
                        size: 22 // 11pt
                    }
                }
            }
        }
    });

    const blob = await Packer.toBlob(doc);
    triggerDownload(blob, `${fileName}.docx`);
}
```

### 3.3 中文支持

通过 `docx` 包的样式系统设置中文字体：

```js
styles: {
    default: {
        document: {
            run: {
                font: 'Microsoft YaHei',  // 主字体
                size: 22                   // 11pt
            }
        }
    },
    paragraphStyles: [
        {
            id: 'Heading1',
            name: 'Heading 1',
            run: {
                font: 'Microsoft YaHei',
                size: 32,
                bold: true,
                color: 'E62B1E'
            }
        }
    ]
}
```

> 注意：`docx` 包的 `font` 属性会自动映射到 Word 的东亚字体设置。

## 4. 体积控制

- 只使用必要的段落样式和 run 级别样式
- 不全量内联 HTML/CSS
- Base64 图片若超过阈值（>1MB 或 >2 张）提示用户

## 5. 涉及文件

| 文件 | 改动类型 | 说明 |
|------|---------|------|
| `dashboard.js` | 修改 | 添加 exportDOCX 函数和相关解析逻辑 |
| 或 `export-docx.js` | 新增 | 独立的 DOCX 导出模块（可选） |
| `manifest.json` | 修改 | content_scripts 中引入 docx 库（如果打包） |

## 6. 验证

- [ ] 选择 Word → 下载 .docx 文件
- [ ] Microsoft Word 打开，排版正常，无格式兼容性警告
- [ ] WPS 打开，排版正常
- [ ] 中文内容无乱码
- [ ] 标题、段落、列表、粗体等格式正确
- [ ] 文件体积合理（纯文本简历 <100KB）
