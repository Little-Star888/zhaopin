# 节点 M9-N1：简历多格式导出

> 状态：待开始
> 归属里程碑：[M9](../milestones/M9_FORMAT_EXPORT.md)
> 目标：实现简历下载时的多格式导出（MD / HTML / PDF / DOCX）
> 设计原则：以 Markdown 为唯一事实源（SSOT），PDF/DOCX 为派生输出

---

## 核心设计决策

> 详见 [M9 格式转换疑问与分歧汇总](../M9_FORMAT_CONVERSION_QUESTIONS.md)

1. **SSOT**：编辑态只认 `content_md`，所有格式均为派生输出
2. **PDF**：输出终点不回环；导出用后端 Puppeteer（高保真矢量），解析用 pdfjs-dist（轻量纯文本）
3. **DOCX**：导出用 `docx` npm 包（真正的 .docx，浏览器端执行），解析用 mammoth+turndown
4. **体积控制**：不内联无必要样式，Base64 图片阈值 >1MB 或 >2 张时转文件引用
5. **中文**：固定字体栈（PingFang / 微软雅黑 / Noto Sans CJK SC），不追求多字体混排

---

## 业务角色导航

### 前端
- [ ] [M9-N1-WP1 导出交互 UI](../workpacks/M9_N1_WP1_EXPORT_UI.md)
- [ ] [M9-N1-WP2 纯文本导出引擎（MD/HTML）](../workpacks/M9_N1_WP2_TEXT_EXPORT.md)
- [ ] [M9-N1-WP4 DOCX 导出引擎](../workpacks/M9_N1_WP4_DOCX_EXPORT.md)

### 后端
- [ ] [M9-N1-WP3 PDF 导出 API（Puppeteer）](../workpacks/M9_N1_WP3_PDF_EXPORT_API.md)

### 测试/检验
- [ ] [M9-N1-WP5 导出功能验收](../workpacks/M9_N1_WP5_EXPORT_ACCEPTANCE.md)

## 前置条件

- M7-N2 通过（简历 content_md 存在）
- M7-N3 通过（简历双模式编辑就绪）
- M8-N3 通过（Dashboard AI 功能集成完成，`dashboard.js` 已稳定，避免并行修改冲突）

## 边界

- 前端文件：dashboard.html、dashboard.js、dashboard.css
- 后端文件：controller/server.js（新增 PDF 导出 API 端点）
- 新增依赖：`docx`（前端）、`puppeteer-core`（后端）、`pdfjs-dist`（后端，替换 pdf-parse）
- 部署要求：后端环境需安装中文字体包（`fonts-noto-cjk`）
- 不修改 M7/M8 已完成的代码

## 技术架构

```
导出链路：
  content_md ─→ MD导出：直接Blob下载
  content_md ─→ marked渲染 → 内联CSS HTML → Blob下载
  content_md ─→ 前端POST → 后端marked渲染 → Puppeteer渲染HTML → PDF Blob → 返回
  content_md ─→ 前端`docx` npm解析MD → 生成.docx Blob → 下载

解析链路（M7-N2 职责，不在 M9 范围内）：
  DOCX上传 → mammoth → HTML → turndown → Markdown → content_md
  PDF上传 → pdfjs-dist → 纯文本 → Markdown → content_md
```

## 验收标准

- [ ] 简历视图中有"下载简历"按钮，弹出格式选择（MD / HTML / PDF / DOCX）
- [ ] 选择 MD → 下载 .md 文件，内容与编辑器一致
- [ ] 选择 HTML → 下载 .html 文件，离线打开样式正确
- [ ] 选择 PDF → 下载矢量 PDF，中文正常，A4 适配
- [ ] 选择 DOCX → 下载真正 .docx，Word/WPS 正常打开，中文无乱码
- [ ] 导出内容语义完整（标题、段落、列表、强调、链接不丢失）
- [ ] 文件体积不过度膨胀
