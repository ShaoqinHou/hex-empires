# Gap Sweep — post-migration verification

Date: 2026-04-15 (end of audit phase 5)
Auditor: Sonnet 4.6 (agent-a3002fcd worktree, read-only)

---

## Summary

| Standard | Detection hits | Expected | Regressions | New |
|----------|----------------|----------|-------------|-----|
| S-ENGINE-PURE | 2 files matched (comment text only) | 2 (false positives) | 0 | 0 |
| S-SYSTEM-INDEPENDENT | 0 source cross-imports | 0 | 0 | 0 |
| S-DATA-PURE | 0 data→systems imports | 0 | 0 | 0 |
| S-REGISTRY-PATTERN | 2 hits | 1 expected (religionSystem beliefs) | 1 regression | 0 |
| S-GAMESTATE-IMMUTABLE | ~40 push/delete hits | 40 expected (local copies only) | 0 | 0 |
| S-SEEDED-RNG | 0 Math.random in engine src | 0 | 0 | 0 |
| S-PANEL-PATTERN | 1 registry/component mismatch | 0 | 1 regression | 0 |
| S-HUD-PATTERN | Infrastructure shipped (HUDManager, TooltipShell, hudRegistry, hud-tokens.css) | — | 0 | 0 |
| S-IMPORT-BOUNDARIES | 0 canvas→ui, 0 ui→canvas, 0 provider→canvas | 0 | 0 | 0 |
| S-NAMED-EXPORTS | 0 default exports | 0 | 0 | 0 |
| S-NO-ANY | 0 hits in engine systems; 6 `(window as any)` in GameCanvas | 6 expected (test hooks) | 0 | 0 |
| S-READONLY | 0 non-readonly Map/Array in GameState | 0 | 0 | 0 |
| S-ESM-ONLY | 0 require() calls | 0 | 0 | 0 |
| S-DISCRIMINATED-UNIONS | 0 class Action/Effect | 0 | 0 | 0 |
| S-TESTS-L1 | All systems have __tests__ | 0 | 0 | 0 |
| S-TESTS-L2 | 3 integration tests exist | 0 | 0 | 0 |
| S-TESTS-L3 | E2E specs present (hud.spec.ts, tooltip.spec.ts) | — | 0 | 0 |
| S-TESTS-L4 | SaveLoad tests present | — | 0 | 0 |
| S-CONCRETE-ASSERTIONS | 12 `toBeGreaterThan(0)` in engine tests; 0 `toBeDefined` in AnimationManager | 0 | 12 remaining | 0 |
| S-DETERMINISM | 0 Math.random in engine src or canvas | 0 | 0 | 0 |
| S-NO-HARDCODE-COLORS | 70 raw-hex hits in panels; 4 in hud/ | ~70 body-content expected | 0 | 0 |
| S-GIT-CONVENTIONS | Not audited (low severity) | — | — | — |
| S-WINDOWS-ENV | 0 python3 in hooks | 0 | 0 | 0 |
| S-NO-BOOLEAN-PANEL-STATE | 1 comment match (ImprovementPanel header) | 1 expected | 0 | 0 |
| S-ESC-OWNERSHIP-PANEL | 1 hit: PanelManager.tsx (correct central handler) | 1 expected | 0 | 0 |
| S-ESC-OWNERSHIP-HUD | 2 hits in HUDManager.tsx (ESC + Tab, both correct) | 2 expected | 0 | 0 |
| S-NO-RAW-HEX-CHROME | Same 70 panel hits; all in body content not chrome | ~70 expected (body-content carve-out) | 0 | 0 |
| S-ADD-CONTENT-2-EDIT | Not applicable (no content PRs this cycle) | — | — | — |
| S-HUD-REGISTRATION | 10 ids in hudRegistry, all wired | — | 0 | 0 |
| S-PANEL-REGISTRATION | 17 ids in panelRegistry; all have entries | 0 | 0 | 0 |
| S-DATA-TRIGGER-ATTR | All TopBar togglePanel calls carry data-panel-trigger | 0 | 0 | 0 |
| S-GAME-FEEL-INVARIANTS | 0 user-select:text; 0 tabIndex=0 on overlays; 0 scrollIntoView | 0 | 0 | 0 |
| S-STACK-CYCLE | cycleIndex consumed in TooltipOverlay | — | 0 | 0 |
| S-NO-OCCLUDE | TooltipShell handles occlusion | — | 0 | 0 |
| S-CANVAS-THIN-VIEW | 0 canvas→ui imports; `window.__selection` side-channel remains | 1 expected | 1 regression | 0 |
| S-SYSTEM-PURE-FUNCTION | 0 console.log/fetch/Math.random in system source files | 0 | 0 | 0 |
| S-REACT-FUNCTIONAL | 0 class components | 0 | 0 | 0 |
| S-PANEL-SHELL-CHROME | 0 hand-rolled close buttons or role=dialog in panel bodies | 0 | 0 | 0 |
| S-TOOLTIP-SHELL-CHROME | TooltipShell centralises chrome | — | 0 | 0 |
| S-EFFECT-DEF-DISCRIMINATED | Effects used in data match EffectDef union | — | 0 | 0 |
| S-GAMECONFIG-EMBEDDED | 4 systems migrated; 1 partial regression (religionSystem beliefs) | 1 | 1 | 0 |

---

## Regressions (migrations that didn't fully land)

### R1 — religionSystem: ALL_FOUNDER_BELIEFS / ALL_FOLLOWER_BELIEFS not in GameConfig
- **File:** `packages/engine/src/systems/religionSystem.ts:41-42`
- **Lines:**
  ```typescript
  import { ALL_FOUNDER_BELIEFS } from '../data/religion/founder-beliefs';
  import { ALL_FOLLOWER_BELIEFS } from '../data/religion/follower-beliefs';
  ```
  Used at lines 214-215 to validate belief IDs at action dispatch time.
- **Standard:** S-GAMECONFIG-EMBEDDED, S-REGISTRY-PATTERN
- **Context:** Batch 2A added `improvements`, `pantheons`, `governments`, `policies` to GameConfig and migrated the corresponding systems. The `pantheons` migration in `religionSystem` landed (`state.config.pantheons.get(pantheonId)` at line 62). However `founder_beliefs` and `follower_beliefs` were NOT added to `GameConfig` and their direct array imports remain.
- **Proposed fix:** Add `founderBeliefs: ReadonlyMap<string, FounderBeliefDef>` and `followerBeliefs: ReadonlyMap<string, FollowerBeliefDef>` to `GameConfig` and `GameConfigFactory`; replace the two array imports with `state.config.founderBeliefs.has(id)` / `state.config.followerBeliefs.has(id)`.
- **Severity:** High.

### R2 — TurnSummaryPanel: registry priority='modal' but component passes priority='overlay'
- **Files:**
  - Registry: `packages/web/src/ui/panels/panelRegistry.ts:74` — `priority: 'modal'`
  - Component: `packages/web/src/ui/panels/TurnSummaryPanel.tsx:31` — `priority="overlay"`
- **Standard:** S-PANEL-REGISTRATION, S-PANEL-PATTERN
- **Context:** The registry and the component disagree. PanelShell uses the prop, so the panel renders as `overlay` (no backdrop, right-anchored) even though the registry says `modal`. The discrepancy was documented in the pre-audit findings (web-ui-panels.md B3) but was not fixed by any batch.
- **Proposed fix:** Align either the registry entry (`priority: 'overlay'`) or the component prop (`priority="modal"`) — semantic choice depends on product intent. If TurnSummary doesn't need to block the map, change the registry to `overlay`.
- **Severity:** Medium.

### R3 — GameCanvas `window.__selection` side-channel still present
- **File:** `packages/web/src/canvas/GameCanvas.tsx:769-771`
- **Code:**
  ```typescript
  const selState = (window as any).__selection as { cityId: string | null } | undefined;
  const curIdx = selState?.cityId ? ownCities.findIndex(c => c.id === selState.cityId) : -1;
  ```
- **Standard:** S-CANVAS-THIN-VIEW
- **Context:** Batch 2C removed the `CombatHoverPreview` and `usePanelManager` imports from `GameCanvas` (the critical S-IMPORT-BOUNDARIES violation is fixed). However the `window.__selection` side-channel for city cycling (N key) was noted as a separate C-3 in `web-canvas.md` and was not removed. `selectedCityId` IS now in `GameProvider` context (line 98 of GameProvider.tsx) but GameCanvas has not been updated to consume it from context instead of the window side-channel.
- **Proposed fix:** Read `selectedCityId` from `useGameState()` context (it's already there); remove the `window.__selection` read and the `as any` cast. The comment at line 769 already acknowledges the side-channel as temporary.
- **Severity:** Medium (architectural smell; the critical import-boundary violation is already fixed).

### R4 — Vague test assertions remain in 12 engine test locations (S-CONCRETE-ASSERTIONS)
- **Files:** `civicSystem.test.ts` (3 hits), `combatSystem.test.ts` (1), `population-rulebook-parity.test.ts` (2), `production-rulebook-parity.test.ts` (2), `productionSystem.test.ts` (1), `researchSystem.test.ts` (1), `tradeSystem.test.ts` (1), `wonderPlacementSystem.test.ts` (1).
- **Pattern:** `expect(x).toBeGreaterThan(0)` where the expected value is deterministic from the test state.
- **Standard:** S-CONCRETE-ASSERTIONS
- **Context:** Batch 4A was supposed to fix AnimationManager.test.ts pixel asserts (those are now clean — 0 hits in AnimationManager tests) and "a sample of engine tests (cap at ~15 highest-value swaps)". Only the AnimationManager cases were fully fixed; the 12 engine system cases listed above remain. The `toBeGreaterThan(0)` pattern in system tests is lower priority than the pixel-coord case but still flagged.
- **Proposed fix:** Per original audit guidance, compute expected yield/progress values from the known test state and replace with `toBe(expectedValue)`.
- **Severity:** Low (test quality, no runtime impact).

---

## New findings (not in original audit)

### N1 — TopBar and BottomBar: hardcoded zIndex: 100
- **Files:**
  - `packages/web/src/ui/layout/TopBar.tsx:51` — `zIndex: 100`
  - `packages/web/src/ui/layout/BottomBar.tsx:111` — `zIndex: 100`
- **Standard:** S-PANEL-PATTERN (by analogy — panels must source z-index from `--panel-z-*` tokens)
- **Context:** TopBar and BottomBar are layout containers, not panels, but they use a raw zIndex value (100) that could conflict with `--panel-z-overlay` (110) in an edge case. The panel-tokens.css has `--panel-z-bar` or equivalent values that should be sourced here. Neither file was audited in the original per-system passes.
- **Severity:** Low (value happens to be correct currently but is not token-sourced).

### N2 — HUDManager has two separate keydown listeners (ESC + Tab) — intentional but worth noting
- **File:** `packages/web/src/ui/hud/HUDManager.tsx:233, 268`
- **Standard:** S-ESC-OWNERSHIP-HUD
- **Context:** Two `window.addEventListener('keydown', ...)` calls in the same provider: one for ESC (lines 200-234), one for Tab cycling (lines 243-270). This is architecturally correct (two distinct key behaviors, each with its own guard logic) and does not violate the rule — the rule prohibits *per-overlay* ESC handlers, not multiple handlers in the central manager. Flagged as informational since it superficially resembles the anti-pattern.
- **Severity:** Informational only. Not a violation.

### N3 — `npm test` root script does not include e2e
- **File:** `package.json:9` — `"test": "npm run test --workspace=packages/engine && npm run test --workspace=packages/web"`
- **Standard:** S-TESTS-L3 (indirectly — L3 tests never run by default)
- **Context:** `test:e2e` and `test:all` scripts were added in Batch 4C but `npm test` itself was not updated to include e2e. The audit plan explicitly called for adding `test:e2e` to root `npm test`. This was not completed.
- **Severity:** Medium (E2E never runs on CI without explicit `npm run test:e2e`).

---

## Data-graph re-verification

**Status: PASS for the 1A/1B scope; PARTIAL for religion beliefs.**

Verification method: grep-based spot-check (tsx compilation not available in worktree).

| Check | Result |
|-------|--------|
| Antiquity civs `uniqueUnit` dangling refs | PASS — all nulled with TODO comments |
| Antiquity civs `uniqueBuilding` dangling refs | PASS — nulled or valid ref (e.g. `'bath'`, `'great_wall'`) |
| ID collision: market/workshop/barracks/military_science | PASS — exploration-age variants renamed `market_exp`, `workshop_exp`, `barracks_exp` |
| `improvements` in GameConfig | PASS — present at line 35 of GameConfig.ts |
| `pantheons` in GameConfig | PASS — present at line 36 |
| `governments` in GameConfig | PASS — present at line 37 |
| `policies` in GameConfig | PASS — present at line 38 |
| `founder_beliefs` / `follower_beliefs` in GameConfig | FAIL — absent; religionSystem imports globals directly |
| `window.__selection` removed from GameCanvas | FAIL — still present at line 769 |

---

## Observations

1. **The critical structural violations are resolved.** The four fixes that mattered most for runtime correctness all landed:
   - `Math.random()` in `CombatPreview.ts` and `AnimationRenderer.ts` — fixed (0 hits in engine src and canvas).
   - `GameCanvas` importing from `ui/` (`CombatHoverPreview`, `usePanelManager`) — fixed (0 canvas→ui imports).
   - `GameProvider` importing from `canvas/` — fixed (0 provider→canvas imports).
   - `CrisisPanel` bypassing PanelManager — fixed (now at `activePanel === 'crisis'` conditional with `openPanel('crisis')` in App.tsx useEffect).

2. **GameConfig extension is 75% done.** `improvements`, `pantheons`, `governments`, `policies` are all in GameConfig and the four systems use `state.config.*`. The two religion belief arrays (`founder_beliefs`, `follower_beliefs`) are the only remaining global-array bypass in a system.

3. **The panel layer is clean.** No local `useState<boolean>` for visibility. No per-panel ESC handlers. All 17 panels wrapped in PanelShell with registered IDs. TopBar triggers carry `data-panel-trigger`. Keyboard shortcuts sourced from PANEL_REGISTRY. The only structural issue is the priority mismatch on TurnSummaryPanel (R2).

4. **The HUD layer shipped its foundation.** HUDManager, TooltipShell, hudRegistry, and hud-tokens.css all exist. CombatHoverPreview, Minimap, TurnTransition, ValidationFeedback, Notifications, EnemyActivitySummary, TooltipOverlay, and UrbanPlacementHintBadge are wired. The `window.__selection` side-channel (R3) is the only remaining canvas-thin-view smell.

5. **Raw-hex colors in panel body content remain (~70 instances).** All are in body content (tech-tree node states, relationship bar colors, age-accent colors), not chrome. The panel and HUD shells use tokens correctly. These are low-priority tokenization work for a future pass when `hud-tokens.css` gets semantic game-data tokens.

6. **Test quality: 12 vague assertions remain** after Batch 4A. The AnimationManager cases (the highest-value fix) are clean. The remaining 12 are all `toBeGreaterThan(0)` on progress/food/gold fields in system tests — functional but imprecise.
