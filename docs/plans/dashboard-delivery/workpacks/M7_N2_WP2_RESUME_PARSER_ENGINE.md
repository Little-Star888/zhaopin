# 工作包 M7-N2-WP2：简历解析引擎

> 目标：新建 resume-parser.js，实现 PDF/DOCX → Markdown 转换
> 角色：后端
> 预估改动量：新建 ~60 行

## 1. 前置条件

- M7-N2-WP1 通过（Schema 已迁移）

## 2. 读文件（执行前必读）

| 文件 | 读取目的 |
|------|---------|
| `crawler/controller/resume-handler.js` | 现有上传处理逻辑 |
| `crawler/controller/package.json` | 现有依赖 |

## 3. 改动规格

### 3.1 安装依赖

```bash
cd /home/xixil/kimi-code/zhaopin/controller
npm install mammoth pdfjs-dist turndown
```

> **注意**：使用 `pdfjs-dist` 替代 `pdf-parse`。`pdf-parse` 在 Node.js v24 上已失效（详见 [M9 格式转换疑问文档](../../M9_FORMAT_CONVERSION_QUESTIONS.md) 疑问1）。pdfjs-dist 使用 legacy 版本引入，Node 端需禁用 Worker。

### 3.2 新建 `controller/services/resume-parser.js`

职责单一：接收文件路径和 MIME 类型，返回 Markdown 文本。

```js
/**
 * 将简历文件解析为 Markdown 文本
 *
 * @param {string} filePath - 文件路径
 * @param {string} mimeType - 文件 MIME 类型
 * @returns {Promise<string>} Markdown 文本
 */
async function parseResumeToMarkdown(filePath, mimeType) { ... }

module.exports = { parseResumeToMarkdown };
```

### 3.3 支持的格式

| 格式 | MIME 类型 | 解析方式 |
|------|----------|---------|
| DOCX | application/vnd.openxmlformats-officedocument.wordprocessingml.document | mammoth → HTML → turndown → Markdown |
| PDF | application/pdf | pdfjs-dist（legacy 版本）→ 纯文本 → Markdown |

### 3.4 错误处理

- 文件不存在 → 抛出明确错误
- 不支持的格式 → 抛出 'Unsupported file format'
- 解析失败 → 抛出原始错误，由调用方决定 status 标记

## 4. 验证

- [ ] 准备一个 .docx 测试文件，调用 parser 返回 Markdown
- [ ] 准备一个 .pdf 测试文件，调用 parser 返回纯文本
- [ ] 传入不支持的格式，抛出正确错误
- [ ] 传入不存在的路径，抛出正确错误
