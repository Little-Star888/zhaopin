/**
 * pdf-exporter.js - PDF 导出服务
 *
 * 使用 puppeteer-core 将 Markdown 渲染为矢量 PDF。
 * 复用浏览器实例，每次请求只创建新 Page 以控制内存。
 * 前后端共用同一份 resume-template.html 模板。
 */

const puppeteer = require('puppeteer-core');
const marked = require('marked');
const fs = require('fs');
const path = require('path');

// 复用浏览器实例（避免每次请求启动新浏览器）
let browserInstance = null;

/**
 * 获取或创建浏览器实例
 * @returns {Promise<import('puppeteer-core').Browser>}
 */
async function getBrowser() {
  if (!browserInstance || !browserInstance.isConnected()) {
    browserInstance = await puppeteer.launch({
      executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome-stable',
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
    });
  }
  return browserInstance;
}

/**
 * 读取共用模板，将 Markdown 渲染为完整 HTML
 * @param {string} markdown Markdown 原文
 * @returns {string} 完整 HTML
 */
function buildResumeHTML(markdown) {
  const template = fs.readFileSync(
    path.join(__dirname, 'templates', 'resume-template.html'), 'utf-8'
  );
  const bodyHTML = marked.parse(markdown);
  return template.replace('{BODY}', bodyHTML);
}

/**
 * 将简历内容导出为 PDF Buffer
 * @param {string|{content_md?: string, content_html?: string}} input
 * @returns {Promise<Buffer>} PDF 二进制数据
 */
async function exportPDF(input) {
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    const contentMd = typeof input === 'string' ? input : (input?.content_md || '');
    const contentHtml = typeof input === 'object' && input ? input.content_html : '';
    const html = contentHtml || buildResumeHTML(contentMd);
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

module.exports = { exportPDF };
