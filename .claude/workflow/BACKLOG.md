# Backlog — open work

Single source of truth for deferred/pending work. Populated 2026-04-16 from audit-status, ui-cleanup-remaining, and STATUS.md's "known remaining work." When items land, move them to commit messages and delete from here.

## Phase 7 prerequisites (do BEFORE the next parallel-batch blind eval)

These items unblock the next cycle's experiment. Ordered by leverage.

| ID | Item | Source | Status |
|---|---|---|---|
| UI-C-VF1 | Refactor `packages/web/src/ui/components/ValidationFeedback.tsx` + `IdleUnitsToast.tsx` to derive visibility from `HUDManager.isActive()` instead of local `useState<boolean>`. | P6c F-1196b755 | **DONE** — commit `b92e8e9` |
| WF-GUARD-1 | `safe-commit.sh` + worktree sentinel. Machine-guards the commits-land-in-the-right-worktree invariant. | P6c Bug 1 | **DONE** — commit `387e4d2`; validated live in WF-ENF-2 |
| WF-ENF-2 (part 1, Fixer) | Fixer-leg smoke test. Hand a real BLOCK review report to a Fixer subagent; verify it follows the fixer contract end-to-end. | P6d | **DONE** — 2026-04-16 |
| WF-ENF-2 (part 2, Arbiter) | Arbiter-leg smoke test — `fixer-correct` ruling on false-positive BLOCK. Arbiter wrote a self-correcting `reviewer-note`. | P6d | **DONE** — 2026-04-16 |
| WF-ENF-2 (part 3, multi-iteration) | Full loop smoke test: iter 1 FAIL → Fixer → iter 2 PASS, with inherited finding IDs and regression detection. Iteration was driven manually. | P6d | **DONE** — 2026-04-16 |
| WF-ENF-2 (part 4, reviewer-correct) | Arbiter siding with Reviewer against a wrongly-disputed valid BLOCK. Needs a handcrafted fixture. Lower priority — symmetric to part 2. | P6d | pending |
| WF-ENF-2 (part 5, loop-automation) | Driver script / skill body that runs iter 1 → Fixer → iter 2 → ... without a human invoking each agent. | P6d | **DONE** — landed as WF-AUTO-1 (commits `3c4691b` `d87e373` `a1f5275` `7f4426e`) |
| WF-ENF-2 (part 6, stuck-state) | If Fixer can't converge in 3 iterations, write STALLED entry to `issues.md` and exit. Built into the WF-AUTO-1 orchestrator SKILL (step 2f). | P6d | **DONE** (in SKILL.md) — unvalidated until first real stuck case |
| WF-ENF-2 (part 7, reviewer-note) | Reviewer-notes accumulate in dispute files but nothing yet injects them into future Reviewer runs. Glue work. | P6d | pending |
| WF-AUTO-1 | Fully-hands-off auto-review. Hook queues + spawns background `claude -p /commit-review --drain-queue`; Fixer commits to `auto-fix/<sha>-<ts>` branches in auto mode (never current branch); HEAD-MOVED check in Fixer; heartbeat-based stale-lock detection; session-start surfaces queue + auto-fix branches + driver status. | user request 2026-04-16 | **DONE** — 4 commits; live-test deferred to first real substantive commit post-landing |
| WF-AUTO-2 | First live end-to-end test of auto-drive: make a real substantive commit, wait for background driver, verify Fixer output on `auto-fix/` branch, confirm session-start visibility. Expect at least one bug to fall out. | post-WF-AUTO-1 | pending |
| WF-AUTO-3 | Cost rail: queue depth cap (max N pending) + per-day commit counter. Add after first cost surprise if any. | robustness-agent review | pending |
| WF-AUTO-4 | Re-verify background `claude -p --dangerously-skip-permissions` auth on MINGW64 — currently assumed to inherit OAuth via `~/.claude/.credentials.json` but unverified for disowned-subshell case. Add auth probe to the hook before spawning. | robustness-agent review | pending |
| WF-ENF-1 | ESLint rule banning `useState<boolean>` whose setter is only called from a `useEffect` watching a context-computable value. Alt: content-style lint banning `useState<boolean>.*setIsVisible` in `ui/components/*.tsx` + `ui/panels/*.tsx` unless preceded by `// enforcement-exception`. | P6d skeptic review | pending |

## System / codebase (fixable now)

| ID | Item | Source | Est. effort |
|---|---|---|---|
| SYS-D-1 | `noUncheckedIndexedAccess` tsconfig flag — 202 errors to fix | audit B4C | large (1-2 cycles) |
| SYS-D-2 | `skipLibCheck: true` removal — masks engine→web `.d.ts` drift | audit B4C | medium |
| SYS-D-3 | Root `npm test` doesn't chain `test:e2e` (`test:all` exists) | audit B4C | 1 line |
| SYS-D-4 | 12 more `toBeGreaterThan(0)` vague assertions (civic/production/age/etc.) | audit B4A | 1 cycle |
| ~~SYS-D-5~~ | ~~TopBar + BottomBar literal `zIndex: 100` → token~~ | gap-sweep N1 | **DONE** — commit `ce48c0a`, Phase 7 first loop run, review PASS with 2 WARN follow-ups (see SYS-D-12) |
| SYS-D-12 | Migrate inline `zIndex: 'var(--panel-z-*)' as unknown as number` casts (4 occurrences in TopBar + BottomBar) to CSS classes applied via `className`. Eliminates the type-system double-cast pattern; uses the token natively in CSS where `z-index` accepts custom properties without coercion. Flagged by Reviewer on commit `ce48c0a` as findings F-a1b2c3d4 + F-e5f6g7h8. | Phase 7 review | small (30 min) |
| SYS-D-7 | Wire `wonderPlacementSystem` + `resourceAssignmentSystem` into DEFAULT_SYSTEMS pipeline | gap-analysis-v3 | medium |
| SYS-D-8 | `AudioManager.ts` `@ts-nocheck` — narrow types, remove flag | audit | medium |
| SYS-D-9 | Residual `toBeDefined()` / conditional-guard asserts beyond 4A scope | audit | 1 cycle |
| SYS-D-10 | PanelShell reads priority from registry when `id` passed (eliminates drift) | gap-sweep R2 | small |
| SYS-D-11 | `window.__selection` still written from GameProvider for E2E observability — design smell | gap-sweep R3 | small |
| UI-C-1 | ImprovementPanel already migrated — CLOSED | (done) | — |
| UI-C-3 | VictoryPanel dismissed flag — already migrated — CLOSED | (done) | — |
| UI-C-4..13 | Remaining 10 UI cleanup findings | ui-cleanup-remaining.md | medium |

## Content (separate work — requires design, not pattern enforcement)

| ID | Item | Source |
|---|---|---|
| CNT-D-1 | 16 civs need real unique units (legion, hoplite, immortal, …) | audit batch 1A |
| CNT-D-2 | 14 civs need real unique buildings (sphinx, acropolis, grand_bazaar, …) | audit batch 1A |
| CNT-D-3 | 7 missing civics (drama_poetry, theology, …) referenced by districts | audit batch 1A |
| CNT-D-4 | 1 missing wonder (machu_picchu) — placement rule removed, needs BuildingDef | audit batch 1A |
| CNT-D-5 | AI doesn't dispatch new M5-M19 actions: FOUND_PANTHEON, FOUND_RELIGION, SET_GOVERNMENT, SLOT_POLICY, PROMOTE_COMMANDER, ASSIGN_RESOURCE | STATUS.md |
| CNT-D-6 | Religion/Government/Commanders panels exist but content completeness unchecked | STATUS.md |
| CNT-D-7 | §6 Combat parity — 28 tests document divergences; only 3 fixes landed (R64a/R66a/R64c) | gap-analysis-v3 |
| CNT-D-8 | LegacyPath tier milestones exposed on VictoryState but not rendered in VictoryPanel/VictoryProgressPanel | STATUS.md |
| CNT-D-9 | Balance pass — new M5-M19 content hasn't been playtested against AI over full games | STATUS.md |

## Ordering notes

- **SYS-D-1** is the biggest-impact engineering change but highest risk. Don't do it alongside feature work. Own-cycle.
- **SYS-D-5 / SYS-D-10 / SYS-D-11** are 1-line cleanups — bundle into a single commit when convenient.
- **CNT-D-1 / CNT-D-2** must land before civs' unique units actually do anything in-game. Block any civ-balance work.
- **CNT-D-5** blocks the AI from using new systems meaningfully. Own-cycle, requires aiSystem extensions.
