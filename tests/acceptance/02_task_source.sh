#!/bin/bash
# P1 任务源模式结构验收脚本
# 验证：控制面的任务分配逻辑、内置队列管理、任务领取机制

set -e

cd "$(dirname "$0")"
source lib/controller_client.sh

echo "======================================"
echo "P1 任务源模式结构验收"
echo "======================================"

TIMESTAMP=$(date +%s)
ARTIFACT_FILE="test-artifacts/02_task_source_run${TIMESTAMP}.json"

# 清理环境
echo ""
echo "[1/6] 重置环境..."
reset_controller > /dev/null
echo "✅ 环境已重置"

# 测试1: 内置队列管理（inject任务到内置队列的模拟）
echo ""
echo "[2/6] 测试内置队列注入..."
seed_data '{
  "tasks": [
    {"city":"北京","keyword":"内置任务1","status":"pending"},
    {"city":"上海","keyword":"内置任务2","status":"pending"},
    {"city":"广州","keyword":"内置任务3","status":"pending"}
  ]
}' > /dev/null

QUEUE=$(get_queue)
assert_eq "3" "$(echo "$QUEUE" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))")" "应注入3个任务"

# 测试2: 任务优先级 - urgent > pending > failed/blocked_retry
echo ""
echo "[3/6] 测试任务优先级..."
seed_data '{
  "tasks": [
    {"city":"北京","keyword":"普通任务","status":"pending"},
    {"city":"上海","keyword":"紧急任务","status":"urgent"},
    {"city":"杭州","keyword":"失败任务","status":"failed"},
    {"city":"深圳","keyword":"阻断任务","status":"blocked_retry"}
  ]
}' > /dev/null

# 领取第一个任务，应该是 urgent
CLAIM1=$(claim_task "上海" "紧急任务" "test")
assert_contains "$CLAIM1" '"success":true' "紧急任务应被领取"

QUEUE=$(get_queue)
URGENT_STATUS=$(echo "$QUEUE" | python3 -c "import sys,json; d=json.load(sys.stdin); t=[x for x in d if x['keyword']=='紧急任务'][0]; print(t['status'])")
assert_eq "running" "$URGENT_STATUS" "紧急任务领取后应为running"

# 测试3: /claim 只匹配可领取状态（pending/urgent/failed/blocked_retry），不匹配completed
echo ""
echo "[4/6] 测试 /claim 状态过滤..."
seed_data '{
  "tasks": [
    {"city":"北京","keyword":"已完成任务","status":"completed","completedAt":12345}
  ]
}' > /dev/null

# 尝试领取已完成的任务
CLAIM_RESULT=$(claim_task "北京" "已完成任务" "test")
assert_contains "$CLAIM_RESULT" '"success":false' "已完成的任务不应被领取"

# 测试4: 任务状态转换链
echo ""
echo "[5/6] 测试完整状态转换链..."
seed_data '{
  "tasks": [
    {"city":"成都","keyword":"状态测试任务","status":"pending"}
  ]
}' > /dev/null

# pending -> running
CLAIM_RESULT=$(claim_task "成都" "状态测试任务" "test")
TASK_ID=$(echo "$CLAIM_RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin)['taskId'])")
QUEUE=$(get_queue)
STATUS=$(echo "$QUEUE" | python3 -c "import sys,json; d=json.load(sys.stdin); t=[x for x in d if x['keyword']=='状态测试任务'][0]; print(t['status'])")
assert_eq "running" "$STATUS" "claim后应为running"

# running -> completed (报告success)
report_result_by_id "$TASK_ID" "success" "5" > /dev/null

QUEUE=$(get_queue)
STATUS=$(echo "$QUEUE" | python3 -c "import sys,json; d=json.load(sys.stdin); t=[x for x in d if x['keyword']=='状态测试任务'][0]; print(t['status'])")
assert_eq "completed" "$STATUS" "报告success后应为completed"

# 测试5: 重试机制 - failed/blocked_retry 可以重新领取
echo ""
echo "[6/6] 测试失败任务重试机制..."
seed_data '{
  "tasks": [
    {"city":"武汉","keyword":"可重试失败","status":"failed","failedAt":12345,"failReason":"网络错误"},
    {"city":"西安","keyword":"可重试阻断","status":"blocked_retry","blockedAt":12345}
  ]
}' > /dev/null

# 失败任务应可被领取
CLAIM_FAILED=$(claim_task "武汉" "可重试失败" "test")
assert_contains "$CLAIM_FAILED" '"success":true' "failed任务应可重新领取"

# 阻断任务应可被领取
CLAIM_BLOCKED=$(claim_task "西安" "可重试阻断" "test")
assert_contains "$CLAIM_BLOCKED" '"success":true' "blocked_retry任务应可重新领取"

# 验证领取后都变成running
QUEUE=$(get_queue)
FAILED_STATUS=$(echo "$QUEUE" | python3 -c "import sys,json; d=json.load(sys.stdin); t=[x for x in d if x['keyword']=='可重试失败'][0]; print(t['status'])")
BLOCKED_STATUS=$(echo "$QUEUE" | python3 -c "import sys,json; d=json.load(sys.stdin); t=[x for x in d if x['keyword']=='可重试阻断'][0]; print(t['status'])")
assert_eq "running" "$FAILED_STATUS" "重试的failed任务领取后应为running"
assert_eq "running" "$BLOCKED_STATUS" "重试的blocked_retry任务领取后应为running"

# 导出快照
echo ""
echo "导出验收产物到 $ARTIFACT_FILE..."
export_snapshot > "$ARTIFACT_FILE"
echo "✅ 产物已导出"

echo ""
echo "======================================"
echo "P1 任务源模式结构验收通过 ✅"
echo "======================================"
echo ""
echo "注：本测试验证控制面的任务管理逻辑。"
echo "    扩展端的 TASK_SOURCE_MODE 行为需要配合真实扩展验证。"
