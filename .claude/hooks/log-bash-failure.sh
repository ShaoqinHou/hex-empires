#!/bin/bash
# PostToolUseFailure hook for Bash — logs command failures to issues.md

WORKFLOW_DIR=".claude/workflow"
ISSUES_FILE="$WORKFLOW_DIR/issues.md"
mkdir -p "$WORKFLOW_DIR"

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
ENTRY="- [$TIMESTAMP] [command_failure] Bash command failed"

LOCKDIR="$WORKFLOW_DIR/.issues.lockdir"
if mkdir "$LOCKDIR" 2>/dev/null; then
  echo "$ENTRY" >> "$ISSUES_FILE"
  rmdir "$LOCKDIR"
else
  sleep 0.5
  echo "$ENTRY" >> "$ISSUES_FILE"
fi

exit 0
