#!/usr/bin/env bash

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CONTROLLER_DIR="$PROJECT_ROOT/controller"

rm -rf "$CONTROLLER_DIR/batches/output"
mkdir -p "$CONTROLLER_DIR/batches/output"

rm -f \
  "$CONTROLLER_DIR/results.json" \
  "$CONTROLLER_DIR/status.json" \
  "$CONTROLLER_DIR/task_id_counter.json" \
  "$CONTROLLER_DIR/task_queue.json"

echo "已清理本地运行产物"

