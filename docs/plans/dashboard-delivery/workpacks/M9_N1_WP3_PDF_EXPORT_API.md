# 工作包 M9-N1-WP3：PDF 导出 API（后端 Puppeteer）

> 目标：实现后端 PDF 导出 API 端点，使用 Puppeteer 将 Markdown 渲染为矢量 PDF
> 角色：后端
> 预估改动量：新增 ~100 行 JS + 1 个 API 端点 + 部署依赖
> 关联：M9-N1-WP1（导出 UI 就绪）

## 1. 前置条件

- M9-N1-WP1 通过（导出 UI 就绪）
- 后端环境已安装 Chromium 和中文字体包（`fonts-noto-cjk`）

## 2. 设计决策

> 为什么不用 @media print？
> - @media print 跨浏览器不一致（Chrome/Firefox/Edge 输出不同）
> - 无法控制页眉页脚
> - 用户体验差（弹出打印对话框需手动选"另存为PDF"）
> - 行业标准（Resume.io、Canva）均采用后端 Puppeteer 方案

## 3. 改动规格

### 3.1 后端 API 端点

在 `controller/server.js` 中新增端点：

```
POST /api/resume/export-pdf
Content-Type: application/json
Body: { "content_md": "..." }

Response: PDF 文件 Blob（application/pdf）
```

### 3.2 HTML 模板统一策略

> 顾问审查要求：前后端 `buildResumeHTML` 不能各写一份，否则 CSS/HTML 模板会漂移。

**方案**：HTML 模板维护为独立静态文件，前后端共用同一份。

```
controller/services/templates/
└── resume-template.html    # 共用 HTML/CSS 模板
```

后端（WP3）和前端（WP2）都读取这份模板，将 marked 渲染的 bodyHTML 注入 `{BODY}` 占位符。

```html
<!-- controller/services/templates/resume-template.html -->
<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>简历</title>
<style>
body { font-family: 'Noto Sans CJK SC', 'PingFang SC', 'Microsoft YaHei', sans-serif;
       max-width: 800px; margin: 0 auto; padding: 40px; line-height: 1.6; color: #1A1A1A; }
h1 { color: #E62B1E; border-bottom: 3px solid #1A1A1A; padding-bottom: 8px; }
h2 { border-bottom: 2px solid #333; padding-bottom: 6px; margin-top: 24px; }
ul, ol { padding-left: 20px; }
blockquote { border-left: 3px solid #E62B1E; padding-left: 12px; color: #555; }
code { background: #f4f4f4; padding: 2px 4px; }
</style>
</head><body>{BODY}</body></html>
```

后端使用方式：
```js
const fs = require('fs');
const path = require('path');

function buildResumeHTML(markdown) {
    const template = fs.readFileSync(
        path.join(__dirname, 'templates', 'resume-template.html'), 'utf-8'
    );
    const bodyHTML = marked.parse(markdown);
    return template.replace('{BODY}', bodyHTML);
}
```

前端使用方式：在 popup.html 页面加载时，通过 fetch 获取同一模板，或直接内联模板字符串（前端不需要文件系统）。

### 3.3 后端实现

```js
// controller/services/pdf-exporter.js
const puppeteer = require('puppeteer-core');
const marked = require('marked');
const path = require('path');

// 复用浏览器实例（避免每次请求启动新浏览器）
let browserInstance = null;

async function getBrowser() {
    if (!browserInstance || !browserInstance.isConnected()) {
        browserInstance = await puppeteer.launch({
            executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome',
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
        });
    }
    return browserInstance;
}

async function exportPDF(contentMd) {
    const browser = await getBrowser();
    const page = await browser.newPage();

    try {
        const html = buildResumeHTML(contentMd);
        await page.setContent(html, { waitUntil: 'networkidle0' });

        const pdfBuffer = await page.pdf({
            format: 'A4',
            margin: { top: '15mm', bottom: '15mm', left: '15mm', right: '15mm' },
            printBackground: true,
            preferCSSPageSize: false
        });

        return pdfBuffer;
    } finally {
        await page.close();
    }
}

// buildResumeHTML 已在 3.2 节定义（读取共用模板文件）


module.exports = { exportPDF };
```

### 3.3 前端调用

```js
// dashboard.js
async function exportPDFViaAPI(contentMd) {
    const resp = await fetch('/api/resume/export-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content_md: contentMd })
    });

    if (!resp.ok) throw new Error('PDF 生成失败');
    return await resp.blob();
}
```

### 3.4 部署依赖

```bash
# 后端新增依赖
npm install puppeteer-core marked

# 安装中文字体（Linux/Docker）
apt-get install -y fonts-noto-cjk
```

## 4. 顾问防范要点

| 风险 | 对策 |
|------|------|
| Linux 中文字体缺失 | 部署脚本安装 `fonts-noto-cjk` |
| 并发内存溢出 | 复用 Browser 实例，每次只开新 Page |
| ESM/CJS 兼容 | 使用 `require()` CommonJS 引入 |

## 5. 涉及文件

| 文件 | 改动类型 | 说明 |
|------|---------|------|
| `controller/services/pdf-exporter.js` | 新增 | PDF 导出服务 |
| `controller/services/templates/resume-template.html` | 新增 | 共用 HTML/CSS 模板（前后端共用） |
| `controller/server.js` | 修改 | 注册 POST /api/resume/export-pdf 端点 |
| `package.json` | 修改 | 添加 `puppeteer-core`、`marked` 依赖 |
| `dashboard.js` | 修改 | 添加 exportPDFViaAPI 函数 |

## 6. 验证

- [ ] 选择 PDF → 浏览器下载 .pdf 文件
- [ ] PDF 为矢量格式（文字可选中、可搜索）
- [ ] 中文显示正常，无方框替代
- [ ] 排版正确，A4 适配，分页合理
- [ ] 标题、段落、列表、强调等语义完整
- [ ] 连续生成 5 份 PDF 无内存溢出
