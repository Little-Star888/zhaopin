#!/bin/bash
set -e

MANIFEST_FILE="${HOME}/.config/google-chrome/NativeMessagingHosts/com.zhaopin.controller.json"

if [ -f "${MANIFEST_FILE}" ]; then
  rm -f "${MANIFEST_FILE}"
  echo "Removed ${MANIFEST_FILE}"
else
  echo "No manifest found at ${MANIFEST_FILE}"
fi
