# 工作包 M14-N4-WP3：51job 列表规模化冒烟检测

> 目标：端到端验证 51job 列表规模化采集
> 角色：测试
> 预估改动量：无代码改动

## 1. 前置条件
- M14-N4-WP1 ~ WP2 全部通过

## 2. 测试场景

### 场景 1：SPA 翻页验证
1. 配置 `MAX_LIST_PAGES = 2`，触发 51job 采集（1城市 × 1关键词）
2. 确认 p1 和 p2 均被抓取
3. **关键验证**：确认 p2 的 `sensorsdata.pageNum = 2`（而非 URL 参数翻页）
4. 确认 p2 的 `platformJobId` 与 p1 不同（无 100% 重复）
5. 恢复默认

### 场景 2：去重验证
1. 对同一城市+关键词触发两次 51job 采集
2. 确认第二次无重复入库
3. 确认 `jobs_new` 为 0

### 场景 3：详情 URL 还原验证
1. 触发 51job 采集
2. 查询数据库确认所有入库岗位的 `url` 字段非空
3. 确认 `url` 格式为 `https://jobs.51job.com/{area-slug}/{jobId}.html?s=...&req=...`
4. 人工打开 2-3 条还原的 URL，确认格式正确可访问

### 场景 4：详情状态
1. 触发 51job 采集
2. 查询数据库确认所有入库岗位 `detail_status = 'skipped'`
3. 确认 `detail_error_code = 'platform_restricted'`
4. 确认 `detail_attempt_count = 0`

### 场景 5：DOM 签名校验
1. 在 51job 页面正常时采集，确认无 DOM 签名告警
2. （如有条件）模拟 DOM 变更，确认触发告警日志

### 场景 6：数据完整性声明验证
1. 确认 51job 列表字段完整（title, company, salary, location, keywords）
2. 确认 `description` 为空（符合预期，当前阶段不抓详情）
3. 确认不因详情问题丢失列表数据
4. 确认 `url` 字段存储了正确的详情入口 URL

## 3. 验证清单
- [ ] 所有场景通过
- [ ] 不影响 Boss/智联采集
- [ ] 列表数据完整性不受影响
- [ ] 采集日志中无异常错误
- [ ] p2 不再出现 100% 重复（旧 Bug 已修复）
