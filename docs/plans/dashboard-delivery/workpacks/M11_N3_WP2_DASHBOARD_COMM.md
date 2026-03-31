# 工作包 M11-N3-WP2：Dashboard→background通信

> 目标：Dashboard通过chrome.runtime.sendMessage发送采集指令
> 角色：前端
> 预估改动量：~40行JS

## 1. 前置条件
- M11-N3-WP1 通过

## 2. 改动规格
在Dashboard的采集控制面板中绑定事件：
- 开始按钮 → chrome.runtime.sendMessage({action:'START_CRAWL', ...})
- 停止按钮 → chrome.runtime.sendMessage({action:'STOP_CRAWL'})
- 监听来自background的进度更新消息

## 3. 验证
- [ ] Dashboard→background消息发送成功
- [ ] background→Dashboard进度推送正常
