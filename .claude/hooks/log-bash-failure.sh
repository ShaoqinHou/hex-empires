#!/bin/bash
# PostToolUseFailure hook for Bash — logs command failures to issues.md
# Captures the first 120 chars of the failed command so the log is diagnostic
# rather than a sea of "Bash command failed" entries (audit finding F-14).

WORKFLOW_DIR=".claude/workflow"
ISSUES_FILE="$WORKFLOW_DIR/issues.md"
mkdir -p "$WORKFLOW_DIR"

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# $CLAUDE_TOOL_INPUT is the JSON tool payload; extract the command field if
# present, else fall back to the raw payload, else empty.
# NOTE: node child processes only see exported env vars. Previous revision
# used `process.env.RAW` on a non-exported local, silently always emitting
# "(command not captured)". Read CLAUDE_TOOL_INPUT directly from env instead.
CMD=""
if command -v node >/dev/null 2>&1 && [ -n "${CLAUDE_TOOL_INPUT:-}" ]; then
  CMD=$(node -e "
    try {
      const x = JSON.parse(process.env.CLAUDE_TOOL_INPUT || '');
      process.stdout.write(String(x.command || x.cmd || '').slice(0, 120));
    } catch (e) {
      process.stdout.write(String(process.env.CLAUDE_TOOL_INPUT || '').slice(0, 120));
    }
  " 2>/dev/null || echo "")
fi
CMD="${CMD:-(command not captured)}"
# Strip newlines + pipe chars that would break the markdown table form
CMD=$(echo "$CMD" | tr '\n|' '  ')

ENTRY="- [$TIMESTAMP] [command_failure] \`${CMD}\`"

LOCKDIR="$WORKFLOW_DIR/.issues.lockdir"
if mkdir "$LOCKDIR" 2>/dev/null; then
  echo "$ENTRY" >> "$ISSUES_FILE"
  rmdir "$LOCKDIR"
else
  sleep 0.5
  echo "$ENTRY" >> "$ISSUES_FILE"
fi

exit 0
