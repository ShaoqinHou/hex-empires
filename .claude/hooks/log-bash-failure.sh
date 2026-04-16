#!/bin/bash
# PostToolUseFailure hook for Bash — logs command failures to issues.md
# Captures the first 120 chars of the failed command so the log is diagnostic
# rather than a sea of "Bash command failed" entries (audit finding F-14).

WORKFLOW_DIR=".claude/workflow"
ISSUES_FILE="$WORKFLOW_DIR/issues.md"
mkdir -p "$WORKFLOW_DIR"

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Claude Code delivers the hook payload as JSON on stdin (NOT via
# CLAUDE_TOOL_INPUT env — that var is not set by the harness). Earlier
# revisions tried env; they all produced "(command not captured)" because
# the var was always unset. Diagnosed 2026-04-16 via a debug probe.
STDIN_PAYLOAD=$(cat 2>/dev/null || echo "")
CMD=""
if command -v node >/dev/null 2>&1 && [ -n "$STDIN_PAYLOAD" ]; then
  CMD=$(printf '%s' "$STDIN_PAYLOAD" | node -e "
    let d = '';
    process.stdin.on('data', c => d += c);
    process.stdin.on('end', () => {
      try {
        const x = JSON.parse(d);
        const ti = (x && x.tool_input) || {};
        process.stdout.write(String(ti.command || ti.cmd || '').slice(0, 120));
      } catch (e) {
        process.stdout.write(d.slice(0, 120));
      }
    });
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
