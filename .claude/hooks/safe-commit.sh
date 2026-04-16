#!/bin/bash
# safe-commit.sh — PreToolUse guard against worktree-isolation leaks.
#
# Phase 6c exposed a worktree leak: a blind-eval agent was assigned to a
# worktree but committed directly to main. The worktree existed; the agent
# either resolved .git through the shared dir, never changed CWD into the
# worktree, or committed after stepping out of it. The code landed fine;
# the isolation guarantee broke.
#
# This hook is an opt-in machine guard. When a worktree is spawned for
# agent work, the orchestrator writes a sentinel file at the worktree
# root (`.claude/worktree-sentinel`) whose contents are the worktree's
# expected absolute path. Any `git commit` the agent attempts is then
# checked: `git rev-parse --show-toplevel` MUST match the sentinel's
# recorded path, or the commit is blocked.
#
# Opt-in by design: outside of worktree-isolated batches, there is no
# sentinel and the hook is a no-op. Main-branch work from the user's
# primary clone is unaffected.
#
# Wired via `settings.json`:
#   "PreToolUse": [{ "matcher": "Bash",
#                    "hooks": [{ "command": "bash .claude/hooks/safe-commit.sh" }] }]
#
# Fail-loud. If the guard catches a mismatch, the hook exits non-zero
# with a message explaining what went wrong, which blocks the Bash tool
# from executing. The agent then sees the error and has to investigate.

set -uo pipefail

# Bail fast if there's no sentinel — i.e. this is normal-mode work, not
# a guarded worktree session.
SENTINEL_FILE=".claude/worktree-sentinel"
if [ ! -f "$SENTINEL_FILE" ]; then
  exit 0
fi

# Claude Code delivers the hook payload as JSON on stdin. Parse it to
# extract the bash command being attempted.
STDIN_PAYLOAD=$(cat 2>/dev/null || echo "")
if [ -z "$STDIN_PAYLOAD" ]; then
  exit 0
fi

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

# We only guard commit-producing operations. Every other shell command
# (including `cd`, `git status`, `npm test`) passes through untouched.
case "$CMD" in
  *"git commit"*|*"git cherry-pick"*|*"git rebase"*|*"git merge"*|*"git revert"*)
    # continue to guard check
    ;;
  *)
    exit 0
    ;;
esac

# Read the sentinel — the recorded worktree root path. Discard comment
# lines and whitespace.
EXPECTED=$(grep -v '^[[:space:]]*#' "$SENTINEL_FILE" 2>/dev/null \
           | grep -v '^[[:space:]]*$' \
           | head -n 1 \
           | tr -d '\r' \
           | tr -d '[:space:]' \
           || echo "")
if [ -z "$EXPECTED" ]; then
  echo "safe-commit: sentinel file exists but is empty — aborting commit to be safe." >&2
  exit 1
fi

# Resolve the current git toplevel. If this doesn't match the sentinel,
# the commit is being issued against a different repo / worktree than
# the agent was supposed to be working in.
ACTUAL=$(git rev-parse --show-toplevel 2>/dev/null | tr -d '\r' | tr -d '[:space:]')
if [ -z "$ACTUAL" ]; then
  echo "safe-commit: unable to resolve git toplevel — aborting commit." >&2
  exit 1
fi

# Normalise path separators (Git Bash emits forward slashes for both
# sides; this belt-and-braces step defends against mixed-slash paths
# that can appear when the sentinel is written by a different shell).
NORMAL_EXPECTED=$(echo "$EXPECTED" | tr '\\' '/')
NORMAL_ACTUAL=$(echo "$ACTUAL" | tr '\\' '/')

# Case-insensitive compare on Windows (Git Bash on NTFS). On POSIX this
# still works because the strings already match case.
NORMAL_EXPECTED_LC=$(echo "$NORMAL_EXPECTED" | tr '[:upper:]' '[:lower:]')
NORMAL_ACTUAL_LC=$(echo "$NORMAL_ACTUAL" | tr '[:upper:]' '[:lower:]')

if [ "$NORMAL_EXPECTED_LC" != "$NORMAL_ACTUAL_LC" ]; then
  cat >&2 <<ERR
safe-commit: worktree guard triggered — commit blocked.

Expected worktree root: $EXPECTED
Actual git toplevel:    $ACTUAL
Command:                $CMD

You are trying to land a commit in a different repo/worktree than the
one assigned to this session. This usually means:
  1. You stepped out of your worktree (e.g. `cd ..`) before committing.
  2. The git toplevel resolves through a shared .git directory pointing
     at the main repo instead of your worktree.
  3. Your shell was spawned outside the worktree and inherits its CWD.

Fix: cd into the worktree path above and re-run the commit, or spawn
a fresh shell inside the worktree. If this block is itself a bug in the
guard, remove the sentinel file (\`rm $SENTINEL_FILE\`) and reinvoke.
ERR
  exit 1
fi

exit 0
