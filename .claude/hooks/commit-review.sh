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

# Tool payload JSON is in $CLAUDE_TOOL_INPUT; check if this was `git commit`
RAW="${CLAUDE_TOOL_INPUT:-}"
if [ -z "$RAW" ]; then exit 0; fi

# Extract the command. If jq or node aren't available, fail-open.
CMD=""
if command -v node >/dev/null 2>&1; then
  CMD=$(node -e "
    try {
      const x = JSON.parse(process.env.RAW || '');
      process.stdout.write(String(x.command || x.cmd || ''));
    } catch (e) {}
  " 2>/dev/null || echo "")
fi

# Only fire on `git commit` (not `git commit --help`, not `git log`, etc.)
case "$CMD" in
  *"git commit"*)
    # Continue
    ;;
  *)
    exit 0
    ;;
esac

# Skip if we're in the middle of a rebase / merge / cherry-pick
if [ -d ".git/rebase-merge" ] || [ -d ".git/rebase-apply" ] || \
   [ -f ".git/MERGE_HEAD" ] || [ -f ".git/CHERRY_PICK_HEAD" ]; then
  exit 0
fi

# Skip if the last commit has a Skip-Review trailer
LAST_MSG=$(git log -1 --format=%B 2>/dev/null || echo "")
if echo "$LAST_MSG" | grep -qE "^Skip-Review:"; then
  BYPASS_LOG=".claude/workflow/issues.md"
  TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  SHA=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
  echo "- [$TIMESTAMP] [review_skipped] commit $SHA — $(echo "$LAST_MSG" | grep '^Skip-Review:' | head -1)" >> "$BYPASS_LOG"
  exit 0
fi

# Get changed files. Skip if the commit touches only docs/meta.
SHA=$(git rev-parse HEAD 2>/dev/null || exit 0)
CHANGED=$(git diff-tree --no-commit-id --name-only -r "$SHA" 2>/dev/null || echo "")
if [ -z "$CHANGED" ]; then exit 0; fi

# Filter out paths that don't warrant a code review
SUBSTANTIVE=$(echo "$CHANGED" | grep -vE '^(\.claude/|.*\.md$|.*\.snap$|dist/|node_modules/|packages/.*/dist/|\.gitignore)' || true)
if [ -z "$SUBSTANTIVE" ]; then
  # Docs/meta only — no review needed
  exit 0
fi

# Write a trigger marker; the /commit-review skill reads this on invocation
# and humans/agents can observe which commits want review.
cat > "$SCRATCH_DIR/pending-review.txt" <<TRIGGER
sha=$SHA
triggered_at=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
files_changed=$(echo "$CHANGED" | wc -l | tr -d ' ')
substantive_files=$(echo "$SUBSTANTIVE" | wc -l | tr -d ' ')
TRIGGER

exit 0
