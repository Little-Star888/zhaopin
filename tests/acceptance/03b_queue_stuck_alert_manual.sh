#!/bin/bash
cat <<'MANUAL'
========================================
队列堆积告警 - 手动验证步骤
========================================

本验证需要在真实扩展环境中手动执行。
自动测试无法覆盖 Chrome Extension 的 Service Worker 行为。

前置条件：
1. 控制面已启动（端口 7893）
2. Chrome 扩展已加载
3. CONFIG.TASK_SOURCE_MODE = 'controller_only'

验证步骤：

【1. 构造堆积条件】
   向控制面注入多个 blocked_retry 任务：
   curl -X POST http://127.0.0.1:7893/seed -H 'Content-Type: application/json' -d '{
     "tasks": [
       {"city":"北京","keyword":"堆积1","status":"blocked_retry","blockedAt":1},
       {"city":"上海","keyword":"堆积2","status":"blocked_retry","blockedAt":2},
       {"city":"广州","keyword":"堆积3","status":"blocked_retry","blockedAt":3}
     ]
   }'

【2. 触发扩展执行】
   让扩展连续执行 3 轮（每轮都会领取 blocked_retry 任务并再次被阻断）

【3. 检查告警】
   - 检查扩展控制台日志：应有 "Queue stuck detected" 相关输出
   - 检查飞书是否收到堆积告警
   - 连续触发多次，检查是否被 30 分钟去重窗口拦截

【4. 验证结果】
   预期：
   - 第 1 次堆积检测 → 发送告警
   - 30 分钟内第 2 次 → 被去重，日志显示 "deduplicated"
   - 30 分钟后再次触发 → 发送新告警

【5. 保存证据】
   curl http://127.0.0.1:7893/export > test-artifacts/queue_stuck_manual_$(date +%s).json
MANUAL
