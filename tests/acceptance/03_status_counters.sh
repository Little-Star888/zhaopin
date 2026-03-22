#!/bin/bash
# P2 状态计数器与数据结构验收脚本（R5重命名）
# 验证：/status 计数器准确性、上报结果字段完整性、/reset/seed/export 接口

set -e

cd "$(dirname "$0")"
source lib/controller_client.sh

echo "======================================"
echo "P2 状态计数器与数据结构验收"
echo "======================================"
echo ""
echo "注：本测试验证控制面的数据结构和计数器准确性"
echo "    实际告警行为（checkQueueStuck）需在扩展环境中验证"
echo ""

TIMESTAMP=$(date +%s)
ARTIFACT_FILE="test-artifacts/03_status_counters_run${TIMESTAMP}_final.json"

# 辅助函数：保存中间快照
save_step_snapshot() {
    local step_name="$1"
    export_snapshot > "test-artifacts/03_status_counters_run${TIMESTAMP}_${step_name}.json"
}

# 清理环境
echo "[1/5] 重置环境..."
reset_controller > /dev/null
echo "✅ 环境已重置"

# R3: 新增 taskId 字段验证
echo ""
echo "[2/5] 测试 taskId 字段..."

# 测试 /enqueue 返回 taskId
ENQUEUE_RESULT=$(curl -s -X POST "${CONTROLLER_URL}/enqueue" \
  -H 'Content-Type: application/json' \
  -d '{"city":"北京","keyword":"taskId测试"}')
TASK_ID=$(echo "$ENQUEUE_RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('taskId','MISSING'))")
assert_contains "$ENQUEUE_RESULT" "taskId" "/enqueue 响应应包含 taskId 字段"
assert_contains "$TASK_ID" "T" "taskId 应以 T 开头"

# 验证队列中的任务有 id 字段
QUEUE=$(get_queue)
TASK_HAS_ID=$(echo "$QUEUE" | python3 -c "import sys,json; t=json.load(sys.stdin)[0]; print('id' in t)")
assert_eq "True" "$TASK_HAS_ID" "队列中的任务应包含 id 字段"

# 测试 /seed 注入的任务有 id，且 taskId 路径可正常 claim/report
reset_controller > /dev/null
seed_data '{
  "tasks": [
    {"city":"上海","keyword":"seed测试","id":"TEST001","status":"pending"}
  ]
}' > /dev/null
QUEUE=$(get_queue)
assert_eq "TEST001" "$(echo "$QUEUE" | python3 -c "import sys,json; print(json.load(sys.stdin)[0]['id'])")" "seed 注入的任务应保留指定 id"

CLAIM_RESULT=$(claim_task_by_id "TEST001" "test_taskid")
assert_contains "$CLAIM_RESULT" '"success":true' "claim_task_by_id 应成功"

report_result_by_id "TEST001" "success" "2" > /dev/null
QUEUE=$(get_queue)
assert_eq "completed" "$(echo "$QUEUE" | python3 -c "import sys,json; print(json.load(sys.stdin)[0]['status'])")" "report_result_by_id 后状态应为 completed"
assert_eq "2" "$(echo "$QUEUE" | python3 -c "import sys,json; print(json.load(sys.stdin)[0]['result']['total'])")" "report_result_by_id 应更新 result.total"

RESULTS=$(get /results)
assert_contains "$RESULTS" "TEST001" "/results 应包含 taskId 记录"
save_step_snapshot "step1"

# 测试1: 扩展上报结果包含完整字段，支持队列堆积分析
echo ""
echo "[3/5] 测试上报结果包含完整字段..."
seed_data '{
  "tasks": [
    {"city":"北京","keyword":"队列测试1","id":"QUEUE001","status":"running","claimedAt":'$(($TIMESTAMP*1000))'}
  ]
}' > /dev/null

# 模拟扩展上报（包含 errorCode 和 errorMessage）
report_result '{
  "task":{"taskId":"QUEUE001"},
  "status":"anti_crawl",
  "total":0,
  "withDescription":0,
  "pushed":0,
  "filtered":0,
  "errorCode":"cooldown_1h",
  "errorMessage":"Anti-crawl triggered: cooldown for 1 hour",
  "crawlState":"cooldown_1h",
  "timestamp":'$(($TIMESTAMP*1000))'
}' > /dev/null

QUEUE=$(get_queue)
TASK=$(echo "$QUEUE" | python3 -c "import sys,json; d=json.load(sys.stdin); t=[x for x in d if x['keyword']=='队列测试1'][0]; print(t)")

# 验证任务变为 blocked_retry
assert_contains "$TASK" "blocked_retry" "anti_crawl上报后应为blocked_retry"
# 验证 result 字段存在
assert_contains "$TASK" "'result':" "任务应包含result字段"
save_step_snapshot "step2"

# 测试2: 模拟多次上报，验证控制面保留历史
echo ""
echo "[4/5] 测试多次上报历史保留..."
# 先重置，确保从0开始
reset_controller > /dev/null

seed_data '{
  "tasks": [
    {"city":"上海","keyword":"多次上报测试","id":"MULTI001","status":"running"}
  ]
}' > /dev/null

# 第一次上报（部分成功）
report_result '{
  "task":{"taskId":"MULTI001"},
  "status":"success",
  "total":3,
  "withDescription":2,
  "pushed":2,
  "filtered":1
}' > /dev/null

RESULTS=$(get /results)
COUNT=$(echo "$RESULTS" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))")
assert_eq "1" "$COUNT" "应保留1条结果"

# 第二次上报（反爬）- 重新注入任务以便再次上报
seed_data '{
  "tasks": [
    {"city":"上海","keyword":"多次上报测试","id":"MULTI001","status":"running"}
  ]
}' > /dev/null

report_result '{
  "task":{"taskId":"MULTI001"},
  "status":"anti_crawl",
  "total":0,
  "errorCode":"blocked_today"
}' > /dev/null

RESULTS=$(get /results)
COUNT=$(echo "$RESULTS" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))")
assert_eq "2" "$COUNT" "应保留2条结果"
save_step_snapshot "step3"

# 测试3: 验证 /status 中的各类计数器正确更新
echo ""
echo "[5/5] 测试 /status 计数器..."

# 构造一个混合状态的队列
seed_data '{
  "tasks": [
    {"city":"北京","keyword":"pending任务","status":"pending"},
    {"city":"上海","keyword":"urgent任务","status":"urgent"},
    {"city":"广州","keyword":"running任务","status":"running","claimedAt":12345},
    {"city":"深圳","keyword":"completed任务","status":"completed","completedAt":12345,"result":{"total":5}},
    {"city":"杭州","keyword":"空completed","status":"completed","completedAt":12345,"result":{"total":0}},
    {"city":"成都","keyword":"blocked任务","status":"blocked_retry","blockedAt":12345},
    {"city":"武汉","keyword":"failed任务","status":"failed","failedAt":12345}
  ]
}' > /dev/null

STATUS=$(get_status)

# 验证各计数器
PENDING=$(echo "$STATUS" | python3 -c "import sys,json; print(json.load(sys.stdin)['pendingDetails']['pending'])")
URGENT=$(echo "$STATUS" | python3 -c "import sys,json; print(json.load(sys.stdin)['pendingDetails']['urgent'])")
RUNNING=$(echo "$STATUS" | python3 -c "import sys,json; print(json.load(sys.stdin)['runningCount'])")
COMPLETED=$(echo "$STATUS" | python3 -c "import sys,json; print(json.load(sys.stdin)['completedCount'])")
EMPTY=$(echo "$STATUS" | python3 -c "import sys,json; print(json.load(sys.stdin)['completedEmptyCount'])")
BLOCKED=$(echo "$STATUS" | python3 -c "import sys,json; print(json.load(sys.stdin)['pendingDetails']['blocked_retry'])")
FAILED=$(echo "$STATUS" | python3 -c "import sys,json; print(json.load(sys.stdin)['pendingDetails']['failed'])")

assert_eq "1" "$PENDING" "pending计数应为1"
assert_eq "1" "$URGENT" "urgent计数应为1"
assert_eq "1" "$RUNNING" "running计数应为1"
assert_eq "2" "$COMPLETED" "completed计数应为2"
assert_eq "1" "$EMPTY" "completedEmpty计数应为1"
assert_eq "1" "$BLOCKED" "blocked_retry计数应为1"
assert_eq "1" "$FAILED" "failed计数应为1"
save_step_snapshot "step4"

# 导出最终快照
echo ""
echo "导出验收产物到 $ARTIFACT_FILE..."
export_snapshot > "$ARTIFACT_FILE"
echo "✅ 产物已导出"

echo ""
echo "======================================"
echo "P2 状态计数器与数据结构验收通过 ✅"
echo "======================================"
echo ""
echo "注：本测试验证了控制面的数据结构和计数器。"
echo "    队列堆积告警的真实行为需在扩展环境中验证。"
echo "    执行 03b_queue_stuck_alert_manual.sh 查看手动验证步骤。"
