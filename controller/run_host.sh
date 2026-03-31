#!/bin/bash
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
exec /usr/bin/env node "${SCRIPT_DIR}/native_host.js"
