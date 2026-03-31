# 工作包 M11-N3-WP4：端到端采集集成检测

> 目标：端到端验证Dashboard触发→Extension采集→入库→UI展示
> 角色：测试
> 预估改动量：无代码改动

## 1. 前置条件
- M11-N1~N3 全部通过

## 2. 测试场景
- Dashboard点击开始采集
- background.js正确启动
- 数据写入scraped_jobs
- Dashboard刷新显示新数据
- 错误状态正确反馈

## 3. 验证清单
- [ ] 所有场景通过
