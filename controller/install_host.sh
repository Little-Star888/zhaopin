#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
HOST_NAME="com.zhaopin.controller"
TEMPLATE_FILE="${SCRIPT_DIR}/${HOST_NAME}.template.json"
MANIFEST_DIR="${HOME}/.config/google-chrome/NativeMessagingHosts"
MANIFEST_FILE="${MANIFEST_DIR}/${HOST_NAME}.json"
HOST_PATH="${SCRIPT_DIR}/run_host.sh"
EXTENSION_ID="${1:-}"

if [ -z "${EXTENSION_ID}" ]; then
  echo "Usage: bash controller/install_host.sh <extension-id>"
  exit 1
fi

chmod +x "${HOST_PATH}"
mkdir -p "${MANIFEST_DIR}"

python3 - <<PY
from pathlib import Path
template = Path(r"${TEMPLATE_FILE}").read_text(encoding="utf-8")
manifest = template.replace("__HOST_PATH__", r"${HOST_PATH}").replace("__EXTENSION_ID__", r"${EXTENSION_ID}")
Path(r"${MANIFEST_FILE}").write_text(manifest, encoding="utf-8")
PY

echo "Installed Native Messaging host manifest:"
echo "  ${MANIFEST_FILE}"
echo ""
echo "Next steps:"
echo "  1. Reload the Chrome extension"
echo "  2. Open dashboard.html to let the extension wake Controller automatically"
