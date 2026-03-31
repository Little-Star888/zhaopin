# 工作包 M14-N2-WP3：基础设施冒烟检测

> 目标：端到端验证数据与调度基础设施
> 角色：测试
> 预估改动量：无代码改动

## 1. 前置条件
- M14-N2-WP1 ~ WP2 全部通过

## 2. 测试场景

### 场景 1：detail_status 字段验证
1. 触发一次智联采集（1个城市 × 1个关键词 × p1）
2. 查询数据库：`SELECT detail_status, COUNT(*) FROM scraped_jobs GROUP BY detail_status`
3. 确认列表入库的岗位 `detail_status = 'pending'`

### 场景 2：51job 详情状态
1. 触发一次 51job 采集
2. 确认入库岗位 `detail_status = 'skipped'`，`detail_error_code = 'platform_restricted'`

### 场景 3：去重验证
1. 对同一城市+关键词+平台触发两次采集
2. 确认第二次入库没有产生重复记录
3. 验证 `platform + platformJobId` 唯一约束生效

### 场景 4：页码任务表
1. 触发采集后查询 `crawl_page_tasks`
2. 确认任务记录包含 platform/city/keyword/page/status 字段
3. 确认 status 从 pending → running → done 正确流转

### 场景 5：断点恢复
1. 触发采集，在 `running` 状态时刷新扩展
2. 确认刷新后 `running` 任务被重置为 `pending`
3. 确认继续执行后可完成该任务

## 3. 验证清单
- [ ] 所有场景通过
- [ ] 数据库 migration 无报错
- [ ] 索引创建成功
- [ ] 不影响现有采集流程的正常执行
