#!/bin/bash
# HTTP 控制面启动脚本

cd "$(dirname "$0")"

# P4: 支持通过环境变量配置端口
CONTROLLER_PORT="${CONTROLLER_PORT:-7893}"

export CONTROLLER_PORT

echo "======================================"
echo "Boss直聘采集器 - HTTP 控制面"
echo "======================================"
echo ""

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 错误: 未找到 Node.js，请先安装"
    exit 1
fi

echo "✅ Node.js 版本: $(node --version)"
echo "✅ 控制面端口: ${CONTROLLER_PORT}"
echo ""
echo "启动控制面服务..."
echo "访问地址: http://127.0.0.1:${CONTROLLER_PORT}"
echo ""
echo "环境变量:"
echo "  CONTROLLER_PORT=${CONTROLLER_PORT}"
echo ""
echo "按 Ctrl+C 停止服务"
echo "======================================"
echo ""

node server.js
