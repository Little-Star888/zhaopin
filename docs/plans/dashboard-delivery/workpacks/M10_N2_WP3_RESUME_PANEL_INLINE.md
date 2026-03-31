# 工作包 M10-N2-WP3：简历面板与AI配置内嵌

> 目标：简历面板对齐设计稿，AI配置内嵌到工作台右侧
> 角色：前端
> 预估改动量：~80行JS

## 1. 前置条件
- M10-N2-WP1 通过

## 2. 读文件
| 文件 | 读取目的 |
|------|---------|
| `crawler/extension/dashboard.js` | loadResume(), renderResumeDualMode() |
| `crawler/extension/constructivism-mockup.html` | .ws-res结构（L207-L226） |

## 3. 改动规格

### 3.1 简历面板改造
右侧 `.ws-res` 包含：简历工具栏+结构化预览+textarea编辑+上传按钮+AI配置面板。
复用 M8/M9 的 renderResumeHTML()、renderResumeEdit()、saveResumeContent()。

### 3.2 AI配置内嵌
将AI配置从独立 #ai-config tab 内嵌到 `.ws-res` 中的 `.aicfg` 可折叠面板。
参考设计稿 L218-L224 的结构（Base URL + API Key + Model Name + 保存按钮）。

### 3.3 #ai-config tab 内容
原 #ai-config tab 保留但内容简化，引导用户到工作台右侧配置AI。

## 4. 验证
- [ ] 简历预览在右侧面板正确显示
- [ ] 编辑/查看模式切换正常
- [ ] 保存功能正常
- [ ] AI配置面板可折叠展开
- [ ] AI配置保存后端持久化正常
