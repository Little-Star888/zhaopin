#!/bin/bash
# P0 状态机映射验收脚本
# 验证：success -> completed, anti_crawl -> blocked_retry, failed -> failed, 未知 -> failed
# R1修复：构建累计式证据链，每步在前一步基础上新增任务

set -e

cd "$(dirname "$0")"
source lib/controller_client.sh

echo "======================================"
echo "P0 状态机映射验收"
echo "======================================"

# 生成时间戳用于区分不同运行
TIMESTAMP=$(date +%s)
ARTIFACT_FILE="test-artifacts/01_status_machine_run${TIMESTAMP}_final.json"

# 辅助函数：保存中间快照
save_step_snapshot() {
    local step_name="$1"
    export_snapshot > "test-artifacts/01_status_machine_run${TIMESTAMP}_${step_name}.json"
}

# 辅助函数：获取当前队列并追加新任务
append_task() {
    local city="$1"
    local keyword="$2"
    local status="${3:-pending}"
    local extra_fields="${4:-}"

    local current_queue
    current_queue=$(get_queue)

    # 基于当前队列构造新的测试任务，并保留已有任务状态，形成累计式证据链。
    printf '%s' "$current_queue" | python3 -c "
import sys, json
queue = json.load(sys.stdin)
task = json.loads('''{\"city\":\"$city\",\"keyword\":\"$keyword\",\"status\":\"$status\"$extra_fields}''')
queue.append(task)
print(json.dumps(queue))
" | while IFS= read -r queue_json; do
        seed_data "{\"tasks\":$queue_json}" > /dev/null
    done
}

# 清理环境
echo ""
echo "[1/7] 重置环境..."
reset_controller > /dev/null
echo "✅ 环境已重置"

# 测试1: success -> completed
# step1 后应有：1 completed
echo ""
echo "[2/7] 测试 success -> completed..."
seed_data '{
  "tasks": [
    {"city":"北京","keyword":"测试success","status":"pending"}
  ]
}' > /dev/null

CLAIM_RESULT=$(claim_task "北京" "测试success" "test")
TASK_ID=$(echo "$CLAIM_RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin)['taskId'])")
post /report "{\"task\":{\"taskId\":\"$TASK_ID\"},\"status\":\"success\",\"total\":5,\"withDescription\":3,\"pushed\":5}" > /dev/null

QUEUE=$(get_queue)
assert_eq "1" "$(echo "$QUEUE" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))")" "step1应只有1个任务"
assert_eq "completed" "$(echo "$QUEUE" | python3 -c "import sys,json; print(json.load(sys.stdin)[0]['status'])")" "success应映射为completed"
save_step_snapshot "step1"

# 测试2: anti_crawl -> blocked_retry  
# step2 后应有：1 completed + 1 blocked_retry
echo ""
echo "[3/7] 测试 anti_crawl -> blocked_retry..."
append_task "上海" "测试anticrawl" "pending"

CLAIM_RESULT=$(claim_task "上海" "测试anticrawl" "test")
TASK_ID=$(echo "$CLAIM_RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin)['taskId'])")
post /report "{\"task\":{\"taskId\":\"$TASK_ID\"},\"status\":\"anti_crawl\",\"total\":0,\"errorCode\":\"cooldown_1h\"}" > /dev/null

QUEUE=$(get_queue)
assert_eq "2" "$(echo "$QUEUE" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))")" "step2应有2个任务"
assert_eq "completed" "$(echo "$QUEUE" | python3 -c "import sys,json; print(json.load(sys.stdin)[0]['status'])")" "第1个任务仍为completed"
assert_eq "blocked_retry" "$(echo "$QUEUE" | python3 -c "import sys,json; print(json.load(sys.stdin)[1]['status'])")" "第2个任务为blocked_retry"
save_step_snapshot "step2"

# 测试3: failed -> failed
# step3 后应有：1 completed + 1 blocked_retry + 1 failed
echo ""
echo "[4/7] 测试 failed -> failed..."
append_task "杭州" "测试failed" "pending"

CLAIM_RESULT=$(claim_task "杭州" "测试failed" "test")
TASK_ID=$(echo "$CLAIM_RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin)['taskId'])")
post /report "{\"task\":{\"taskId\":\"$TASK_ID\"},\"status\":\"failed\",\"total\":0,\"errorMessage\":\"tab crashed\"}" > /dev/null

QUEUE=$(get_queue)
assert_eq "3" "$(echo "$QUEUE" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))")" "step3应有3个任务"
assert_eq "completed" "$(echo "$QUEUE" | python3 -c "import sys,json; print(json.load(sys.stdin)[0]['status'])")" "第1个任务仍为completed"
assert_eq "blocked_retry" "$(echo "$QUEUE" | python3 -c "import sys,json; print(json.load(sys.stdin)[1]['status'])")" "第2个任务仍为blocked_retry"
assert_eq "failed" "$(echo "$QUEUE" | python3 -c "import sys,json; print(json.load(sys.stdin)[2]['status'])")" "第3个任务为failed"

# 检查 failReason
task=$(echo "$QUEUE" | python3 -c "import sys,json; print(json.load(sys.stdin)[2])")
assert_contains "$task" "tab crashed" "failReason应包含errorMessage"
save_step_snapshot "step3"

# 测试4: 未知状态 -> failed（不再是silent completed）
# step4 后应有：1 completed + 1 blocked_retry + 2 failed
echo ""
echo "[5/7] 测试 未知状态 -> failed..."
append_task "深圳" "测试unknown" "pending"

CLAIM_RESULT=$(claim_task "深圳" "测试unknown" "test")
TASK_ID=$(echo "$CLAIM_RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin)['taskId'])")
post /report "{\"task\":{\"taskId\":\"$TASK_ID\"},\"status\":\"something_weird\",\"total\":0}" > /dev/null

QUEUE=$(get_queue)
assert_eq "4" "$(echo "$QUEUE" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))")" "step4应有4个任务"
assert_eq "completed" "$(echo "$QUEUE" | python3 -c "import sys,json; print(json.load(sys.stdin)[0]['status'])")" "第1个任务仍为completed"
assert_eq "blocked_retry" "$(echo "$QUEUE" | python3 -c "import sys,json; print(json.load(sys.stdin)[1]['status'])")" "第2个任务仍为blocked_retry"
assert_eq "failed" "$(echo "$QUEUE" | python3 -c "import sys,json; print(json.load(sys.stdin)[2]['status'])")" "第3个任务仍为failed"
assert_eq "failed" "$(echo "$QUEUE" | python3 -c "import sys,json; print(json.load(sys.stdin)[3]['status'])")" "第4个任务为failed"

# 检查 failReason 包含 unknown_report_status
task=$(echo "$QUEUE" | python3 -c "import sys,json; print(json.load(sys.stdin)[3])")
assert_contains "$task" "unknown_report_status" "failReason应提示未知状态"
save_step_snapshot "step4"

# 测试5: /claim 功能
# step5 后应有：1 completed + 1 blocked_retry + 2 failed + 1 running
echo ""
echo "[6/7] 测试 /claim 接口..."
append_task "成都" "测试claim" "pending"

CLAIM_RESULT=$(claim_task "成都" "测试claim" "test_script")
assert_contains "$CLAIM_RESULT" '"success":true' "claim应返回success"

QUEUE=$(get_queue)
assert_eq "5" "$(echo "$QUEUE" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))")" "step5应有5个任务"
assert_eq "running" "$(echo "$QUEUE" | python3 -c "import sys,json; print(json.load(sys.stdin)[4]['status'])")" "第5个任务为running"
save_step_snapshot "step5"

# 测试6: /status 中的 completedEmptyCount
# step6 验证所有计数器
echo ""
echo "[7/7] 测试 /status 计数器..."
STATUS_JSON=$(get_status)
assert_contains "$STATUS_JSON" "completedEmptyCount" "status应包含completedEmptyCount"
assert_contains "$STATUS_JSON" "runningCount" "status应包含runningCount"

# 验证各计数器
COMPLETED=$(echo "$STATUS_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin)['completedCount'])")
RUNNING=$(echo "$STATUS_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin)['runningCount'])")
assert_eq "1" "$COMPLETED" "completed计数应为1"
assert_eq "1" "$RUNNING" "running计数应为1"
save_step_snapshot "step6"

# 导出最终快照
echo ""
echo "导出最终验收产物到 $ARTIFACT_FILE..."
export_snapshot > "$ARTIFACT_FILE"
echo "✅ 产物已导出"

echo ""
echo "======================================"
echo "P0 状态机映射验收通过 ✅"
echo "======================================"
echo ""
echo "产物文件列表:"
ls -la "test-artifacts/01_status_machine_run${TIMESTAMP}"*.json
echo ""
echo "累计式证据链:"
echo "  step1: 1 completed"
echo "  step2: 1 completed + 1 blocked_retry"  
echo "  step3: 1 completed + 1 blocked_retry + 1 failed"
echo "  step4: 1 completed + 1 blocked_retry + 2 failed"
echo "  step5: 1 completed + 1 blocked_retry + 2 failed + 1 running"
echo "  step6: 同上，验证计数器"
echo "  final: 最终完整快照"
