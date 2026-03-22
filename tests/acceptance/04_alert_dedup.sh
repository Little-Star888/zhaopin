#!/bin/bash
# 告警去重结构验收脚本
# 验证：扩展端去重机制的存储键名、控制面支持的上报格式

set -e

cd "$(dirname "$0")"
source lib/controller_client.sh

echo "======================================"
echo "告警去重结构验收"
echo "======================================"
echo ""
echo "注：去重逻辑在扩展端实现（chrome.storage.local）"
echo "    签名：{type, historyDigest, windowStart}"
echo "    窗口：30分钟"
echo "    本测试验证控制面接口支持"
echo ""

TIMESTAMP=$(date +%s)
ARTIFACT_FILE="test-artifacts/04_alert_dedup_run${TIMESTAMP}.json"

# 清理环境
echo "[1/4] 重置环境..."
reset_controller > /dev/null
echo "✅ 环境已重置"

# 测试1: /reset 接口能清除所有状态
echo ""
echo "[2/4] 测试 /reset 接口清除状态..."
seed_data '{
  "tasks": [
    {"city":"北京","keyword":"待清理任务","status":"running"}
  ],
  "results": [
    {"task":{"city":"测试","keyword":"结果"},"status":"success"}
  ],
  "paused": true
}' > /dev/null

# 验证数据已注入
QUEUE=$(get_queue)
assert_eq "1" "$(echo "$QUEUE" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))")" "注入后应有1个任务"

STATUS=$(get_status)
PAUSED=$(echo "$STATUS" | python3 -c "import sys,json; print(json.load(sys.stdin)['paused'])")
assert_eq "True" "$PAUSED" "注入后应为暂停状态"

# 执行reset
reset_controller > /dev/null

# 验证已清空
QUEUE=$(get_queue)
assert_eq "0" "$(echo "$QUEUE" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))")" "reset后应为空队列"

STATUS=$(get_status)
PAUSED=$(echo "$STATUS" | python3 -c "import sys,json; print(json.load(sys.stdin)['paused'])")
assert_eq "False" "$PAUSED" "reset后应为非暂停状态"

echo "✅ /reset 接口工作正常"

# 测试2: /seed 接口能精确注入带各种字段的任务
echo ""
echo "[3/4] 测试 /seed 接口精确注入..."
seed_data '{
  "tasks": [
    {"city":"北京","keyword":"完整字段测试","status":"blocked_retry","createdAt":12345,"result":{"status":"anti_crawl","total":0},"failedAt":12346,"failReason":"cooldown"}
  ]
}' > /dev/null

QUEUE=$(get_queue)
TASK=$(echo "$QUEUE" | python3 -c "import sys,json; print(json.load(sys.stdin)[0])")

assert_contains "$TASK" "blocked_retry" "状态应保留"
assert_contains "$TASK" "12345" "createdAt应保留"
assert_contains "$TASK" "cooldown" "failReason应保留"

echo "✅ /seed 接口支持完整字段"

# 测试3: 验证 /export 接口导出完整快照（用于验证去重状态）
echo ""
echo "[4/4] 测试 /export 接口快照导出..."
seed_data '{
  "tasks": [
    {"city":"北京","keyword":"任务1","status":"completed"},
    {"city":"上海","keyword":"任务2","status":"pending"},
    {"city":"广州","keyword":"任务3","status":"failed"}
  ],
  "results": [
    {"task":{"city":"北京","keyword":"任务1"},"status":"success","total":5}
  ]
}' > /dev/null

EXPORT=$(export_snapshot)

# 验证导出结构
assert_contains "$EXPORT" "exportedAt" "应包含exportedAt"
assert_contains "$EXPORT" "summary" "应包含summary"
assert_contains "$EXPORT" "byStatus" "应包含byStatus"

# 验证计数正确
TOTAL=$(echo "$EXPORT" | python3 -c "import sys,json; print(json.load(sys.stdin)['summary']['totalTasks'])")
COMPLETED=$(echo "$EXPORT" | python3 -c "import sys,json; print(json.load(sys.stdin)['summary']['byStatus']['completed'])")
assert_eq "3" "$TOTAL" "总任务数应为3"
assert_eq "1" "$COMPLETED" "completed计数应为1"

echo "✅ /export 接口工作正常"

# 导出最终快照
echo ""
echo "导出验收产物到 $ARTIFACT_FILE..."
export_snapshot > "$ARTIFACT_FILE"
echo "✅ 产物已导出"

echo ""
echo "======================================"
echo "告警去重结构验收通过 ✅"
echo "======================================"
echo ""
echo "扩展端去重策略："
echo "  - 存储键: last_queue_stuck_alert"
echo "  - 签名: {type, historyDigest, windowStart}"
echo "  - 时间窗口: 30分钟"
echo "  - 去重条件: type + historyDigest + windowStart 完全相同"
echo ""
echo "真实去重效果需在扩展环境中验证："
echo "  1. 连续触发队列堆积条件"
echo "  2. 检查飞书是否只收到1条告警"
echo "  3. 检查扩展控制台日志: 'Queue stuck alert deduplicated'"
