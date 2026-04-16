#!/bin/bash
# Session start hook — reports workspace health + commit-review state

WORKFLOW_DIR=".claude/workflow"
SCRATCH_DIR="$WORKFLOW_DIR/scratch"

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

# ── Commit-review state ──────────────────────────────────────────────
QUEUE_DEPTH=0
if [ -f "$SCRATCH_DIR/review-queue.txt" ]; then
  QUEUE_DEPTH=$(grep -c . "$SCRATCH_DIR/review-queue.txt" 2>/dev/null || echo 0)
fi

DRIVER_STATUS="idle"
if [ -d "$SCRATCH_DIR/.review.lock" ]; then
  NOW_TS=$(date +%s)
  if [ -f "$SCRATCH_DIR/.review.lock/heartbeat" ]; then
    LOCK_TS=$(stat -c %Y "$SCRATCH_DIR/.review.lock/heartbeat" 2>/dev/null || echo "$NOW_TS")
  else
    LOCK_TS=$(stat -c %Y "$SCRATCH_DIR/.review.lock" 2>/dev/null || echo "$NOW_TS")
  fi
  AGE=$(( NOW_TS - LOCK_TS ))
  if [ "$AGE" -gt 480 ]; then
    DRIVER_STATUS="stale-lock (${AGE}s; will be broken on next commit)"
  else
    DRIVER_STATUS="running (${AGE}s)"
  fi
fi

LAST_BATCH="none"
if [ -f "$SCRATCH_DIR/last-review-summary.md" ]; then
  PASSED=$(grep -E '^passed:' "$SCRATCH_DIR/last-review-summary.md" 2>/dev/null | head -1 | awk '{print $2}' | tr -d ' ')
  STALLED=$(grep -E '^stalled:' "$SCRATCH_DIR/last-review-summary.md" 2>/dev/null | head -1 | awk '{print $2}' | tr -d ' ')
  TS=$(grep -E '^drain_finished:' "$SCRATCH_DIR/last-review-summary.md" 2>/dev/null | head -1 | cut -d' ' -f2-)
  if [ -n "$PASSED" ]; then
    LAST_BATCH="passed=${PASSED} stalled=${STALLED:-0} at ${TS:-?}"
  else
    LAST_BATCH="file exists (see scratch/last-review-summary.md)"
  fi
fi

# Unmerged auto-fix branches — Fixer's output in auto mode lands on
# throwaway branches that need human merge-or-discard attention.
AUTOFIX_COUNT=0
AUTOFIX_LIST=""
AUTOFIX_BRANCHES=$(git branch --list 'auto-fix/*' 2>/dev/null | sed 's/^[* ] //' | head -5)
if [ -n "$AUTOFIX_BRANCHES" ]; then
  AUTOFIX_COUNT=$(echo "$AUTOFIX_BRANCHES" | grep -c . )
  AUTOFIX_LIST=$(echo "$AUTOFIX_BRANCHES" | tr '\n' ',' | sed 's/,$//')
fi

PAUSE_STATE="off"
[ -f "$SCRATCH_DIR/review-pause" ] && PAUSE_STATE="ON (commits queue but no auto-drive)"

cat <<EOF
{"additionalContext": "Workspace health:\n- Branch: ${BRANCH}\n- Engine package: ${ENGINE_PKG}\n- Web package: ${WEB_PKG}\n- node_modules: ${NODE_MODS}\n- Web server (5174): ${WEB_PORT}\n- Systems: ${SYSTEM_COUNT}\n- Civilizations: ${DATA_CIVS}\n- Verify marker: ${VERIFY_STATUS}\n\nCommit-review:\n- Queue depth: ${QUEUE_DEPTH}\n- Driver: ${DRIVER_STATUS}\n- Auto-pause: ${PAUSE_STATE}\n- Last batch: ${LAST_BATCH}\n- Auto-fix branches pending merge/discard: ${AUTOFIX_COUNT}${AUTOFIX_LIST:+ (${AUTOFIX_LIST})}"}
EOF
