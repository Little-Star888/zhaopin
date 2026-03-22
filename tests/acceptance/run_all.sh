#!/bin/bash
# 验收脚本统一入口

set -e

cd "$(dirname "$0")"

# 解析参数
MODE="${1:---help}"
CONTROLLER_URL="${CONTROLLER_URL:-http://127.0.0.1:7893}"

show_help() {
    cat <<EOF
用法: $0 [选项]

选项:
  --structural    运行结构验收（P0-P4，不依赖Boss站点）
  --full          运行全部验收（结构 + R4 真实抽检指引）
  --help          显示此帮助

环境变量:
  CONTROLLER_URL  控制面地址（默认: http://127.0.0.1:7893）

示例:
  $0 --structural
  CONTROLLER_URL=http://127.0.0.1:7894 $0 --structural
EOF
}

# 检查控制面是否可访问
check_controller() {
    echo "检查控制面连接: $CONTROLLER_URL"
    if ! curl -s "$CONTROLLER_URL/status" > /dev/null; then
        echo "❌ 控制面不可访问: $CONTROLLER_URL"
        echo "请确保控制面已启动: cd controller && bash start.sh"
        exit 1
    fi
    echo "✅ 控制面连接正常"
    echo ""
}

# 运行单个测试脚本
run_test() {
    local script="$1"
    local name="$2"
    
    echo "######################################"
    echo "# $name"
    echo "######################################"
    echo ""
    
    if bash "$script"; then
        echo ""
        echo "✅ $name 通过"
        return 0
    else
        echo ""
        echo "❌ $name 失败"
        return 1
    fi
}

# 运行结构验收（P0-P4）
run_structural() {
    echo "######################################"
    echo "# 开始结构验收 (P0-P4)"
    echo "######################################"
    echo ""
    
    local FAILED=0
    
    # P0: 状态机收口
    run_test "01_status_machine.sh" "P0 状态机收口" || FAILED=1
    
    echo ""
    echo "--------------------------------------"
    echo ""
    
    # P1: 任务源收口
    run_test "02_task_source.sh" "P1 任务源收口" || FAILED=1
    
    echo ""
    echo "--------------------------------------"
    echo ""
    
    # P2: 状态计数器与数据结构
    run_test "03_status_counters.sh" "P2 状态计数器" || FAILED=1
    
    echo ""
    echo "--------------------------------------"
    echo ""
    
    # P3: 告警去重
    run_test "04_alert_dedup.sh" "P3 告警去重" || FAILED=1

    echo ""
    echo "--------------------------------------"
    echo ""

    # P4: /report 匹配逻辑
    run_test "05_report_matching.sh" "P4 /report 匹配逻辑" || FAILED=1

    echo ""
    echo "######################################"
    if [ $FAILED -eq 0 ]; then
        echo "# 结构验收全部通过 ✅"
    else
        echo "# 结构验收部分失败 ❌"
    fi
    echo "######################################"
    
    return $FAILED
}

# 运行真实抽检
run_real_world() {
    echo ""
    echo "######################################"
    echo "# 真实抽检（需扩展 + Boss站点）"
    echo "######################################"
    echo ""
    echo "⚠️  以下测试需要："
    echo "   1. Chrome扩展已加载并配置正确"
    echo "   2. 可访问 Boss直聘 (zhipin.com)"
    echo "   3. 飞书配置正确"
    echo ""
    echo "请手动执行以下验证:"
    echo ""
    echo "【P1 任务源模式真实验证】"
    echo "   1. 设置 CONFIG.TASK_SOURCE_MODE='controller_only'"
    echo "   2. 不启动控制面，触发采集"
    echo "      期望日志: 'controller_only: controller unreachable, skip'"
    echo "   3. 启动控制面但不添加任务，触发采集"
    echo "      期望日志: 'controller_only: no task available, skip'"
    echo "   4. 向控制面添加任务，触发采集"
    echo "      期望日志: 'task source: controller'"
    echo ""
    echo "【队列堆积告警真实验证】"
    echo "   执行: bash tests/acceptance/03b_queue_stuck_alert_manual.sh"
    echo "   按照提示手动验证"
    echo ""
    echo "【R4 小规模真实抽检】"
    echo "   执行: bash tests/acceptance/06_real_smoke_manual.sh"
    echo "   按照提示完成 real_smoke_*.json 和结论模板"
    echo ""
    echo "【告警去重真实验证】"
    echo "   1. 在30分钟内连续触发相同告警条件"
    echo "   2. 期望: 飞书只收到1条告警"
    echo "   3. 检查扩展日志: 'Queue stuck alert deduplicated'"
    echo "   4. 等待30分钟后再次触发"
    echo "   5. 期望: 正常发送新的告警"
    echo ""
}

case "$MODE" in
    --structural)
        check_controller
        run_structural
        exit $?
        ;;
    --full)
        check_controller
        run_structural
        run_real_world
        ;;
    --help|-h|*)
        show_help
        ;;
esac
