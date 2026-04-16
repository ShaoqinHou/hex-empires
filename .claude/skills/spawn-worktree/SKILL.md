---
name: spawn-worktree
description: Spawn an isolated git worktree for a parallel agent with a sentinel file that prevents commits leaking back to main. TRIGGER WHEN you are about to fire ≥2 dev sub-agents concurrently on disjoint tasks (blind-eval batch, parallel feature work), OR you need an isolated sandbox for a risky refactor a human wants to inspect before merging. DO NOT TRIGGER for single-agent work — the overhead is not worth it.
---

# Spawn a Guarded Worktree

Creates a git worktree with a `safe-commit.sh` sentinel so the agent's
commits are machine-blocked from landing anywhere other than the worktree
itself.

Phase 6d WF-GUARD-1 — motivated by the Phase 6c leak where an agent's
commit landed on `main` despite being assigned to a worktree.

## When to use

- Orchestrator is firing 2+ parallel agents on disjoint tasks.
- Each agent gets its own branch and should not see other agents'
  in-flight work.
- Commits must stay inside the worktree until the orchestrator cherry-picks them.

Do NOT use for single-agent work or when you want the agent to commit
directly to a branch you own.

## Protocol

### 1. Spawn the worktree

```bash
# Pick a unique branch name and worktree directory name
BRANCH="eval/<task-slug>"
WORKTREE_DIR=".claude/worktrees/<task-slug>"

git worktree add -b "$BRANCH" "$WORKTREE_DIR"
```

### 2. Drop the sentinel

```bash
# The sentinel's content is the ABSOLUTE path of the worktree's
# git toplevel. safe-commit.sh compares this to `git rev-parse
# --show-toplevel` on every commit attempt.
SENTINEL_PATH="$WORKTREE_DIR/.claude/worktree-sentinel"
mkdir -p "$WORKTREE_DIR/.claude"
(cd "$WORKTREE_DIR" && git rev-parse --show-toplevel) > "$SENTINEL_PATH"
```

### 3. Hand the worktree path to the agent

Spawn the subagent with a task prompt that names the worktree absolute path and
instructs them to `cd` into it before any work. Example prompt scaffold:

```
Task: <feature>
Worktree: <absolute path from step 1>
Branch: <branch from step 1>

Rules:
- All commits must happen inside the worktree. The `safe-commit.sh`
  guard will block any commit that resolves to a different git toplevel.
- Do NOT `cd ..` out of the worktree before committing.
- Run tests and build inside the worktree.
- Report back when done; the orchestrator will cherry-pick.
```

### 4. After the agent reports done

```bash
# Cherry-pick into main (or review first)
git -C "$WORKTREE_DIR" log --oneline
git cherry-pick "$BRANCH"

# Clean up
git worktree remove "$WORKTREE_DIR"
git branch -D "$BRANCH"  # optional — keep if you want to preserve history
```

The sentinel file is `.gitignore`'d so it never lands in any commit.

## Failure modes and the guard's response

| Scenario | Guard reacts | Agent sees |
|---|---|---|
| Agent commits inside the worktree | pass | normal commit |
| Agent `cd ..`'s to the main repo and commits | **BLOCK** with mismatch message | must cd back |
| Agent spawns a shell outside the worktree and inherits CWD | **BLOCK** | must cd in |
| `.git` dir resolves through a shared dir pointing at main | **BLOCK** | forces investigation |
| Agent uses `git worktree` to create ANOTHER worktree inside theirs and commits there | pass (that sub-worktree's toplevel matches) | might be surprising but is correct per git semantics |
| Agent removes the sentinel and commits | pass | escape hatch; logged only if the agent also sets `Skip-Review:` trailer |
| Normal user runs `git commit` with no sentinel present | pass | no-op (guard is opt-in via sentinel existence) |

## Escape hatch

If the guard is wrong for a specific case, the agent can `rm
.claude/worktree-sentinel` inside the worktree to disable the guard.
Document why in the commit message via `Safe-Commit-Override: <reason>`
trailer. The orchestrator should audit these during cherry-pick review.

## References

- `.claude/hooks/safe-commit.sh` — the PreToolUse guard (wired in
  `.claude/settings.json`)
- `.claude/workflow/design/phase-6d-findings.md` — Bug 1 context
- `.claude/workflow/BACKLOG.md` — WF-GUARD-1 entry
