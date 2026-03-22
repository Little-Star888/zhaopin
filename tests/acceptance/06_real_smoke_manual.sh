#!/bin/bash
cat <<'MANUAL'
========================================
R4 小规模真实抽检 - 手动执行步骤
========================================

目标：
验证 controller_only 全链路：
控制面下发任务 -> 扩展领取 -> Boss采集 -> 飞书写入 -> 控制面状态一致

前置条件：
1. R3 taskId 协议已完成
2. 控制面已启动（端口 7893）
3. Chrome 扩展已加载，CONFIG.TASK_SOURCE_MODE='controller_only'
4. 可访问 Boss直聘 (zhipin.com)
5. 飞书配置正确

步骤1：注入真实任务
curl -X POST http://127.0.0.1:7893/reset
curl -X POST http://127.0.0.1:7893/enqueue \
  -H 'Content-Type: application/json' \
  -d '{"city":"北京","keyword":"AI产品经理"}'

记录返回的 taskId。

步骤2：触发扩展领取
触发扩展执行一次采集，然后检查：
curl http://127.0.0.1:7893/queue | python3 -m json.tool

期望：
- 任务状态变为 running
- 有 claimedAt
- claimedBy="extension"

步骤3：等待采集完成并检查控制链路
curl http://127.0.0.1:7893/queue | python3 -m json.tool
curl http://127.0.0.1:7893/results | python3 -m json.tool
curl http://127.0.0.1:7893/status | python3 -m json.tool

期望：
- queue 中该任务状态为 completed 或 blocked_retry 或 failed
- /results 中存在对应 taskId 的记录
- /status 计数器与 queue 实际状态一致

步骤4：验证飞书写入
打开飞书多维表格：
请打开你自己的飞书多维表目标页

检查：
- 是否有新写入的职位记录
- 城市字段是否正确（北京）
- 关键词字段是否正确（AI产品经理）

步骤5：保存证据
TIMESTAMP=$(date +%s)
curl http://127.0.0.1:7893/export > tests/acceptance/test-artifacts/real_smoke_${TIMESTAMP}.json

步骤6：同步填写文档
更新：
- 当前仓库内的真实抽检记录文档
- 本地私有验收笔记

步骤7：按实际结果选择结论模板

结论A（采集成功）：
验收结果：全链路验收通过
  ✓ 控制链路通过（claim -> report -> 状态一致）
  ✓ 飞书写入已验证（飞书新增 N 条记录，字段正确）
  -> 控制链路 + 业务写入均通过

结论B（反爬阻断）：
验收结果：仅控制链路验收通过
  ✓ 控制链路通过（claim -> report -> blocked_retry 状态正确）
  ✗ 飞书写入未验证（反爬阻断，未走到写入步骤）
  -> 仅控制链路验收通过，业务写入待下次采集验证

注意：
- 若被反爬阻断，不得写“全链路已跑通”
- 若控制面不可达，先检查 server.js 进程、7893 端口、扩展日志
MANUAL
