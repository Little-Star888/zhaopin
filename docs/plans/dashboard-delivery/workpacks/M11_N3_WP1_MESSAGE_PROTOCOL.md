# 工作包 M11-N3-WP1：background.js消息协议

> 目标：background.js新增采集控制消息处理
> 角色：后端
> 预估改动量：~50行JS

## 1. 前置条件
- M11-N1 通过（平台信息已确定）

## 2. 改动规格
在background.js中新增消息处理：
- `START_CRAWL`：接收{platform, keyword, city}，启动对应平台爬虫
- `GET_STATUS`：返回当前采集状态和进度
- `STOP_CRAWL`：停止当前采集
- 采集结果转发给Node.js后端写入scraped_jobs

## 3. 验证
- [ ] 消息协议正确处理
