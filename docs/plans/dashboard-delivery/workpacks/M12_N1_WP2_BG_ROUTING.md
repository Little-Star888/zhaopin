# 工作包 M12-N1-WP2：极简路由分发

> 目标：background.js 使用极简 Object mapping 按平台分发爬虫
> 角色：后端
> 预估改动量：~30行JS
> 关键词：**极简**，无 class，无框架

## 1. 前置条件
- M12-N1-WP1 通过

## 2. 读文件
| 文件 | 读取目的 |
|------|---------|
| `crawler/extension/background.js` | 现有消息处理逻辑 |

## 3. 改动规格

### 路由分发机制（极简 Object mapping）

```javascript
// background.js 中新增
const scrapers = {
  boss: (data) => { /* Boss 爬虫处理逻辑（已有） */ },
  // 新平台在此注册，例如：
  // liepin: (data) => { /* 猎聘爬虫处理逻辑 */ },
};

// 消息处理
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'CRAWL_RESULT') {
    const { platform, data } = message;
    if (scrapers[platform]) {
      scrapers[platform](data);
    } else {
      console.warn('[路由] 未支持的平台:', platform);
      // 不抛异常，不中断消息循环，仅日志记录
    }
  }
});
```

### Fallback 策略
- 字典未命中时：`console.warn` 日志记录，不抛异常，不中断
- 不引入 default handler 或空函数兜底
- 不引入 try-catch 包装层（极简原则）

### manifest.json
- 添加新平台的 `content_scripts` hostname 匹配
- 添加新平台的 `host_permissions`

## 4. 验证
- [ ] manifest.json 正确配置 hostname
- [ ] 已注册平台正确分发
- [ ] 未注册平台触发 console.warn，不抛异常
- [ ] 消息循环不被中断
