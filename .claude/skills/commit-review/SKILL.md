---
name: commit-review
description: Orchestrate the three-agent review loop (Reviewer → Fixer → Arbiter → iter-2 Reviewer) on one or more commits. Auto-invoked in the background by the PostToolUse hook after every substantive commit. TRIGGER WHEN user says "run commit-review" / "review HEAD" / "review commit <sha>" / "sweep the last N commits", OR you want to re-run review on a commit whose outcome file is missing. DO NOT TRIGGER proactively on every commit — the hook already does that.
disable-model-invocation: true
---

# /commit-review — Orchestrator

Drive the Reviewer → Fixer → Arbiter → iter-2 loop on one or more commits. The three agents are defined in `.claude/agents/` (reviewer, fixer, arbiter) — spawn them by name.

## Invocation modes

| Form | Meaning |
|---|---|
| `/commit-review` | Review HEAD. Manual mode. |
| `/commit-review <sha>` | Review a specific commit. Manual mode. |
| `/commit-review --drain-queue` | Process every sha in `scratch/review-queue.txt`. Auto mode. |
| `/commit-review --sweep [since=<ref>]` | Review all commits between `<ref>` (default HEAD~10) and HEAD. Manual mode. |

## Pre-flight (auto mode only)

1. Write heartbeat: `date -u +%s > scratch/.review.lock/heartbeat`
2. If `scratch/review-pause` exists → exit immediately

## Build target list

- `--drain-queue`: read `review-queue.txt`, deduplicate. Truncate to 0 when done; re-append HEAD-MOVED shas.
- `--sweep`: `git log --format=%H <ref>..HEAD --reverse`
- Specific sha: single-element list
- No args: `[$(git rev-parse HEAD)]`

**Strict scope:** ONLY process shas from this list. Do NOT retroactively scan scratch/ for missing outcomes.

## Per-sha loop (max 3 iterations)

For each `target_sha`, set `current_sha = target_sha`, `iter = 1`:

### 1. Idempotency

If `review-<current_sha>.md` exists with `verdict: PASS` → skip.

### 2. Spawn Reviewer

```
Agent(reviewer) with prompt:
"Audit commit <current_sha>. Run git diff <current_sha>~1..<current_sha>.
Produce .claude/workflow/scratch/review-<current_sha>.md.
Iteration: <iter>."
```

If iter ≥ 2, add: "Previous report at review-<previous_sha>.md. Inherit finding IDs."

### 3. Read verdict

- `PASS` (or FAIL with 0 BLOCKs) → write outcome, next sha.
- `FAIL` with ≥1 BLOCK → continue to Fixer.

### 4. HEAD-MOVED check

If `git rev-parse HEAD ≠ current_sha` → re-queue, record `head-moved`, next sha.

### 5. Spawn Fixer

```
Agent(fixer) with prompt:
"Review report at .claude/workflow/scratch/review-<current_sha>.md.
Address BLOCK findings only."
```

The Fixer's `isolation: worktree` means Claude Code auto-creates a clean worktree. Commits land on a branch there.

### 6. Handle outcome

- **All BLOCKs fixed:** Read fix-log for commit sha. Set `previous_sha = current_sha`, `current_sha = fixer_sha`, `iter += 1`. Loop to step 1.
- **HEAD-MOVED dispute:** Re-queue, next sha.
- **Substantive dispute:** Spawn Arbiter (step 7).
- **Iter ≥ 3:** STALLED → append to `issues.md`, next sha.

**Loop invariant:** only way to reach `pass` from FAIL is a successful iter-2+ Reviewer.

### 7. Spawn Arbiter (only on dispute)

```
Agent(arbiter) with prompt:
"Inputs: review-<current_sha>.md + fix-log-<current_sha>.md.
Rule on the dispute(s). Write dispute-<current_sha>.md."
```

- `fixer-correct` → finding closed. If only BLOCK, this sha is PASS.
- `reviewer-correct` → re-spawn Fixer with arbiter's guidance. `iter += 1`.
- `escalate-human` → STALLED.

## Per-sha outcome (MANDATORY)

Write `scratch/review-outcome-<target_sha>.md` for every target sha before advancing.

## Batch summary (auto mode, MANDATORY)

Write `scratch/last-review-summary.md` with drain timing, pass/stall counts, auto-fix branches.

## PRINCIPLE-GAP logging

If any finding doesn't match a named trap in CLAUDE.md's trap registry, append:
```
- [<TS>] [PRINCIPLE-GAP] <finding-id> on <sha>: <1-line description>
```
to `.claude/workflow/issues.md`. Do NOT edit CLAUDE.md.

## Escape hatches

- `Skip-Review:` trailer in commit message → hook skips
- `scratch/review-pause` file → hook queues but doesn't spawn
- `// review-override:` inline comment → Reviewer downgrades BLOCK to NOTE
