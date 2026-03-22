#!/bin/bash
# 控制面客户端工具库

CONTROLLER_URL="${CONTROLLER_URL:-http://127.0.0.1:7893}"

# 发送 POST 请求
post() {
    local endpoint="$1"
    local data="$2"
    curl -s -X POST "${CONTROLLER_URL}${endpoint}" \
        -H 'Content-Type: application/json' \
        -d "$data"
}

# 发送 GET 请求
get() {
    local endpoint="$1"
    curl -s "${CONTROLLER_URL}${endpoint}"
}

# 重置环境
reset_controller() {
    post /reset '{}'
}

# 注入测试数据
seed_data() {
    local data="$1"
    post /seed "$data"
}

# 获取队列
get_queue() {
    get /queue
}

# 获取状态
get_status() {
    get /status
}

# 导出快照
export_snapshot() {
    get /export
}

# 领取任务（city+keyword 匹配）
claim_task() {
    local city="$1"
    local keyword="$2"
    local claimed_by="${3:-test}"
    post /claim "{\"city\":\"$city\",\"keyword\":\"$keyword\",\"claimedBy\":\"$claimed_by\"}"
}

# R3: 用 taskId 领取任务
claim_task_by_id() {
    local task_id="$1"
    local claimed_by="${2:-test}"
    post /claim "{\"taskId\":\"$task_id\",\"claimedBy\":\"$claimed_by\"}"
}

# 按 city+keyword 从队列查 taskId
find_task_id() {
    local city="$1"
    local keyword="$2"
    get_queue | python3 -c "
import sys, json
queue = json.load(sys.stdin)
city = sys.argv[1]
keyword = sys.argv[2]
for task in queue:
    task_city = task.get('cityName')
    if task_city == city and task.get('keyword') == keyword:
        print(task['id'])
        break
" "$city" "$keyword"
}

# 报告结果
report_result() {
    local data="$1"
    post /report "$data"
}

# R3: 用 taskId 报告结果
report_result_by_id() {
    local task_id="$1"
    local status="${2:-success}"
    local total="${3:-0}"
    post /report "{\"task\":{\"taskId\":\"$task_id\"},\"status\":\"$status\",\"total\":$total}"
}

# 断言辅助函数
assert_eq() {
    local expected="$1"
    local actual="$2"
    local msg="$3"
    if [ "$expected" != "$actual" ]; then
        echo "❌ FAILED: $msg"
        echo "   Expected: $expected"
        echo "   Actual: $actual"
        return 1
    fi
    echo "✅ PASSED: $msg"
    return 0
}

assert_contains() {
    local haystack="$1"
    local needle="$2"
    local msg="$3"
    if echo "$haystack" | grep -q "$needle"; then
        echo "✅ PASSED: $msg"
        return 0
    else
        echo "❌ FAILED: $msg"
        echo "   Expected to contain: $needle"
        echo "   Actual: $haystack"
        return 1
    fi
}
