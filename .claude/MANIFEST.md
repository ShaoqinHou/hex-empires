---
purpose: Single-stop map of every file in .claude/ with 1-line description + the workflow flow diagram. Read this file first to understand the whole system.
layer: meta
injected-at: on-demand (read by /audit-workflow and humans)
consumed-by: human, audit-workflow skill
last-validated: 2026-04-17
---

# .claude/ — Manifest

This file is the single source of truth for what exists in `.claude/` and why. Run `/audit-workflow` to verify the filesystem matches this file; fix drift when they disagree.

## What the system is

hex-empires is a turn-based strategy game. The `.claude/` folder is the agent-workflow system: rules that keep code consistent, skills for recurring procedures, hooks that fire on session/tool events, and a workflow state area.

Guarantees the system provides:

1. **Rule injection at both entry points** — main agents and sub-agents read the same rules bundle on startup (WF-AUTO-14 closed the asymmetry).
2. **Automated commit review** — every substantive commit triggers a background Reviewer → Fixer → Arbiter → iter-2 Reviewer loop. Fixer commits to throwaway `auto-fix/<sha>-<ts>` branches, never main.
3. **Worktree isolation for parallel work** — `safe-commit.sh` guards against commits leaking to the wrong repo.
4. **Self-documentation** — this MANIFEST.md + per-file YAML headers + `/audit-workflow` skill make drift visible.

## Flow diagram

```
┌─────────────────────┐           ┌─────────────────────┐
│  Session start      │           │  Subagent start     │
│  (user opens Claude)│           │  (Agent tool spawn) │
└─────────┬───────────┘           └─────────┬───────────┘
          │                                  │
          ▼                                  ▼
   session-start.sh                  inject-rules.sh
   (rules + health)                  (same rules)
          │                                  │
          └──────┬───────────────────────────┘
                 ▼
          Main / sub agent has:
          cheat sheet + principles + engine-patterns + coordination
          pointers to other rules + skills
                 │
                 ▼
          Agent does work → Edit/Write
                 │
                 ▼
          check-edited-file.sh (grep checks on Edit/Write)
                 │
                 ▼
          Agent runs Bash tool
                 │
          ┌──────┴──────┐
          ▼             ▼
     safe-commit.sh   (regular bash)
     (PreToolUse)
          │
          ▼
     git commit runs
          │
          ▼
     commit-review.sh (PostToolUse, Bash matcher)
          │
          ▼
     Queues sha → spawns background `claude -p /commit-review --drain-queue`
          │
          ▼
     /commit-review skill orchestrator:
       Reviewer (Sonnet) → review-<sha>.md
       ├── PASS → outcome file, done
       └── FAIL with BLOCKs → Fixer (Sonnet, AUTO_MODE branch)
                              ├── all fixed → iter-2 Reviewer
                              └── dispute → Arbiter (Opus) ruling
                                            ├── fixer-correct → continue
                                            ├── reviewer-correct → re-Fixer
                                            └── escalate → STALLED
                                   ↓
                              iter-2 Reviewer → PASS or next iter (max 3)
          │
          ▼
     review-outcome-<sha>.md + last-review-summary.md written
     auto-fix/<sha>-<ts> branch awaits human merge-or-discard
```

## Files

### `.claude/rules/` — rule docs (authoritative)

Every file is injected (fully or by reference) via `inject-rules.sh`.

| File | Purpose |
|------|---------|
| `principles.md` | Named principles (SSOT, derivable-not-stored, etc.) mapped to canonical rule docs + trap registry for recurring drift patterns |
| `engine-patterns.md` | Engine-side patterns (immutable state, state.config vs globals, seeded RNG, age transitions) |
| `architecture.md` | Engine/renderer separation, system pipeline shape |
| `import-boundaries.md` | Import direction constraints (mechanical, grep-checkable) |
| `data-driven.md` | Registry pattern, data-file rules, zero code changes to add content |
| `panels.md` | PanelShell / PanelManager protocol (authoritative spec) |
| `ui-overlays.md` | TooltipShell / HUDManager protocol (authoritative spec) |
| `tech-conventions.md` | TypeScript idioms, ports, Windows/MINGW64 platform notes |
| `testing.md` | L1/L2/L3/L4 test depth framework, concrete assertions |
| `coordination.md` | Sub-agent dispatch + parallelization + synthesis patterns |

### `.claude/skills/` — invocable procedures

Skills are invoked by agents via the Skill tool, triggered by their `description:` field (explicit TRIGGER / DO NOT TRIGGER conditions).

| Skill | Purpose |
|-------|---------|
| `skills/add-panel/SKILL.md` | Step-by-step procedure for new `*Panel.tsx` — wraps `PanelShell`, registers in `panelRegistry` |
| `skills/add-hud-element/SKILL.md` | Step-by-step for new tooltip/toast/hint — wraps `TooltipShell`, registers in `hudRegistry` |
| `skills/add-content/SKILL.md` | Step-by-step for new civs/units/buildings/techs/crises — data files in `packages/engine/src/data/**` |
| `skills/verify/SKILL.md` | E2E browser verification via chrome-devtools MCP — writes verify-marker for stop-nudge |
| `skills/build/SKILL.md` | Dev/build/test command reference for this monorepo |
| `skills/test/SKILL.md` | L1/L2/L3/L4 test depth framework + concrete-assertion rule |
| `skills/consistency-audit/SKILL.md` | Full-tree content-consistency sweep (broken IDs, missing barrel exports) |
| `skills/consistency-audit/references/audit-layers.md` | Support doc for consistency-audit — layer-by-layer audit recipes |
| `skills/commit-review/SKILL.md` | Three-agent review loop orchestrator (manual; hook invokes it automatically) |
| `skills/commit-review/reviewer-prompt.md` | Reviewer sub-agent system prompt |
| `skills/commit-review/fixer-prompt.md` | Fixer sub-agent system prompt (BLOCK-only contract + AUTO_MODE worktree protocol) |
| `skills/commit-review/arbiter-prompt.md` | Arbiter sub-agent system prompt (dispute resolution, Opus-backed) |
| `skills/spawn-worktree/SKILL.md` | Isolated git worktree with sentinel file for parallel agents |
| `skills/audit-workflow/SKILL.md` | Verify this MANIFEST.md matches filesystem + per-file headers present |

### `.claude/hooks/` — event-driven automation

Wired in `settings.json`.

| Hook | Event | Purpose |
|------|-------|---------|
| `session-start.sh` | SessionStart | Inject rules bundle + workspace health + commit-review state |
| `inject-rules.sh` | SubagentStart | Inject same rules bundle as session-start (excludes health block) |
| `safe-commit.sh` | PreToolUse (Bash) | Refuse commits whose git-toplevel doesn't match sentinel (worktree guard) |
| `check-edited-file.sh` | PostToolUse (Edit/Write) | Grep-check import boundaries; WARN on detected violations |
| `commit-review.sh` | PostToolUse (Bash) | Queue commit sha + spawn background review driver |
| `log-bash-failure.sh` | PostToolUseFailure (Bash) | Append failed command to issues.md |
| `stop-nudge-verify.sh` | Stop | Remind about /verify if marker is stale |
| `run-tests.sh` | (manual) | Test runner convenience script (called by /test skill) |

### `.claude/workflow/` — state + design

| File | Purpose |
|------|---------|
| `CLAUDE.md` | TDD 6-phase process + autonomous-mode continuation directive |
| `BACKLOG.md` | Open work items (SYS-D, CNT-D, WF-AUTO) |
| `STATUS.md` | Point-in-time snapshot; consult session-start output + git log for live state |
| `issues.md` | Auto-appended log: command failures, review skips, PRINCIPLE-GAP entries |
| `session-984afda9-recovery.md` | Historical recovery brief (interrupted Apr 2026 session) |
| `design/civ7-rulebook.md` | Civ VII rule reference (1483 lines, primary game-design source) |
| `design/gap-analysis-v3.md` | Intentional-simplification rationale + game-system gaps |
| `design/standards.md` | 41 named detection recipes with grep patterns |
| `design/phase-6d-findings.md` | Workflow-validation log (commit-review loop proven end-to-end) |
| `design/hud-elements.md` | Running registry of all HUD overlays (mirrors `hudRegistry.ts`) |
| `design/ui-cleanup-remaining.md` | Live UI cleanup backlog (C4..C13) |

### `.claude/workflow/scratch/` — transient (gitignored)

Written by hooks + orchestrator, read by session-start.sh + /audit-workflow.

| File pattern | Purpose |
|--------------|---------|
| `pending-review.txt` | Last-triggered review target |
| `review-queue.txt` | FIFO of shas pending review |
| `.review.lock/` | Atomic mkdir lock + heartbeat file |
| `review-<sha>.md` | Reviewer output per iteration |
| `fix-log-<sha>.md` | Fixer output per iteration |
| `dispute-<sha>.md` | Arbiter ruling (rare) |
| `review-outcome-<target-sha>.md` | Per-sha resolution summary |
| `last-review-summary.md` | Per-drain batch summary |
| `review-driver-<ts>.log` | Background driver stdout/stderr capture |
| `review-pause` | If present, hook queues but does NOT spawn driver |

### `.claude/` root

| File | Purpose |
|------|---------|
| `MANIFEST.md` | This file |
| `settings.json` | Hook configuration (committed) |
| `settings.local.json` | Per-developer permission grants (gitignored in some setups) |

### `.claude/worktrees/` — parallel-agent sandboxes

Gitignored. `.claude/worktrees/auto-fix/<sha>-<ts>/` is where Fixer writes in AUTO_MODE.

## How to audit

Run `/audit-workflow` — verifies:
- Every file in `.claude/` except gitignored scratch/worktree is listed in this MANIFEST
- Every file listed in MANIFEST exists on disk
- Each `.md` and `.sh` file (other than this one) has a `purpose:` YAML front-matter header
- Orphaned files (exist on disk but not in MANIFEST, or vice versa) are flagged

## When to edit this file

- When you add a new rule, skill, hook, or workflow doc, add its row to the right section.
- When you delete a file, remove its row.
- Never let the filesystem drift from this manifest. `/audit-workflow` catches divergence; fix it rather than ignoring.

## Related

- Overall project: `../CLAUDE.md` (root)
- TDD process: `workflow/CLAUDE.md`
- Validation history: `workflow/design/phase-6d-findings.md`
