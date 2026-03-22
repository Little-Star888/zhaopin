#!/usr/bin/env bash

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CONTROLLER_DIR="$PROJECT_ROOT/controller"

echo "==> 检查 Node.js"
if ! command -v node >/dev/null 2>&1; then
  echo "未检测到 Node.js，请先安装 Node.js 20+"
  exit 1
fi
echo "Node.js: $(node --version)"

echo "==> 安装 controller 依赖"
cd "$CONTROLLER_DIR"
npm install

echo "==> 准备本地配置"
if [ ! -f "$CONTROLLER_DIR/runtime_config.json" ]; then
  cp "$CONTROLLER_DIR/runtime_config.example.json" "$CONTROLLER_DIR/runtime_config.json"
  echo "已创建 controller/runtime_config.json"
fi

if [ ! -f "$CONTROLLER_DIR/feishu_targets.json" ]; then
  cp "$CONTROLLER_DIR/feishu_targets.example.json" "$CONTROLLER_DIR/feishu_targets.json"
  echo "已创建 controller/feishu_targets.json"
fi

mkdir -p "$CONTROLLER_DIR/batches/output"

echo ""
echo "安装完成。下一步："
echo "1. 编辑 controller/feishu_targets.json"
echo "2. 打开 chrome://extensions/ 并加载 crawler/extension/"
echo "3. 启动控制面: bash controller/start.sh"
echo "4. 运行样例: node controller/run_batch.js controller/batches/sample_batch.json"

