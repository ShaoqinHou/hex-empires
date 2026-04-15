# Codebase Pattern Audit — COMPLETE

Started: 2026-04-15
Finished: 2026-04-16
Goal: every file follows its applicable standard.

## Phases — all complete
- [x] Phase 0 — permissions pre-approved, status doc live
- [x] Phase 1 — inventory (31 systems catalogued) + standards registry (41 rules with detection recipes)
- [x] Phase 2 — per-system audits (10 parallel Sonnet subagents, ~120 findings)
- [x] Phase 3 — synthesis + batched migration plan (6 ordered batches)
- [x] Phase 4 — execute migrations (18 Sonnet subagents across 6 batches + 3 gap-sweep cleanups)
- [x] Phase 5 — gap sweep + doc updates + final deploy

## What landed (21 commits on main)

### Correctness (Batch 1)
- 46 dangling content-graph refs removed (16 uniqueUnit + 14 uniqueBuilding + 7 requiredCivic + 3 requiredTech + 6 civic.unlocks + 1 wonder rule)
- 4 ID collisions resolved (market/workshop/barracks/military_science)
- Audio: SoundGenerator method name alignment + AudioContext leak fix
- Math.random removed from CombatPreview + AnimationRenderer (seeded)

### Architecture (Batch 2)
- GameConfig extended with improvements/pantheons/governments/policies maps
- state/ → systems/ layering inversion fixed (helpers extracted)
- GameCanvas no longer imports from ui/ (callbacks from App.tsx)
- GameProvider no longer imports from canvas/ (AnimationEventBus introduced)
- data/wonders split: pure data + state/WonderPlacement evaluator

### Code quality + UI (Batch 3)
- 8 `any` types removed from districtSystem + aiSystem
- CrisisPanel routes through PanelManager
- HUD sticky overlays (CombatHoverPreview, TurnTransition, ValidationFeedback) register with HUDManager — skipped ESC test now passes
- Alt tracking consolidated to useAltKey hook
- Panel keyboard shortcuts sourced from PANEL_REGISTRY

### Tests + tsconfig (Batch 4)
- 15 vague test assertions tightened (AnimationManager, combat, age, growth, research, diplomacy)
- 2 new L2 integration test files (combat-promotion, research-age)
- `__tests__` un-excluded from tsc; 68 surfaced type errors fixed
- `test:all` script added (unit + E2E)

### Docs + meta (Batch 5)
- CLAUDE.md refreshed: 29 systems + 13 new GameActions + HUD shipped-state
- add-hud-element/add-panel/consistency-audit skills corrected
- check-edited-file.sh hook covers new systems
- Shipped design docs archived to design/archive/

### Notification UX (Batch 6)
- GameEvent: severity + blocksTurn + dismissed fields
- turnSystem rejects END_TURN while any critical undismissed event on current turn exists
- Right-click dismiss + Dismiss All button in Notifications
- Filter info-severity spam to ≤2 per render
- Emitters tagged: crisis + surprise war + own city lost + unit killed + barbarian-near-capital = critical/blocksTurn; tech/wonder/ally offers = warning

### Gap-sweep cleanups
- R1: founderBeliefs + followerBeliefs added to GameConfig (Batch 2A miss)
- R2: TurnSummaryPanel priority aligned with registry (modal)
- R3: selectedCityId moves from window.__selection side-channel to GameProvider context

## Known deferred items (small, documented)
- R4: 12 more `toBeGreaterThan(0)` vague assertions in engine tests (low severity)
- N1: TopBar/BottomBar `zIndex: 100` → panel token
- N2: root `npm test` doesn't chain to test:e2e (script exists as `test:all`)
- `noUncheckedIndexedAccess`: 202 errors blocked flipping this on in one cycle; deferred

## Test counts (final)
- Engine: 1488 passing (+13 from audit: 8 L2 integration + 5 turnSystem blocksTurn)
- Web unit: 184 passing (+1 ValidationFeedback wrapper test)
- Playwright: 37 interaction, 6 HUD (including previously-skipped ESC test)

## Model strategy used
- Opus (lead): plan, synthesis, conflict resolution, review, gap sweep scoring
- Sonnet (21 workers): inventory, 10 audits, 18 migration cycles, 1 gap sweep, 3 regression fixes

Cost and speed: Sonnet 5× cheaper per token; each worker completed in 2-10 min vs Opus 10-30 min for the same work. Context protection: all exploration token burn stayed inside worker contexts; Opus context holds only reports + plans.
