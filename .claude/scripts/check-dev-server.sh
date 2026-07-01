#!/usr/bin/env bash
set -euo pipefail

PORT="${1:-4200}"
PATH_ARG="${2:-/}"
TIMEOUT_SEC="${3:-60}"

URL="http://localhost:${PORT}${PATH_ARG}"
START_TIME=$(date +%s)
ERRORS=()

poll_server() {
  local http_status
  http_status=$(curl -s -o /dev/null -w "%{http_code}" "$URL" 2>/dev/null || true)
  echo "$http_status"
}

while true; do
  STATUS=$(poll_server)

  if [ "$STATUS" = "200" ]; then
    ELAPSED=$(( $(date +%s) - START_TIME ))
    echo "{ \"ready\": true, \"status\": 200, \"url\": \"$URL\", \"elapsed_seconds\": $ELAPSED, \"errors\": [] }"
    exit 0
  fi

  NOW=$(date +%s)
  if [ $((NOW - START_TIME)) -ge "$TIMEOUT_SEC" ]; then
    echo "{ \"ready\": false, \"status\": ${STATUS:-0}, \"url\": \"$URL\", \"elapsed_seconds\": $TIMEOUT_SEC, \"errors\": [\"Timeout: server did not respond with 200 within ${TIMEOUT_SEC}s\"] }"
    exit 1
  fi

  sleep 1
done
