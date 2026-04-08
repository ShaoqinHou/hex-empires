#!/bin/bash
# Session start hook — reports workspace health summary

WORKFLOW_DIR=".claude/workflow"

BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
ENGINE_PKG=$([ -f "packages/engine/package.json" ] && echo "ok" || echo "missing")
WEB_PKG=$([ -f "packages/web/package.json" ] && echo "ok" || echo "missing")
NODE_MODS=$([ -d "node_modules" ] && echo "ok" || echo "missing")

WEB_PORT="down"
if command -v curl &>/dev/null; then
  curl -s --connect-timeout 1 http://localhost:5174 &>/dev/null && WEB_PORT="up"
fi

VERIFY_STATUS="none"
if [ -f "$WORKFLOW_DIR/verify-marker.txt" ]; then
  MARKER_AGE=$(( $(date +%s) - $(date -r "$WORKFLOW_DIR/verify-marker.txt" +%s 2>/dev/null || echo 0) ))
  if [ "$MARKER_AGE" -lt 3600 ]; then
    VERIFY_STATUS="fresh (${MARKER_AGE}s ago)"
  else
    VERIFY_STATUS="stale (${MARKER_AGE}s ago)"
  fi
fi

SYSTEM_COUNT=$(ls packages/engine/src/systems/*.ts 2>/dev/null | grep -v __tests__ | wc -l | tr -d ' ')
DATA_CIVS=$(ls packages/engine/src/data/civilizations/*.ts 2>/dev/null | grep -v index | wc -l | tr -d ' ')

cat <<EOF
{"additionalContext": "Workspace health:\n- Branch: ${BRANCH}\n- Engine package: ${ENGINE_PKG}\n- Web package: ${WEB_PKG}\n- node_modules: ${NODE_MODS}\n- Web server (5174): ${WEB_PORT}\n- Systems: ${SYSTEM_COUNT}\n- Civilizations: ${DATA_CIVS}\n- Verify marker: ${VERIFY_STATUS}"}
EOF
