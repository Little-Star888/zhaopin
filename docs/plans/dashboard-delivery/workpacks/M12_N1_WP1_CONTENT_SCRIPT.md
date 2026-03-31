# 工作包 M12-N1-WP1：Content Script实现

> 目标：实现第一轮目标平台的content script
> 角色：前端
> 预估改动量：~100行JS

## 1. 前置条件
- M11 全部通过（目标平台已选定，通信集成完成）

## 2. 读文件
| 文件 | 读取目的 |
|------|---------|
| `crawler/content.js` | 现有Boss爬虫实现（参考模式） |

## 3. 改动规格
- 创建新平台独立的content script文件（如 `content-liepin.js`）
- 实现职位列表采集（search/jobs）
- 实现职位详情采集（detail）
- 统一数据格式：{platform, platformJobId, title, company, location, salary, experience, education, keywords, description, url}
- 通过 chrome.runtime.sendMessage 发送数据给 background.js

## 4. 验证
- [ ] content script在目标平台页面正常加载
- [ ] 职位列表采集正确
- [ ] 职位详情采集正确
- [ ] 数据格式符合scraped_jobs表结构
