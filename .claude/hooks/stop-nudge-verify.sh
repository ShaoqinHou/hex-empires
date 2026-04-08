#!/bin/bash
# Stop hook — nudges to run /verify if code changed without verification

WORKFLOW_DIR=".claude/workflow"
VERIFY_MARKER="$WORKFLOW_DIR/verify-marker.txt"
GUARD="$WORKFLOW_DIR/.stop_hook_active"
mkdir -p "$WORKFLOW_DIR"

if [ -f "$GUARD" ]; then
  rm -f "$GUARD"
  exit 0
fi

CHANGED_SOURCE=$(git diff --name-only HEAD 2>/dev/null | grep -E '^packages/.*\.(ts|tsx)$' | head -1)
UNTRACKED_SOURCE=$(git ls-files --others --exclude-standard 2>/dev/null | grep -E '^packages/.*\.(ts|tsx)$' | head -1)

HAS_CHANGES=""
if [ -n "$CHANGED_SOURCE" ] || [ -n "$UNTRACKED_SOURCE" ]; then
  HAS_CHANGES="yes"
fi

if [ -n "$HAS_CHANGES" ]; then
  NEEDS_VERIFY="yes"
  if [ -f "$VERIFY_MARKER" ]; then
    MARKER_AGE=$(( $(date +%s) - $(date -r "$VERIFY_MARKER" +%s 2>/dev/null || echo 0) ))
    if [ "$MARKER_AGE" -lt 1800 ]; then
      NEEDS_VERIFY=""
    fi
  fi

  if [ -n "$NEEDS_VERIFY" ]; then
    touch "$GUARD"
    cat <<'JSON'
{"decision":"block","reason":"You have new code changes but no recent E2E verification. Please run /verify to check your changes in the browser before stopping."}
JSON
    exit 0
  fi
fi

exit 0
