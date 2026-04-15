---
name: commit-review
description: Run the commit-time review loop on the current HEAD — reviewer finds pattern violations, fixer addresses them, arbiter resolves disputes. Invoke after a logical unit of work is committed, or trigger automatically via the PostToolUse hook.
---

# Commit Review Loop

Three-agent pattern that runs after a commit lands. Agents communicate via files; the loop halts when review is clean or max iterations hit.

## Flow

```
commit
  │
  ▼
  Reviewer (Sonnet, read-only)
    reads: git diff HEAD~1..HEAD, applicable rules from .claude/rules/, standards.md
    writes: workflow/scratch/review-<sha>.md
  │
  ├─ if verdict = PASS → exit clean
  │
  ▼
  Fixer (Sonnet)
    reads: review-<sha>.md, source files
    addresses BLOCK findings only (never WARN/NOTE in this iteration)
    commits: fix(review): address <finding-ids>
    writes: workflow/scratch/fix-log-<sha>.md
  │
  ▼
  loop up to 3 iterations
  │
  ├─ clean → exit
  ├─ fixer disputes a BLOCK (writes dispute block)
  │   → Arbiter (Opus, rare) reads dispute → fixer-correct | reviewer-correct | escalate-human
  └─ MAX iterations hit → append STALLED entry to workflow/issues.md, exit non-zero
```

## Agent roles

- **Reviewer** (`reviewer-prompt.md`) — Sonnet. READ-ONLY. Scans the diff against `.claude/rules/*.md` + `design/standards.md`. Produces findings table with stable IDs (`hash(file+line+rule)`). Never fixes.

- **Fixer** (`fixer-prompt.md`) — Sonnet. Reads the review report. Addresses ONE finding at a time. Commits each group of fixes with `fix(review): <finding-ids>`. Never scope-creeps. Disputes by writing a dispute block in the fix log.

- **Arbiter** (`arbiter-prompt.md`) — Opus. Only invoked on dispute. Reads reviewer's finding + fixer's dispute + the cited rule. Rules: fixer-correct / reviewer-correct / escalate-human.

## Verdicts

| Verdict | Action | Loop effect |
|---|---|---|
| `BLOCK` | Must fix before merge | Triggers fixer |
| `WARN` | Should fix, not blocking | Logged, does not trigger fixer |
| `NOTE` | Informational | Logged only |
| `PASS` | No findings for that file | — |

Commit passes when zero BLOCK verdicts remain.

## Invocation

**Automatic** — Claude Code PostToolUse hook intercepts `git commit` Bash tool calls and runs `.claude/hooks/commit-review.sh`. See `settings.json`.

**Manual** — invoke this skill via `/commit-review` to re-run the loop on the current HEAD commit.

## Escape hatches

- `// review-override: <reason>` inline comment — downgrades a BLOCK on that line to NOTE (audited in the report)
- `Skip-Review: <reason>` trailer in the commit message — skips the loop entirely (logged in `workflow/issues.md`)
- `git commit --no-verify` — bypasses git hooks (last resort, logged by the hook)

## State files (all in `workflow/scratch/`, gitignored)

- `review-<sha>.md` — current review report, YAML front-matter + findings
- `fix-log-<sha>.md` — fixer's actions + disputes
- `dispute-<sha>.md` — arbiter input + ruling, if triggered
- `last-review.json` — latest report in machine-readable form

## Stop conditions

- PASS → exit 0
- 3 reviewer-fixer iterations without convergence → append to `workflow/issues.md`, exit non-zero
- Dispute → arbiter decides; if `escalate-human`, append to `issues.md`
- Manual bypass → exit 0 with log entry

## References

- Reviewer prompt: `.claude/skills/commit-review/reviewer-prompt.md`
- Fixer prompt: `.claude/skills/commit-review/fixer-prompt.md`
- Arbiter prompt: `.claude/skills/commit-review/arbiter-prompt.md`
- Orchestrator hook: `.claude/hooks/commit-review.sh`
- Rules consulted: `.claude/rules/*.md`
- Detection recipes: `.claude/workflow/design/standards.md`
