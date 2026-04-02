# 🎯 招聘工作台 (JobHunter)

> 一站式求职效率工具 —— 岗位采集 · 简历管理 · AI 面试助手

<p align="center">
  <img src="https://img.shields.io/badge/平台-Chrome扩展-4285F4?logo=googlechrome&logoColor=white" alt="Chrome Extension">
  <img src="https://img.shields.io/badge/后端-Node.js-339933?logo=node.js&logoColor=white" alt="Node.js">
  <img src="https://img.shields.io/badge/AI-智谱GLM-blue?logo=openai&logoColor=white" alt="GLM AI">
  <img src="https://img.shields.io/badge/数据库-SQLite-003B57?logo=sqlite&logoColor=white" alt="SQLite">
  <img src="https://img.shields.io/badge/版本-v2.0-green" alt="Version">
</p>

---

## ✨ 功能亮点

### 📋 岗位采集
- **Boss 直聘智能采集**：自动采集岗位列表与详情，支持多城市、多关键词
- **V2 缓冲策略**：大页列表 + 小批详情交替模式，规避反爬风控
- **自动去重**：基于 encryptJobId / 标题+公司+薪资 三级去重
- **断点续爬**：反爬触发后自动冷却 → 策略轮转 → 续跑

### 📝 简历管理
- **6 套专业模板**：经典/现代/极简/专业/创意/学术，一键切换
- **所见即所得编辑**：可视化编辑简历内容，实时预览
- **DOCX 上传解析**：上传 Word 简历自动提取结构化内容
- **PDF 导出**：一键生成高质量 PDF 简历

### 🤖 AI 助手
- **智能分析**：AI 分析简历优劣势，给出专业改进建议
- **结构化编辑**：AI 通过 resume_ops 协议精准修改简历局部内容
- **一键撤销**：AI 编辑后支持一键回滚，保护原始内容
- **岗位匹配**：AI 对比简历与岗位要求，给出匹配度评分
- **深度思考**：支持多轮深度分析（可折叠展示思考过程）
- **版本记录**：每次 AI 编辑自动记录版本，可追溯修改历史

### 📊 数据面板
- **统一仪表盘**：三栏布局 — 岗位列表 | 简历预览 | AI 助手
- **采集监控**：实时查看采集进度、策略状态、错误日志
- **投递管理**：支持飞书自动投递，投递状态追踪

---

## 🚀 快速开始

### 环境要求

| 依赖 | 版本 | 说明 |
|------|------|------|
| Node.js | >= 18 | 后端运行时 |
| Chrome | >= 120 | 浏览器扩展宿主 |
| Git | >= 2.0 | 版本管理 |

### 安装步骤

```bash
# 1. 克隆仓库
git clone https://github.com/xixiluo95/zhaopin.git
cd zhaopin

# 2. 一键安装依赖
bash scripts/install.sh

# 3. 启动后端服务
cd controller && node server.js

# 4. 加载 Chrome 扩展
#    打开 chrome://extensions → 开启"开发者模式"
#    点击"加载已解压的扩展程序" → 选择 crawler/extension/ 目录
```

### AI 助手配置

1. 打开扩展 Dashboard（点击扩展图标）
2. 进入 **设置** 页签
3. 填入 AI 模型配置：
   - **API 地址**：智谱清言 API
   - **API Key**：你的智谱 API Key
   - **模型**：glm-4-plus 或 glm-4

---

## 🏗️ 项目结构

```text
zhaopin/
├── controller/                # 后端控制面
│   ├── server.js              # Express 服务主入口 (端口 7893)
│   ├── ai-handler.js          # AI 助手核心逻辑
│   ├── resume-db.js           # 简历数据 CRUD
│   ├── resume-handler.js      # 简历 API 路由
│   └── services/llm/          # LLM 适配层
│       ├── llm-factory.js     # 客户端工厂
│       └── openai-compatible-provider.js  # OpenAI 兼容 API
├── crawler/extension/         # Chrome 扩展
│   ├── manifest.json          # 扩展清单
│   ├── background.js          # Service Worker (采集引擎)
│   ├── content.js             # 内容脚本 (DOM 交互)
│   ├── dashboard.html         # 仪表盘入口页
│   ├── dashboard.js           # 仪表盘逻辑
│   ├── dashboard.css          # 仪表盘样式
│   ├── dashboard-api.js       # 前端 API 封装
│   ├── resume-document-model.js  # 简历数据模型
│   └── resume-script-editor.js   # 简历脚本编辑器
├── scripts/                   # 安装与运维脚本
├── docs/                      # 文档
└── tests/                     # 测试
```

---

## 📖 核心架构

### 数据流

```
┌─────────────┐     SSE      ┌──────────────┐     API    ┌──────────────┐
│  Chrome 扩展 │◄────────────►│  Node.js 后端 │◄─────────►│  智谱 GLM AI │
│  (dashboard) │              │  (controller) │           │  (LLM API)   │
└──────┬───────┘              └──────┬────────┘           └──────────────┘
       │                             │
       │  DOM 注入                   │  SQLite
       ▼                             ▼
┌─────────────┐              ┌──────────────┐
│  Boss 直聘   │              │  本地数据库   │
│  (岗位页面)  │              │  (jobs/resume)│
└─────────────┘              └──────────────┘
```

### AI 简历编辑协议

```
用户发送消息 → SSE 连接 → AI 分析 → 调用 update_resume_ops
                                        ↓
                              结构化操作 (resume_ops[])
                                        ↓
                              前端实时应用 → 预览更新
                                        ↓
                              保存 + 版本记录
```

支持的操作：
- resume_set_field — 设置顶级字段（姓名、标题等）
- resume_update_node — 更新某个节点内容
- resume_insert_node — 插入新节点
- resume_delete_node — 删除节点
- resume_move_node — 移动节点位置
- resume_replace_text — 文本替换

### Boss 采集策略 V2

```
┌─────────────────────────────────────────────┐
│  策略池 (自动轮转)                            │
│                                             │
│  1. buffer-large    大页缓冲 (pageSize=30)   │
│  2. buffer-medium   中页缓冲 (pageSize=15)   │
│  3. sequential-conservative  保守顺序模式     │
│                                             │
│  触发反爬 → 冷却 → 切换下一策略 → 继续       │
└─────────────────────────────────────────────┘
```

---

## ⚙️ 配置说明

### 后端配置

| 环境变量 | 默认值 | 说明 |
|---------|--------|------|
| CONTROLLER_PORT | 7893 | 后端服务端口 |
| BOSS_BATCH_SIZE | 3 | Boss 每批处理详情数 |
| BOSS_RUN_UNTIL_EXHAUSTED | true | 是否抓取至结果耗尽 |
| MAX_LIST_PAGE_SIZE | 30 | 列表页每页大小 |

### 扩展配置

在 Dashboard 的 **设置** 页签中配置：
- AI 模型参数（API Key、模型名、温度等）
- 采集任务参数（城市、关键词）
- 飞书投递配置（可选）

---

## 🔒 安全说明

- 不提交任何真实凭证：API Key、Cookie 等敏感信息均存储在本地 SQLite 数据库中
- 仅供个人求职使用：请遵守招聘平台服务条款
- 私有部署：所有数据存储在本地，不上传到任何第三方服务

---

## 📋 更新日志

### v2.0 (2026-04-02)
- AI 结构化编辑协议：从全量 Markdown 覆盖升级为 resume_ops[] 精准操作
- AI 面板 UI 优化：修复流式状态竖排文字、加宽消息气泡
- AI 编辑版本记录：自动记录每次 AI 编辑的版本，支持撤销
- Boss V2 采集策略：缓冲模式 + 策略轮转 + 反爬冷却 + 断点续爬
- LLM 流式支持：新增 chatStream() 真实 SSE token 流

### v1.0 (2026-03)
- Boss 直聘岗位采集（列表 + 详情双端点）
- 6 套简历模板 + 可视化编辑
- AI 助手对话 + 简历分析
- 深度思考（可折叠展示）
- 飞书投递集成

---

## 📜 许可证

本项目为个人工具，仅供学习和个人求职使用。
