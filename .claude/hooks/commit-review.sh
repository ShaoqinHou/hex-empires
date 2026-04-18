#!/bin/bash
# PostToolUse hook — detects a successful `git commit` and signals that the
# commit-review loop should run against HEAD. The loop itself is orchestrated
# by the /commit-review skill (Claude Code spawns subagents from there).
#
# This hook is fail-open by design: any error here never blocks the user's
# work. The loop is a recommendation engine, not a gate.
#
# Scope exclusions (hook returns immediately, does not trigger review):
#   - commit message contains "Skip-Review:" trailer
#   - commit touches ONLY .md / .claude/** / *.snap / dist/** / node_modules/**
#   - on conflict-resolution / rebase / cherry-pick state
#   - --no-verify was used (git doesn't invoke hooks, so we won't see it)
#
# This hook writes a trigger file; it does NOT spawn agents directly.
# That decoupling keeps the hook fast and lets the user defer review to
# explicit /commit-review invocation if preferred.

set -uo pipefail

SCRATCH_DIR=".claude/workflow/scratch"
mkdir -p "$SCRATCH_DIR" 2>/dev/null || exit 0

# Diagnostic trace — every invocation logs ENTRY here so we can confirm
# the hook actually fires on real git-commit calls. Safe to remove once
# the auto-fire regression is understood.
TRACE_FILE="$SCRATCH_DIR/hook-trace.log"
echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] ENTRY pid=$$ pwd=$(pwd)" >> "$TRACE_FILE" 2>/dev/null || true

# PHASE-IN-FLIGHT GUARD
# When the parent agent is orchestrating a long-running phase-implementer
# subagent, the hook must NOT spawn a parallel review/fix loop — the Phase 3
# scenario (2026-04-18) had the hook's fixer ship S-05 layered rendering
# while the Phase 3 subagent was doing the same work, producing duplicate
# commits and a merge conflict.
#
# Protocol: the parent creates .claude/workflow/scratch/.phase-in-flight
# before spawning an implementer, removes it after cherry-pick + merge.
# The file's content (optional) is logged to the trace for audit.
#
# The hook exits zero on detection so it's a no-op for the user's commit;
# the phase-implementer itself is responsible for reviewing its own output
# (or queuing it via normal /commit-review after the phase closes).
PHASE_LOCK="$SCRATCH_DIR/.phase-in-flight"
if [ -f "$PHASE_LOCK" ]; then
  LOCK_INFO=$(head -c 200 "$PHASE_LOCK" 2>/dev/null | tr -d '\n' || echo "")
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] EXIT phase-in-flight lock=${LOCK_INFO}" >> "$TRACE_FILE" 2>/dev/null || true
  exit 0
fi

# Claude Code delivers the hook payload as JSON on stdin. The shape is:
#   { session_id, transcript_path, cwd, permission_mode, hook_event_name,
#     tool_name, tool_input: { command, description, ... } }
# Previous revisions tried to read CLAUDE_TOOL_INPUT from env, which is NOT
# set by Claude Code — every PostToolUse fire silently produced empty CMD
# and exited zero. Root cause diagnosed 2026-04-16 via a debug-probe hook
# that captured stdin + env on a real invocation.
STDIN_PAYLOAD=$(cat 2>/dev/null || echo "")
echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] STDIN len=${#STDIN_PAYLOAD}" >> "$TRACE_FILE" 2>/dev/null || true
if [ -z "$STDIN_PAYLOAD" ]; then
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] EXIT empty-stdin" >> "$TRACE_FILE" 2>/dev/null || true
  exit 0
fi

# Extract the command the tool was asked to run. Only bash-tool payloads
# carry a meaningful `command`; other tools have different tool_input
# shapes and will fall through to the empty-CMD exit below.
CMD=""
if command -v node >/dev/null 2>&1; then
  CMD=$(printf '%s' "$STDIN_PAYLOAD" | node -e "
    let d = '';
    process.stdin.on('data', c => d += c);
    process.stdin.on('end', () => {
      try {
        const x = JSON.parse(d);
        const ti = (x && x.tool_input) || {};
        process.stdout.write(String(ti.command || ti.cmd || ''));
      } catch (e) {}
    });
  " 2>/dev/null || echo "")
fi

# Trace the command for diagnostics (truncate long payloads)
echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] CMD=${CMD:0:120}" >> "$TRACE_FILE" 2>/dev/null || true

# Fire on any command that PRODUCES a commit. cherry-pick + rebase + merge all
# land commits and should be reviewed the same way direct commits are. We do
# NOT fire on --abort / --skip / --continue variants that don't produce a new
# commit; the HEAD-SHA diff below filters those out naturally.
case "$CMD" in
  *"git commit"*|*"git cherry-pick"*|*"git rebase"*|*"git merge"*|*"git revert"*)
    echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] MATCH commit-producing" >> "$TRACE_FILE" 2>/dev/null || true
    ;;
  *)
    exit 0
    ;;
esac

# Skip if we're in the middle of an unfinished rebase / merge / cherry-pick.
# A completed cherry-pick has already cleared CHERRY_PICK_HEAD by the time this
# hook fires (git's --continue path removes it atomically with the commit), so
# the presence of these files means we're mid-conflict — no review yet.
if [ -d ".git/rebase-merge" ] || [ -d ".git/rebase-apply" ] || \
   [ -f ".git/MERGE_HEAD" ] || [ -f ".git/CHERRY_PICK_HEAD" ]; then
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] EXIT mid-conflict" >> "$TRACE_FILE" 2>/dev/null || true
  exit 0
fi

# Skip if HEAD didn't move (e.g. `git commit --amend --no-edit` on the same
# content, or `git cherry-pick --skip`). We compare the pre-command HEAD via
# ORIG_HEAD which cherry-pick/rebase/merge all set; for plain `git commit`
# ORIG_HEAD may be stale, so we also accept the fresh-commit case (no parent
# match yet).
PREV=$(git rev-parse ORIG_HEAD 2>/dev/null || echo "")
CURR=$(git rev-parse HEAD 2>/dev/null || echo "")
echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] HEAD=${CURR:0:8} ORIG_HEAD=${PREV:0:8}" >> "$TRACE_FILE" 2>/dev/null || true
if [ -n "$PREV" ] && [ "$PREV" = "$CURR" ]; then
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] EXIT head-unchanged" >> "$TRACE_FILE" 2>/dev/null || true
  exit 0
fi

# Skip if the last commit has a Skip-Review trailer
LAST_MSG=$(git log -1 --format=%B 2>/dev/null || echo "")
if echo "$LAST_MSG" | grep -qE "^Skip-Review:"; then
  BYPASS_LOG=".claude/workflow/issues.md"
  TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  SHA=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
  echo "- [$TIMESTAMP] [review_skipped] commit $SHA — $(echo "$LAST_MSG" | grep '^Skip-Review:' | head -1)" >> "$BYPASS_LOG"
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] EXIT skip-review-trailer" >> "$TRACE_FILE" 2>/dev/null || true
  exit 0
fi

# Get changed files. Skip if the commit touches only docs/meta.
SHA=$(git rev-parse HEAD 2>/dev/null || exit 0)
CHANGED=$(git diff-tree --no-commit-id --name-only -r "$SHA" 2>/dev/null || echo "")
echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] CHANGED=$(echo "$CHANGED" | tr '\n' ',')" >> "$TRACE_FILE" 2>/dev/null || true
if [ -z "$CHANGED" ]; then
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] EXIT no-changed-files" >> "$TRACE_FILE" 2>/dev/null || true
  exit 0
fi

# Filter out paths that don't warrant a code review
SUBSTANTIVE=$(echo "$CHANGED" | grep -vE '^(\.claude/|.*\.md$|.*\.snap$|dist/|node_modules/|packages/.*/dist/|\.gitignore)' || true)
echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] SUBSTANTIVE=$(echo "$SUBSTANTIVE" | tr '\n' ',')" >> "$TRACE_FILE" 2>/dev/null || true
if [ -z "$SUBSTANTIVE" ]; then
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] EXIT docs-meta-only" >> "$TRACE_FILE" 2>/dev/null || true
  exit 0
fi
echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] PROCEED sha=$SHA" >> "$TRACE_FILE" 2>/dev/null || true

# Write a trigger marker — quick-glance "what's the latest pending review".
# Back-compat with manual flows. The queue file below is the real work list.
cat > "$SCRATCH_DIR/pending-review.txt" <<TRIGGER
sha=$SHA
triggered_at=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
files_changed=$(echo "$CHANGED" | wc -l | tr -d ' ')
substantive_files=$(echo "$SUBSTANTIVE" | wc -l | tr -d ' ')
TRIGGER

# Append to the FIFO queue. Dedupe against shas already queued (same commit
# landing twice via amend + rebase, etc.).
QUEUE_FILE="$SCRATCH_DIR/review-queue.txt"
touch "$QUEUE_FILE"
if ! grep -qxF "$SHA" "$QUEUE_FILE" 2>/dev/null; then
  echo "$SHA" >> "$QUEUE_FILE"
fi

# Opt-in pause. If this file exists, the hook still queues but does NOT
# spawn a background driver. Reviews accumulate until a manual
# `/commit-review --drain-queue` or removal of the pause file.
if [ -f "$SCRATCH_DIR/review-pause" ]; then
  exit 0
fi

# Stale-lock detection. If a prior driver crashed without cleanup, the
# lockdir remains. 8-min threshold — long enough for a legitimate Fixer
# run, short enough to not block a whole session. Uses the lockdir's
# own mtime OR a heartbeat file the driver updates per-sha (see SKILL.md).
LOCK_DIR="$SCRATCH_DIR/.review.lock"
if [ -d "$LOCK_DIR" ]; then
  NOW_TS=$(date +%s)
  if [ -f "$LOCK_DIR/heartbeat" ]; then
    MTIME=$(stat -c %Y "$LOCK_DIR/heartbeat" 2>/dev/null || echo "$NOW_TS")
  else
    MTIME=$(stat -c %Y "$LOCK_DIR" 2>/dev/null || echo "$NOW_TS")
  fi
  AGE=$(( NOW_TS - MTIME ))
  if [ "$AGE" -gt 480 ]; then
    rm -rf "$LOCK_DIR" 2>/dev/null
  fi
fi

# Try to acquire the driver lock atomically. If another driver is running
# we just leave our queue entry and exit — that driver will drain us too.
if ! mkdir "$LOCK_DIR" 2>/dev/null; then
  exit 0
fi

# Lock acquired; spawn a background claude -p to drain the queue. The
# driver session has a fresh context and inherits OAuth creds from
# ~/.claude/.credentials.json. The subshell explicitly releases the lock
# as its last line; EXIT traps in disowned subshells are unreliable on
# MINGW64. Explicit release + an 8-min stale-timeout handles the crash
# case.
#
# Flag stack:
#   --dangerously-skip-permissions  Per-tool-call bypass. WF-AUTO-2b/7
#     observed this alone wasn't enough — late Write calls still hit
#     "permission prompt was declined" on Windows. Needed as the
#     inner layer.
#   --permission-mode bypassPermissions  Session-mode bypass. Covers
#     the cases the inner flag misses. Belt-and-braces — 2026-04-17
#     regression test (review on 1290b7e) showed dropping either flag
#     re-opens the gap on some Claude Code versions.
#   --model sonnet  The orchestrator's job is mechanical (read queue,
#     spawn sub-agents, parse YAML, branch on verdicts, write files).
#     Sub-agents use their own models per SKILL.md (Sonnet for
#     Reviewer+Fixer, Opus for Arbiter on dispute).
LOG_FILE="$SCRATCH_DIR/review-driver-$(date -u +%Y%m%dT%H%M%SZ).log"
# MSYS_NO_PATHCONV=1 is CRITICAL on Windows Git Bash / MINGW64 — without
# it the POSIX-to-Windows path translator rewrites `/commit-review` to
# `C:/Program Files/Git/commit-review`.
(
  MSYS_NO_PATHCONV=1 claude \
    --dangerously-skip-permissions \
    --permission-mode bypassPermissions \
    --model sonnet \
    -p "/commit-review --drain-queue" \
    > "$LOG_FILE" 2>&1
  rm -rf "$LOCK_DIR" 2>/dev/null
) </dev/null >/dev/null 2>&1 &
disown 2>/dev/null || true

exit 0
