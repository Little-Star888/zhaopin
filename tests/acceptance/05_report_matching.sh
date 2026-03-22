#!/bin/bash
# /report 协议验收脚本
# Round 3: 只接受 taskId 精确匹配，city+keyword 回退已移除

set -e

cd "$(dirname "$0")"
source lib/controller_client.sh

echo "======================================"
echo "/report 协议验收 - Round 3"
echo "======================================"
echo ""
echo "本脚本验证："
echo "  1. 重试路径：failed → claim → success → completed"
echo "  2. 重试路径：blocked_retry → claim → success → completed"
echo "  3. /report 缺少 taskId 时会被拒绝"
echo "  4. 同 key 任务可通过 taskId 精确命中"
echo ""

TIMESTAMP=$(date +%s)

# ============================================================================
# 场景1: failed 重试成功
# ============================================================================
echo "[场景1] failed 重试成功..."
reset_controller > /dev/null

seed_data '{
  "tasks": [
    {"city":"北京","keyword":"重试测试","status":"pending"}
  ]
}' > /dev/null

# 第一次 claim
CLAIM=$(claim_task "北京" "重试测试" "test")
TASK_ID=$(echo "$CLAIM" | python3 -c "import sys,json; print(json.load(sys.stdin)['taskId'])")

# 报告 failed
post /report "{\"task\":{\"taskId\":\"$TASK_ID\"},\"status\":\"failed\",\"total\":0,\"errorMessage\":\"超时\"}" > /dev/null

# 验证：任务变为 failed
QUEUE=$(get_queue)
STATUS=$(echo "$QUEUE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d[0]['status'])")
assert_eq "failed" "$STATUS" "第一次失败后应为 failed"

# 重新 claim（模拟重试）
CLAIM=$(claim_task "北京" "重试测试" "test")
TASK_ID=$(echo "$CLAIM" | python3 -c "import sys,json; print(json.load(sys.stdin)['taskId'])")
QUEUE=$(get_queue)
STATUS=$(echo "$QUEUE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d[0]['status'])")
assert_eq "running" "$STATUS" "重新 claim 后应为 running"

# 再次 report success
post /report "{\"task\":{\"taskId\":\"$TASK_ID\"},\"status\":\"success\",\"total\":3,\"pushed\":3}" > /dev/null

QUEUE=$(get_queue)
STATUS=$(echo "$QUEUE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d[0]['status'])")
assert_eq "completed" "$STATUS" "重试成功后应为 completed"

# 验证 result 字段被更新（不是追加）
TOTAL=$(echo "$QUEUE" | python3 -c "import sys,json; print(json.load(sys.stdin)[0]['result']['total'])")
assert_eq "3" "$TOTAL" "result.total 应为重试后的值 3"

# 保存场景1产物
export_snapshot > "test-artifacts/05_report_matching_run${TIMESTAMP}_retry_failed_success.json"
echo "✅ 场景1通过"

# ============================================================================
# 场景2: blocked_retry 重试成功
# ============================================================================
echo ""
echo "[场景2] blocked_retry 重试成功..."
reset_controller > /dev/null

seed_data '{
  "tasks": [
    {"city":"上海","keyword":"反爬重试","status":"pending"}
  ]
}' > /dev/null

CLAIM=$(claim_task "上海" "反爬重试" "test")
TASK_ID=$(echo "$CLAIM" | python3 -c "import sys,json; print(json.load(sys.stdin)['taskId'])")

# 报告 anti_crawl
post /report "{\"task\":{\"taskId\":\"$TASK_ID\"},\"status\":\"anti_crawl\",\"total\":0,\"errorCode\":\"cooldown_1h\"}" > /dev/null

# 验证：任务变为 blocked_retry
QUEUE=$(get_queue)
STATUS=$(echo "$QUEUE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d[0]['status'])")
assert_eq "blocked_retry" "$STATUS" "反爬后应为 blocked_retry"

# 重新 claim
CLAIM=$(claim_task "上海" "反爬重试" "test")
TASK_ID=$(echo "$CLAIM" | python3 -c "import sys,json; print(json.load(sys.stdin)['taskId'])")
post /report "{\"task\":{\"taskId\":\"$TASK_ID\"},\"status\":\"success\",\"total\":5,\"pushed\":5}" > /dev/null

# 验证：最终变为 completed
QUEUE=$(get_queue)
STATUS=$(echo "$QUEUE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d[0]['status'])")
assert_eq "completed" "$STATUS" "反爬重试成功后应为 completed"

# 保存场景2产物
export_snapshot > "test-artifacts/05_report_matching_run${TIMESTAMP}_retry_blocked_success.json"
echo "✅ 场景2通过"

# ============================================================================
# 场景3: 缺少 taskId 时拒绝上报
# ============================================================================
echo ""
echo "[场景3] 缺少 taskId 时拒绝上报..."

reset_controller > /dev/null

seed_data '{
  "tasks": [
    {"city":"北京","keyword":"缺少taskId","id":"MISSING001","status":"running","claimedAt":12346,"claimedBy":"extension"}
  ]
}' > /dev/null

REPORT_RESULT=$(report_result '{
  "task":{"city":"北京","keyword":"缺少taskId"},
  "status":"success",
  "total":3,
  "pushed":3
}')

assert_contains "$REPORT_RESULT" "Missing task.taskId" "缺少 taskId 的 /report 应被拒绝"

QUEUE=$(get_queue)
STATUS=$(echo "$QUEUE" | python3 -c "import sys,json; print(json.load(sys.stdin)[0]['status'])")
assert_eq "running" "$STATUS" "被拒绝后原任务状态不应变化"

# 保存证据快照
export_snapshot > "test-artifacts/05_report_matching_run${TIMESTAMP}_ambiguity_evidence.json"
echo "✅ 场景3证据已保存"

# ============================================================================
# 场景4: taskId 精确匹配验证
# ============================================================================
echo ""
echo "[场景4] taskId 精确匹配验证..."

reset_controller > /dev/null

# 注入两个同 city+key 但不同 taskId 的任务（pending 状态，可被领取）
seed_data '{
  "tasks": [
    {"city":"北京","keyword":"精确匹配","id":"TEST001","status":"pending"},
    {"city":"北京","keyword":"精确匹配","id":"TEST002","status":"pending"}
  ]
}' > /dev/null

# 验证初始状态
QUEUE=$(get_queue)
assert_eq "2" "$(echo "$QUEUE" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))")" "应注入2个任务"

# 用 TEST001 的 taskId claim
CLAIM=$(claim_task_by_id "TEST001" "test_b")
assert_contains "$CLAIM" '"success":true' "taskId claim应成功"

# 验证 TEST001 变为 running，TEST002 仍为 pending
QUEUE=$(get_queue)
T1_STATUS=$(echo "$QUEUE" | python3 -c "import sys,json; t=[x for x in json.load(sys.stdin) if x['id']=='TEST001'][0]; print(t['status'])")
T2_STATUS=$(echo "$QUEUE" | python3 -c "import sys,json; t=[x for x in json.load(sys.stdin) if x['id']=='TEST002'][0]; print(t['status'])")
assert_eq "running" "$T1_STATUS" "TEST001 应变为 running"
assert_eq "pending" "$T2_STATUS" "TEST002 未受影响，仍为 pending"

# 用 TEST002 的 taskId 报告成功
report_result '{
  "task":{"taskId":"TEST002"},
  "status":"success","total":3,"pushed":3
}' > /dev/null

# 验证结果
QUEUE=$(get_queue)
T1_STATUS=$(echo "$QUEUE" | python3 -c "import sys,json; t=[x for x in json.load(sys.stdin) if x['id']=='TEST001'][0]; print(t['status'])")
T2_STATUS=$(echo "$QUEUE" | python3 -c "import sys,json; t=[x for x in json.load(sys.stdin) if x['id']=='TEST002'][0]; print(t['status'])")
T2_TOTAL=$(echo "$QUEUE" | python3 -c "import sys,json; t=[x for x in json.load(sys.stdin) if x['id']=='TEST002'][0]; print(t.get('result',{}).get('total','N/A'))")

assert_eq "running" "$T1_STATUS" "TEST001 不受影响，仍为 running"
assert_eq "completed" "$T2_STATUS" "TEST002 应变为 completed"
assert_eq "3" "$T2_TOTAL" "TEST002 的 result.total 应为 3"

# 保存场景4产物
export_snapshot > "test-artifacts/05_report_matching_run${TIMESTAMP}_taskid_exact_match.json"
echo "✅ 场景4通过"

echo ""
echo "======================================"
echo "/report 协议验收完成 ✅"
echo "======================================"
echo ""
echo "产物文件："
ls -la "test-artifacts/05_report_matching_run${TIMESTAMP}"*.json
