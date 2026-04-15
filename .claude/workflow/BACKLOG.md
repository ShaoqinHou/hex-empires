# Backlog — open work

Single source of truth for deferred/pending work. Populated 2026-04-16 from audit-status, ui-cleanup-remaining, and STATUS.md's "known remaining work." When items land, move them to commit messages and delete from here.

## System / codebase (fixable now)

| ID | Item | Source | Est. effort |
|---|---|---|---|
| SYS-D-1 | `noUncheckedIndexedAccess` tsconfig flag — 202 errors to fix | audit B4C | large (1-2 cycles) |
| SYS-D-2 | `skipLibCheck: true` removal — masks engine→web `.d.ts` drift | audit B4C | medium |
| SYS-D-3 | Root `npm test` doesn't chain `test:e2e` (`test:all` exists) | audit B4C | 1 line |
| SYS-D-4 | 12 more `toBeGreaterThan(0)` vague assertions (civic/production/age/etc.) | audit B4A | 1 cycle |
| SYS-D-5 | TopBar + BottomBar literal `zIndex: 100` → token | gap-sweep N1 | trivial |
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
