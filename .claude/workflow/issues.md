## Issues Log
<!-- Hooks auto-append entries here. Format: -->
<!-- - [YYYY-MM-DDTHH:MM:SSZ] [category] description -->
<!-- Truncated 2026-04-16 after Phase 6 reorganization: 63 context-free "Bash command failed" entries removed; log-bash-failure.sh now captures the first 120 chars of the failed command. -->
- [2026-04-16T06:23:01Z] [command_failure] `cd "C:/Users/housh/Documents/monoWeb/hex-empires" && \   echo "--- pre-commit state ---" && \   echo "scratch contents:" `
- [2026-04-16T07:20:58Z] [command_failure] `ls "C:\Users\housh\Documents\monoWeb\hex-empires\.claude\workflow\scratch\" 2>&1 `
- [2026-04-16T07:26:49Z] [review_skipped] commit 61c1fc7 — Skip-Review: manual WARN cleanup following auto-drive; no new code shape.
- [2026-04-16T07:40:01Z] [command_failure] `ls "C:\Users\housh\Documents\monoWeb\hex-empires\.claude\workflow\scratch\" `
- [2026-04-16T07:47:07Z] [command_failure] `ls -la "C:/Users/housh/Documents/monoWeb/hex-empires/.claude/workflow/scratch/.review.lock/" 2>/dev/null `

[2026-04-19T12:45:00Z] [PRINCIPLE-GAP] F-f33cdd16 on 1e73a328: success-path test nested inside describe('... invalid ...') block — describe name contradicts test intent; no trap covers test describe-block misorganization
[2026-04-19T12:45:00Z] [PRINCIPLE-GAP] F-ad373f07 on 7a9b9e9c: test lacking isolation comment for why a sibling win condition cannot fire — no trap covers missing test-isolation documentation
[2026-04-19T12:45:00Z] [PRINCIPLE-GAP] F-66ca2cdf on 8da4a260: dead no-op statement (fetch variable + void it) rather than a dead constant — dead-constant trap covers unused const/let, not dead imperative statements

- [2026-04-20T01:20:00Z] [PRINCIPLE-GAP] F-0ee876da on 0ef0c06c: System update that gates a path in one code branch (START_TURN/recalcFullVisibility) but misses the same gate in sibling branches (MOVE_UNIT/FOUND_CITY/ATTACK_* incremental reveals) — incomplete guard propagation across an action-fan.

## 2026-04-19T13:48:37Z drain-queue run

**b29c6a41** fix(engine): make new config Maps required with default empty (W5-deploy)
- [WARN] F-212dee98: independentPowerSystem.ts — stale optional-chaining on now-required state.independentPowers (lines 41, 168, 256)
- [WARN] F-9382f7d5: independentPowerSystem.ts — dead !ips guard + stale ?? new Map() fallbacks (lines 53, 242, 290)
- [WARN] F-251b8112: TradeRoutesPanel.tsx — estimateGoldPerTurn() calc in UI panel; should be engine utility in state/TradeRouteUtils.ts
- [NOTE] F-dc58473b: ResourceTooltip.tsx — import type ResourceType placed mid-file; move to top
- [NOTE] F-7da6cfe9: terrain-biome-model.test.ts:253 — conditional always-true; use non-conditional assertion
- [NOTE] F-f3b0d338: turnSystem.test.ts:332 — same pattern as F-7da6cfe9
- [2026-04-22T00:27:17Z] [PRINCIPLE-GAP] F-60c9e2ba on f1fda8b: CombatPreview display formula adds percent-display-int + flat-CS-int — incommensurate units shown as single number; no named trap covers mixed-unit display aggregation
- [2026-04-22T00:27:17Z] [PRINCIPLE-GAP] F-f9e71910 on f1fda8b: Per-age opt-in boolean (darkAgeOptIn) not cleared in TRANSITION_AGE handler; engine-patterns.md age-transition section covers legacy bonuses and leader but does not enumerate all per-age flags that must reset
- [2026-04-25T07:50:00Z] [PRINCIPLE-GAP] F-ae0783d9 on fdd92fc: river+coastal adjacency stacking on navigable_river terrain is untested and undocumented — unclear if intentional double-counting
