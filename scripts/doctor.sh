#!/usr/bin/env bash

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CONTROLLER_DIR="$PROJECT_ROOT/controller"

echo "PROJECT_ROOT=$PROJECT_ROOT"

if command -v node >/dev/null 2>&1; then
  echo "node: $(node --version)"
else
  echo "node: missing"
fi

if [ -f "$CONTROLLER_DIR/package.json" ]; then
  echo "controller/package.json: ok"
else
  echo "controller/package.json: missing"
fi

if [ -d "$CONTROLLER_DIR/node_modules" ]; then
  echo "controller/node_modules: present"
else
  echo "controller/node_modules: missing"
fi

if [ -f "$CONTROLLER_DIR/runtime_config.json" ]; then
  echo "controller/runtime_config.json: present"
else
  echo "controller/runtime_config.json: missing"
fi

if [ -f "$CONTROLLER_DIR/feishu_targets.json" ]; then
  echo "controller/feishu_targets.json: present"
else
  echo "controller/feishu_targets.json: missing"
fi

