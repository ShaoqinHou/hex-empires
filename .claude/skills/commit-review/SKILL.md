---
name: commit-review
description: Orchestrate the commit-review loop (Reviewer → Fixer → Arbiter → iter-2 Reviewer) on one or more commits. Auto-invoked in the background by the PostToolUse hook after every substantive commit, OR manually invoked with a specific sha or --sweep.
---

# /commit-review — Orchestrator

You are the commit-review orchestrator. Your job: drive the three-agent loop end-to-end on one or more target commits. You do not review code yourself — you spawn sub-agents (Agent tool) and chain them based on the artifacts they produce.

## Invocation modes

| Form | Meaning |
|---|---|
| `/commit-review` | Review HEAD. Single commit. **Manual mode** (Fixer commits on current branch). |
| `/commit-review <sha>` | Review a specific commit. Manual mode. |
| `/commit-review --drain-queue` | Process every sha in `.claude/workflow/scratch/review-queue.txt`, then empty the queue. **Auto mode** (Fixer commits to `auto-fix/<sha>-<ts>` branches — NEVER on the current branch). This is what the hook invokes in the background. |
| `/commit-review --sweep [since=<ref>]` | Review every commit between `<ref>` (default `HEAD~10`) and HEAD. Manual mode. |

**Mode flag:** When driving `--drain-queue`, ALWAYS pass `AUTO_MODE=1` in the Fixer prompt. For all other modes, do not pass it — Fixer commits on the current branch and the human is implicitly consenting.

## Step 0 — Pre-flight (auto mode only)

If invoked with `--drain-queue`:

1. The spawning hook already acquired `.claude/workflow/scratch/.review.lock/` via atomic `mkdir`. You are the single driver. The hook's subshell explicitly releases the lock when it exits (after you return). You do NOT need to release it manually.
2. **Heartbeat:** write `date -u +%s > .claude/workflow/scratch/.review.lock/heartbeat` at the start of every target-sha iteration. The hook uses this file's mtime for stale detection (8-min threshold). A long Fixer run without heartbeats would otherwise look stale and get its lock broken.
3. **Check pause:** if `.claude/workflow/scratch/review-pause` exists, write a brief line to `scratch/last-review-summary.md` noting "paused, skipped N queued shas" and exit immediately. Do not process the queue.

## Step 1 — Build the target list

- `--drain-queue`: read all lines from `review-queue.txt`. Deduplicate preserving order. That list is your targets. When you finish processing (successful, stalled, or HEAD-moved), truncate the queue file to 0 bytes; re-append any shas that couldn't be processed (e.g. HEAD-MOVED) before exit.
- `--sweep [since=<ref>]`: run `git log --format=%H <ref>..HEAD --reverse` (default `<ref>` is `HEAD~10`). That's the target list.
- Specific `<sha>` argument: single-element list with that sha.
- No args: `[$(git rev-parse HEAD)]`.

## Step 2 — Per-sha loop (max 3 iterations)

For each `target_sha` in the list, initialize `current_sha = target_sha`, `iter = 1`:

### 2a. Heartbeat + idempotency

- Auto mode: `date -u +%s > scratch/.review.lock/heartbeat`.
- If `.claude/workflow/scratch/review-<current_sha>.md` already exists AND contains `verdict: PASS` in its YAML front-matter, skip — this sha has already been reviewed clean. Move to next target_sha.

### 2b. Spawn the Reviewer

Use the Agent tool with `subagent_type: general-purpose`, `model: sonnet`. Prompt template:

> You are the Reviewer agent for the hex-empires commit-review loop. Read `.claude/skills/commit-review/reviewer-prompt.md` for your full instructions; follow them exactly.
>
> Audit commit `<current_sha>` in the main repo at `C:\Users\housh\Documents\monoWeb\hex-empires`. Run `git diff <current_sha>~1..<current_sha>` to see the diff, read the touched files in full, audit against `.claude/rules/*.md` and `.claude/workflow/design/standards.md`. Produce `.claude/workflow/scratch/review-<current_sha>.md` per your prompt's schema.
>
> Iteration: `<iter>`.
> (if iter ≥ 2:) Previous iteration's report is at `.claude/workflow/scratch/review-<previous_sha>.md`. Inherit finding IDs: findings that re-appear keep the same ID; new findings are regressions and get new IDs.
>
> READ-ONLY. No edits. No commits.

Wait for the agent to return. Verify `review-<current_sha>.md` exists and has a parseable `verdict:` field. If file missing or malformed, record `final_state: malformed` in the outcome file and move to next target_sha.

### 2c. Read the verdict

Parse the YAML front-matter. Three outcomes:

- `verdict: PASS` → this sha is done. Record success (Step 3). Move to next target_sha.
- `verdict: FAIL` with `BLOCK: 0` (only WARN/NOTE) → treat as PASS. The loop does not auto-fix WARNs. Move on.
- `verdict: FAIL` with `BLOCK ≥ 1` → proceed to Fixer.

### 2d. Pre-Fixer HEAD-MOVED check

Run `git rev-parse HEAD`. If it differs from `current_sha`, abort this sha's loop:
- Append `current_sha` back to `review-queue.txt` (will be reviewed next drain).
- Record `final_state: head-moved, reason: main branch advanced during review` in the outcome file.
- Move to next target_sha.

### 2e. Spawn the Fixer

Agent tool, `subagent_type: general-purpose`, `model: sonnet`. Prompt template:

> You are the Fixer agent for the hex-empires commit-review loop. Read `.claude/skills/commit-review/fixer-prompt.md` for your full instructions; follow them exactly.
>
> Review report: `.claude/workflow/scratch/review-<current_sha>.md`
>
> (auto mode only:) **AUTO_MODE=1.** You MUST create an isolated worktree and do all editing there. `git checkout` in the main repo mutates the shared working tree and pulls files out from under an active human session. Instead:
> ```bash
> BRANCH="auto-fix/<short-sha>-<ts>"  # short-sha = first 7 of <current_sha>, ts = `date -u +%Y%m%dT%H%M%SZ`
> WORKTREE=".claude/worktrees/$BRANCH"
> git worktree add -b "$BRANCH" "$WORKTREE" HEAD
> cd "$WORKTREE"   # all edits + tests + commit happen here
> ```
> Record `branch:<name>, sha:<commit-sha>` in the fix log's `commits:` list. Do NOT `git checkout` the branch in the main checkout; that changes the human's visible files.
>
> (manual mode only:) No AUTO_MODE flag — commit on the current branch in the main checkout per default behavior.
>
> HEAD-MOVED check per your prompt: if `git rev-parse HEAD` differs from the `commit:` field in the review report, write a `HEAD-MOVED` dispute and exit without committing.
>
> Working directory is the main repo at `C:\Users\housh\Documents\monoWeb\hex-empires`.

Wait for completion. Read `.claude/workflow/scratch/fix-log-<current_sha>.md`.

### 2f. Interpret Fixer outcome

Parse the fix log. Branches:

- **All BLOCKs fixed, no disputes** → Fixer produced a commit. Read the commit's sha from the `commits:` list (in auto mode it's `branch:<name>, sha:<hex>`; in manual mode it's just `<hex>`). Record the branch (auto mode). Set `previous_sha = current_sha`, `current_sha = <fixer_commit_sha>`, `iter += 1`. Loop back to 2a.
- **HEAD-MOVED dispute** → same as 2d: re-queue, record, move on.
- **≥ 1 substantive dispute (type ≠ HEAD-MOVED)** → spawn Arbiter (2g).
- **Iter ≥ 3 without PASS** → STALLED. Append to `.claude/workflow/issues.md`: `- [<ts>] [review_stalled] commit <target_sha> — <N> BLOCKs still open after 3 iters`. Record in outcome. Move to next target_sha.

### 2g. Spawn the Arbiter (only on substantive dispute)

Agent tool, `subagent_type: general-purpose`, `model: opus`. Prompt template:

> You are the Arbiter agent for the hex-empires commit-review loop. Read `.claude/skills/commit-review/arbiter-prompt.md` for your full instructions; follow them exactly.
>
> Inputs:
> - Review report: `.claude/workflow/scratch/review-<current_sha>.md`
> - Fixer dispute log: `.claude/workflow/scratch/fix-log-<current_sha>.md`
> - Cited rules: `.claude/rules/`
>
> Produce `.claude/workflow/scratch/dispute-<current_sha>.md` per the `dispute-ruling/v1` schema. READ-ONLY.

Read the dispute ruling. Three outcomes:

- `fixer-correct` → disputed finding is a false positive; remove from outstanding list. If it was the only BLOCK, this sha is PASS (record + move on). Otherwise re-spawn Fixer with a note that F-<id> was ruled fixer-correct.
- `reviewer-correct` → dispute overruled. Re-spawn Fixer with the arbiter's explanation attached, asking for a different approach. `iter += 1`.
- `escalate-human` → STALLED. Append to `issues.md`. Record. Move on.

## Step 3 — Per-sha outcome file

After each target_sha resolves (PASS / STALLED / HEAD-MOVED / auth-fail / malformed), write `.claude/workflow/scratch/review-outcome-<target_sha>.md`:

```markdown
---
schema: review-outcome/v1
target_sha: <original sha>
final_state: pass | stalled | head-moved | malformed | skipped-already-passed
iterations: <N>
timestamp: <ISO>
auto_fix_branches: [<comma-separated branch names or empty>]
---

## What happened

<1-5 sentences: reviewer verdict at iter 1, fixer actions if any, arbiter
ruling if any, final state.>

## Auto-fix branches (auto mode only)

- `auto-fix/<short-sha>-<ts>`
  - Apply: `git merge auto-fix/<short-sha>-<ts>`
  - Discard: `git branch -D auto-fix/<short-sha>-<ts>`

## Outstanding

<WARN and NOTE findings carried over. These are logged, not fixed.>
```

## Step 4 — Batch summary (auto mode only)

At the end of `--drain-queue`, write `.claude/workflow/scratch/last-review-summary.md`:

```markdown
---
schema: drain-summary/v1
drain_started: <ISO>
drain_finished: <ISO>
target_count: <N>
passed: <M>
stalled: <K>
head_moved_requeued: <J>
malformed: <L>
auto_fix_branches:
  - auto-fix/abc1234-20260416T063012Z
  - auto-fix/def5678-20260416T063245Z
---

<2-4 sentence human summary of the drain. Keep it short — session-start.sh
reads the top-line.>
```

## Step 5 — Exit

Do not release the lock. The spawning hook's subshell releases it as its last line after you return. Exit cleanly.

## Wait-for-artifact pattern

When you spawn via the Agent tool, the tool returns when the sub-agent completes. Read the expected output file immediately after (`review-<sha>.md`, `fix-log-<sha>.md`, `dispute-<sha>.md`). **Do not poll.** Agent is synchronous — file missing after the call returns means real failure.

If a sub-agent reports an explicit error (auth, rate-limit, tool denial) in its reply text, record it as the sha's `final_state` and move on. Do not retry the same sha automatically — the driver is fail-open by design; the human can re-run `/commit-review <sha>` manually to retry.

## Safety rails recap

- **Fixer never commits on current branch in auto mode.** Branch targeting is the single most important guard. Human still has final merge gate.
- **HEAD-MOVED check** at two points (pre-Fixer-spawn + inside Fixer prompt). Races with active session abort cleanly via re-queue.
- **Heartbeat per-sha** keeps lock from going stale during long Fixer runs.
- **Max 3 iters per sha** → STALLED logged to `issues.md`.
- **Idempotency check** at 2a — rerunning /commit-review on a passed sha is a no-op.

## Escape hatches

- `Skip-Review: <reason>` commit-message trailer — hook skips queueing entirely.
- `.claude/workflow/scratch/review-pause` file — hook still queues, skips spawning driver. Next commit after you remove the file spawns a driver that drains the accumulated queue.
- `// review-override: <reason>` inline comment — Reviewer downgrades BLOCK on that line to NOTE.

## References

- `.claude/skills/commit-review/reviewer-prompt.md` — Reviewer's system prompt
- `.claude/skills/commit-review/fixer-prompt.md` — Fixer's (HEAD-MOVED + AUTO_MODE constraints)
- `.claude/skills/commit-review/arbiter-prompt.md` — Arbiter's
- `.claude/hooks/commit-review.sh` — the PostToolUse hook that queues + spawns this driver
- `.claude/hooks/session-start.sh` — surfaces queue / driver / auto-fix-branches state
- `.claude/workflow/design/phase-6d-findings.md` — validation history
- `.claude/workflow/BACKLOG.md` — open WF-ENF-2 parts
