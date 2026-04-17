#!/bin/bash
# SessionStart hook — workspace health only.
# Rules auto-load from .claude/rules/*.md — no injection needed.

SCRATCH_DIR=".claude/workflow/scratch"

export HEX_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
export HEX_MODS=$([ -d "node_modules" ] && echo "ok" || echo "missing")
export HEX_PORT="down"
if command -v curl &>/dev/null; then
  curl -s --connect-timeout 1 http://localhost:5174 &>/dev/null && HEX_PORT="up"
fi
export HEX_QUEUE=0
# grep -c on an empty file prints "0" AND exits 1 — so `|| echo 0` would append
# a second "0" and the captured string becomes "0\n0". Guard with -s (exists +
# non-empty) and let grep own the number.
if [ -s "$SCRATCH_DIR/review-queue.txt" ]; then
  HEX_QUEUE=$(grep -c '[^ ]' "$SCRATCH_DIR/review-queue.txt" 2>/dev/null)
  [ -z "$HEX_QUEUE" ] && HEX_QUEUE=0
fi
export HEX_DRIVER="idle"
if [ -d "$SCRATCH_DIR/.review.lock" ]; then
  HEX_DRIVER="running"
fi
export HEX_AUTOFIX=$(git branch --list 'auto-fix/*' 2>/dev/null | sed 's/^[* ] //' | head -5 | tr '\n' ',' | sed 's/,$//')

python <<'PY'
import json, os
parts = [
    f"branch={os.environ.get('HEX_BRANCH','?')}",
    f"modules={os.environ.get('HEX_MODS','?')}",
    f"server(5174)={os.environ.get('HEX_PORT','?')}",
    f"review-queue={os.environ.get('HEX_QUEUE','0')}",
    f"driver={os.environ.get('HEX_DRIVER','idle')}",
]
af = os.environ.get('HEX_AUTOFIX', '')
if af:
    parts.append(f"auto-fix={af}")
ctx = "Workspace: " + " | ".join(parts)
print(json.dumps({"additionalContext": ctx}))
PY
