# Test Audit Findings

Generated: 2026-04-15
Standards: `.codex/workflow/design/standards.md`

Classification key:
- **A** — Fully conformant
- **B** — Minor violations (vague assertions, partially concrete)
- **C** — Major violations (missing coverage, determinism breach, wrong location, heavy `any` usage)

---

## 1. Skipped Tests — Complete Inventory

Total skipped: **15 tests** across 3 spec files.

| File | Count | Reason |
|------|-------|--------|
| `e2e/hud.spec.ts` | 3 | (1) settler not adjacent to warrior on seed (guard for stacking test); (2) engine rejected settler→warrior stack; (3) **ValidationFeedback not registered with HUDManager** — permanent skip until sticky registration lands (source-side gap) |
| `e2e/building-placement-flow.spec.ts` | 6 | Each: `founding rejected on this seed` — seed-dependent map precondition guard |
| `e2e/diplomacy.spec.ts` | 1 | `Pre-existing relation already hostile enough to allow formal war` — seed-dependent precondition |
| `e2e/interaction.spec.ts` | 5 | Seed-dependent preconditions: unit distances, city count, terrain adjacency, warrior MP |

### Classification of skips

- 14 of 15 skips are **conditional runtime guards** (`if (!condition) test.skip(...)`) for seed-dependent preconditions. These are acceptable pattern — tests skip themselves when the map seed doesn't produce the required layout. They are not static skips.
- 1 skip in `hud.spec.ts:209` is a **static architectural skip** documenting a real source gap: `ValidationFeedback` does not call `useHUDManager().register()`, so HUDManager's ESC capture never sees it. The test body is fully written and annotated; it's flipped to active once registration lands. **This is a tracked gap, not test rot.** *(Grade: C for the feature gap, not the test itself.)*

---

## 2. Engine Unit Tests (L1) — `packages/engine/src/systems/__tests__/`

### Coverage

All 30 production system files have a corresponding `__tests__/{name}.test.ts` file.

**Exception:** `aiSystem.ts` — only covered by `aiSystem-parity.test.ts` (a parity/emission test), not a general `aiSystem.test.ts`. This is acceptable: `aiSystem` is explicitly documented as a utility function `(state) → GameAction[]`, not a pipeline system. The parity test adequately covers the M12 emission paths.

### S-TEST-LAYER-L1 conformance by file

| File | Grade | Notes |
|------|-------|-------|
| `movementSystem.test.ts` | A | Concrete coords (`toEqual({ q: 1, r: 0 })`), asserts both moved position AND remaining movement, tests rejection paths with unchanged state |
| `combatSystem.test.ts` | B | Tests damage (health < 100) with `toBeLessThan(100)` — acceptable directional assertion for damage. Asserts attacker movementLeft === 0 concretely. Line 22-23 uses `if (defender)` guard — should be `expect(defender).toBeDefined()` then assert health |
| `productionSystem.test.ts` | B | Line 109: `toBeGreaterThan(0)` for production accumulation — vague. Line 84: `as any` cast to check `lockedTile` absent — `S-TS-STRICT-IN-TESTS` violation |
| `researchSystem.test.ts` | B | Line 60: `toBeGreaterThan(0)` for research progress accumulation — the exact amount depends on city yields which vary; could be made concrete with a known city fixture. Line 180 same pattern. Lines 241, 264: `toBeDefined()` where the effect value could be concretely checked |
| `civicSystem.test.ts` | B | Lines 73, 187, 370: `toBeGreaterThan(0)` for progress accumulation — same issue as researchSystem. Lines 226, 249, 409, 432: `toBeDefined()` where effect/log values could be checked concretely |
| `ageSystem.test.ts` | B | Lines 207-361: **10 occurrences** of `toBeDefined()` used as the primary assertion before checking `.effect` — the pattern `expect(goldenMilitary).toBeDefined()` followed by `expect(goldenMilitary!.effect).toEqual(...)` is partially mitigated but the `toBeDefined()` is redundant noise. Dark age assertions at 289-291 are `toBeDefined()` only without checking actual effect values |
| `growthSystem.test.ts` | B | Line 39: `toBeGreaterThan(0)` for food accumulation. Line 53: uses `food !== city.food || population !== city.population` boolean OR — tests either food changed OR population changed, not which. Weak assertion |
| `diplomacySystem.test.ts` | B | Line 213: `toBeGreaterThan(0)` for relationship — could assert the delta concretely |
| `effectSystem.test.ts` | B | Lines 23, 37, 54: `toBeDefined()` precedes concrete sub-assertions — same pattern as ageSystem; mitigated but noisy |
| `crisisSystem.test.ts` | B | Lines 23, 38, 70: `toBeDefined()` for crisis lookups |
| `districtSystem.test.ts` | B | Line 463: `toBeDefined()` for district lookup |
| `promotionSystem.test.ts` | B | Lines 16, 31, 46, 85: `toBeDefined()` before `.promotions` assertion — mitigated but present |
| `tradeSystem.test.ts` | B | Line 89: `toBeGreaterThan(0)` for log length — could assert specific log content |
| `turnSystem.test.ts` | A | Concrete assertions throughout |
| `fortifySystem.test.ts` | A | Concrete assertions |
| `improvementSystem.test.ts` | A | Concrete assertions |
| `visibilitySystem.test.ts` | A | Concrete assertions |
| `governorSystem.test.ts` | A | Concrete assertions |
| `resourceSystem.test.ts` | A | Concrete assertions |
| `specialistSystem.test.ts` | A | Concrete assertions |
| `buildingPlacementSystem.test.ts` | B | Line 174: `as any` cast for `'nonexistent_building'` — `S-TS-STRICT-IN-TESTS` violation |
| `victorySystem.test.ts` | A | Concrete assertions |
| `combatSystem.test.ts (parity)` | A | `combat-rulebook-parity.test.ts`, `flanking-rulebook-parity.test.ts`, `healing-rulebook-parity.test.ts`, `zoc-rulebook-parity.test.ts` — all use concrete values |
| `diplomacySystem.test.ts (parity)` | A | `diplomacy-rulebook-parity.test.ts` — concrete assertions. Line 125: `expect(rel).toBeDefined()` is mitigated by subsequent field checks |
| `productionSystem.test.ts (parity)` | B | `production-rulebook-parity.test.ts` lines 82, 130: `toBeGreaterThan(0)` for per-turn production |
| `growthSystem.test.ts (parity)` | B | `population-rulebook-parity.test.ts` lines 108, 234: `toBeGreaterThan(0)` |
| `ageSystem.test.ts (parity)` | B | `age-transition-rulebook-parity.test.ts` lines 147, 238: `toBeDefined()` |
| `aiSystem-parity.test.ts` | B | Lines 48, 92, 107, 143: `toBeDefined()` as primary action-found assertion, then properties checked — partially mitigated. File is located at `systems/__tests__/` — correct per S-TESTS-L1 since it tests a utility function in `systems/` |
| `pantheon-uniqueness.test.ts` | B | Lines 56, 114, 141, 143, 248: `toBeDefined()` for claims lookup |
| `governmentSystem.test.ts` | A | Concrete assertions |
| `commanderPromotionSystem.test.ts` | A | Concrete assertions |
| `religionSystem.test.ts` | B | Line 364: `toBeDefined()` for `next.religion` |
| `urbanBuildingSystem.test.ts` | B | Lines 78, 233: `toBeDefined()` for `urbanTiles`, `quarters` — could check count |
| `wonderPlacementSystem.test.ts` | A | Concrete assertions |
| `resourceAssignmentSystem.test.ts` | A | Concrete assertions |
| `validation.test.ts` | A | Concrete lastValidation assertions |
| `citySystem.test.ts` | B | Lines 210, 297, 324: `toBeDefined()` for new city lookup before subsequent field checks |
| `production-lockedTile.test.ts` | B | Line 84: `toBeDefined()` for log entry |
| `production-cancel.test.ts` | A | Concrete assertions |

**Summary L1:** 14 A / 22 B / 0 C. No C-grade system tests. Primary issue: widespread `toBeDefined()` + `toBeGreaterThan(0)` as partial assertions, which comply with the letter of S-CONCRETE-ASSERTIONS (they always appear before or alongside concrete checks) but violate the spirit. The `as any` in 2 files is a genuine `S-NO-ANY` violation.

---

## 3. Engine Hex / State / Registry Tests (L1)

| File | Grade | Notes |
|------|-------|-------|
| `hex/__tests__/HexMath.test.ts` | A | Concrete coord assertions throughout |
| `hex/__tests__/Pathfinding.test.ts` | A | Concrete path arrays checked |
| `hex/__tests__/MapGenerator.test.ts` | B | Lines 60, 74-75: `toBeGreaterThan(0)` for land/water tile counts and seed differences — these test statistical properties where exact counts are non-deterministic; borderline acceptable but could be clamped to a range |
| `registry/__tests__/Registry.test.ts` | A | Concrete assertions |
| `state/__tests__/SeededRng.test.ts` | A | Concrete numeric assertions |
| `state/__tests__/SaveLoad.test.ts` | A | Round-trip with concrete field checks — L4 coverage confirmed |
| `state/__tests__/SaveLoad-religion.test.ts` | A | Religion fields round-tripped concretely |
| `state/__tests__/SaveLoad-parity-migration.test.ts` | A | Migration path concretely checked |
| `state/__tests__/CombatPreview.test.ts` | B | Lines 94-97, 115, 166, 361-362, 375: 8 `toBeGreaterThan(0)` for expected damage amounts — the exact formula is deterministic, so concrete expected values are achievable. Line 166 for terrain bonus same issue |
| `state/__tests__/YieldCalculator.test.ts` | A | Concrete yield totals |
| `state/__tests__/TileContents.test.ts` | A | Concrete assertions |
| `state/__tests__/BuildingPlacementValidator.test.ts` | B | Lines 74, 101, 180: `toBeDefined()` for `result.reason`. Lines 220, 271: `toBeGreaterThan(0)` for tile list lengths. Should assert specific reason strings and tile coords |
| `state/__tests__/EconomyAnalytics.test.ts` | A | Concrete numeric assertions |
| `state/__tests__/CombatAnalytics.test.ts` | A | Concrete assertions |
| `state/__tests__/MapAnalytics.test.ts` | A | Concrete assertions |
| `state/__tests__/DistrictOverhaul.types.test.ts` | B | Lines 197, 200, 206: `toBeDefined()` for buildingId and tile — these are type-shape tests, the `.toBeDefined()` is the point but concrete values would be stronger |
| `state/__tests__/Commander.types.test.ts` | A | Concrete assertions |
| `state/__tests__/Religion.types.test.ts` | A | Concrete assertions |
| `state/__tests__/Government.types.test.ts` | A | Concrete assertions |
| `state/__tests__/DistrictAdjacency.test.ts` | A | Concrete yield assertions |
| `state/__tests__/CityYieldsWithAdjacency.test.ts` | A | Concrete yield assertions |
| `state/__tests__/districts-cycle-b.test.ts` | A | Concrete assertions |
| `state/__tests__/MilestoneTracker.test.ts` | A | Concrete assertions |
| `state/__tests__/LegacyPaths.test.ts` | A | Concrete assertions |
| `state/__tests__/UrbanPlacementHints.test.ts` | A | Concrete assertions |

---

## 4. Engine Data Tests (`packages/engine/src/data/__tests__/`)

These are content-validation tests (S-DATA-PURE conformance probes), not system unit tests. Vague assertions here are more acceptable because the tests iterate over dynamically-loaded content arrays.

| File | Grade | Notes |
|------|-------|-------|
| `unit-stat-parity.test.ts` | A | Concrete cross-age stat checks |
| `building-stat-parity.test.ts` | A | Concrete assertions |
| `governors-expansion.test.ts` | A | Concrete assertions |
| `wonders-expansion.test.ts` | A | Concrete assertions |
| `units-expansion.test.ts` | A | Concrete assertions |
| `modern-techs-expansion.test.ts` | B | Lines 78, 104-105: `toBeGreaterThan(0)` for name/description length — these are non-empty checks, acceptable for content validation |
| `civic-catalog-audit.test.ts` | B | Lines 145, 154-155, 173-174, 193: mix of `toBeDefined()` and `toBeGreaterThan(0)` for content presence — standard content-audit pattern |
| `governments.test.ts` | B | Lines 86, 92, 125, 169: `toBeGreaterThan(0)` for id/name length and slot count |
| `pantheons.test.ts` | B | Lines 42, 48, 54, 84, 89, 96, 116, 123, 134, 145, 150, 169: heavy reliance on `toBeGreaterThan(0)` and `toBeDefined()` for content validation — 12 instances |
| `commanders.test.ts` | B | Lines 62-71, 132, 177, 180, 200, 232, 266-267, 280, 287: 13 `toBeGreaterThan(0)` / `toBeDefined()` — these probe content completeness, but several (e.g. `auraRadius > 0`, `combat > 0`) could be exact for known commanders |
| `religion-beliefs.test.ts` | A | Concrete assertions |
| `religion-expansion.test.ts` | A | Concrete assertions |
| `crises-expansion.test.ts` | A | Concrete assertions |
| `antiquity-techs-audit.test.ts` | A | Concrete assertions |
| `exploration-techs-audit.test.ts` | A | Concrete assertions |

---

## 5. Integration Tests (L2) — `packages/engine/src/__tests__/`

**Count:** 1 file — `integration-m12.test.ts`

| File | Grade | Notes |
|------|-------|-------|
| `integration-m12.test.ts` | B | Line 47: `expect(updated).toBeDefined()` then field checks — partially concrete. Otherwise the pipeline smoke tests are concrete (faith 100→75, faith unchanged, city count unchanged). **Coverage gap:** only M12 systems (religion, government, urban building, commander promotion) have an integration test. The founding→settler-consumed→city-created pattern (the canonical L2 example from testing.md) exists only in the E2E tests, not as a headless integration test. No integration test covers the multi-system interactions of combat → experience → promotion, or research → age-progress → age-transition |

**S-TESTS-L2 verdict: C** — only one integration file exists, covering only 4 systems' pipeline wiring. The standard requires integration tests for cross-system features; combat+promotion, research+age, production+city are all covered only at E2E level.

---

## 6. Behavioral Tests (L3 — Playwright E2E) — `packages/web/e2e/`

| File | Grade | Notes |
|------|-------|-------|
| `game.spec.ts` | A | Smoke test for app load, no structural issues |
| `gameplay.spec.ts` | B | Lines 207, 327, 467, 620, 639: `toBeGreaterThan(0)`, `toBeDefined()`, `toBeTruthy()` for movementLeft, settler existence, warrior after-move. Acceptable in E2E where exact values depend on live game state |
| `ai-and-map.spec.ts` | B | Multiple `(window as any).__gameState` — unavoidable bridging pattern for E2E state access; `as any` is expected here |
| `ai-behavior.spec.ts` | B | Lines 67-199: heavy `toBeGreaterThan(0)` for AI unit counts, positions — acceptable for AI behavior probes |
| `selection.spec.ts` | B | Lines 65-184: `toBeTruthy()` widely used for presence checks of screen coords, unit objects — borderline; some could be concrete |
| `interaction.spec.ts` | B | Lines 251, 277, 719, 839: `toBeTruthy()` for neighbor/target presence checks before clicking. Acceptable precondition guards |
| `diplomacy.spec.ts` | B | Lines 133, 157, 256, 294: `as any` for relation status containment check (`.toContain(rel.status as any)`) — the `as any` is used because `rel.status` comes from serialized JSON without the TypeScript type; cleaner approach would be `as string` |
| `keyboard-shortcuts.spec.ts` | B | Lines 117, 257, 259, 297, 349: mix of `toBeGreaterThan(0)` and `toBeDefined()` for UI element count and unit selection |
| `save-load.spec.ts` | B | Line 159: `toBeGreaterThan(0)` for unit count — acceptable |
| `victory-flow.spec.ts` | B | Line 113: `toBeGreaterThan(0)` for score progress |
| `gameplay-parity.spec.ts` | A | Concrete state comparisons |
| `gameplay-parity-strict.spec.ts` | A | Concrete state comparisons |
| `ai-parity-emissions.spec.ts` | A | Concrete emission assertions |
| `robustness.spec.ts` | B | Lines 167, 187, 255, 299: `toBeTruthy()` and `toBeGreaterThan(0)` for robustness checks — acceptable for stability tests |
| `building-placement-flow.spec.ts` | A | Concrete DOM state assertions; seed-dependent skips are properly guarded |
| `hud.spec.ts` | B | Duplicate-content test is well-written with concrete `toContainText(/1\s*\/\s*2/)`. ESC test is skipped with full body and tracking note |

**S-TESTS-L3 verdict: B overall.** `hud.spec.ts` exists confirming the M37-B regression guard. All major UI surfaces (panel open/close, building placement, diplomacy, save/load, victory, AI behavior, keyboard shortcuts) have E2E coverage.

---

## 7. Output/Serialization Tests (L4) — `packages/engine/src/state/__tests__/`

| File | Grade | Notes |
|------|-------|-------|
| `SaveLoad.test.ts` | A | Full round-trip with Map/Set preservation, concrete field checks |
| `SaveLoad-religion.test.ts` | A | Religion-specific fields (pantheonId, beliefs, faith) round-tripped |
| `SaveLoad-parity-migration.test.ts` | A | Migration from pre-M12 save format checked concretely |

**S-TESTS-L4 verdict: A.** Three L4 files covering the main save schema, religion extension, and migration path.

---

## 8. Web Unit Tests — `packages/web/src/`

### Canvas tests
| File | Grade | Notes |
|------|-------|-------|
| `canvas/__tests__/AnimationManager.test.ts` | C | Lines 175-176, 181-182, 187-188, 203-204: `toBeDefined()` for `.x` and `.y` — these are pure pixel positions with known interpolated values. The test at line 210 `toBeGreaterThan(startPos!.x)` is directional-only. The interpolation math is deterministic; exact pixel values could be asserted with known hex-to-pixel constants. **8 `toBeDefined()` calls for numeric coordinates is the clearest S-CONCRETE-ASSERTIONS violation in the codebase.** |

### Panel tests
| File | Grade | Notes |
|------|-------|-------|
| `ui/panels/__tests__/PanelManager.test.tsx` | A | Tests open/close/toggle/ESC behavior concretely |
| `ui/panels/__tests__/PanelShell.test.tsx` | B | Lines 28, 106: `toBeTruthy()` for element presence — should use `toBeInTheDocument()` |
| `ui/panels/__tests__/PanelShell.migration.test.tsx` | B | Line 235: `toBeGreaterThan(0)` for civ button count |
| `ui/panels/__tests__/CityPanel.shell.test.tsx` | B | Line 148: `toBeTruthy()` for shell element |
| `ui/panels/__tests__/CityPanel.placement.test.tsx` | A | Concrete dispatch and mode assertions |
| `ui/panels/__tests__/EventLogPanel.shell.test.tsx` | B | Lines 54-55: `toBeTruthy()` for shell and title |
| `ui/panels/__tests__/HelpPanel.shell.test.tsx` | B | Lines 21-22: `toBeTruthy()` for shell and title |
| `ui/panels/__tests__/TurnSummaryPanel.shell.test.tsx` | B | Lines 79-80: `toBeTruthy()` for shell and title |
| `ui/panels/__tests__/CrisisPanel.shell.test.tsx` | B | Line 71: `toBeTruthy()` for shell |
| `ui/panels/__tests__/VictoryPanel.shell.test.tsx` | B | Line 61: `toBeTruthy()` for shell |
| `ui/panels/__tests__/CommanderPanel.test.tsx` | B | Lines 249-250: `toBeTruthy()` for row test-ids |
| `ui/panels/__tests__/DiplomacyPanel.test.tsx` | B | Line 76: `toBeTruthy()` for empty-state text |
| `ui/panels/__tests__/GovernorPanel.test.tsx` | B | Line 80: `toBeTruthy()` for empty-state text |
| `ui/panels/__tests__/GovernmentPanel.test.tsx` | A | Concrete assertions |
| `ui/panels/__tests__/ReligionPanel.test.tsx` | A | Concrete assertions |
| `ui/panels/__tests__/TechTreePanel.click.test.tsx` | A | Concrete dispatch assertions |
| `ui/panels/__tests__/CivicTreePanel.click.test.tsx` | A | Concrete dispatch assertions |

### HUD tests
| File | Grade | Notes |
|------|-------|-------|
| `ui/hud/__tests__/HUDManager.test.tsx` | A | Concrete register/dismiss/cycle/ESC tests |
| `ui/hud/__tests__/TooltipShell.test.tsx` | A | Concrete chrome behavior |
| `ui/hud/__tests__/TooltipOverlay.stackedUnits.test.tsx` | A | M37-B regression guard — single entity per cycle index checked |
| `ui/hud/__tests__/TooltipOverlay.tiers.test.tsx` | A | Tier switching with concrete field visibility assertions |
| `ui/hud/__tests__/UrbanPlacementHintBadge.test.tsx` | A | Concrete score assertions |
| `ui/components/__tests__/ValidationFeedback.test.tsx` | A | Concrete toast content |

### Provider tests
| File | Grade | Notes |
|------|-------|-------|
| `providers/__tests__/GameProvider.placementMode.test.tsx` | A | Concrete mode state assertions |

### Layout tests
| File | Grade | Notes |
|------|-------|-------|
| `ui/layout/__tests__/TopBar.panelManager.test.tsx` | A | Concrete open/toggle assertions |

---

## 9. File Location Conformance (S-TESTS-L1 / S-TEST-FILE-LOCATIONS)

All engine system tests are correctly in `packages/engine/src/systems/__tests__/`.
All hex math tests are correctly in `packages/engine/src/hex/__tests__/`.
All state utility tests are correctly in `packages/engine/src/state/__tests__/`.
Registry test is correctly in `packages/engine/src/registry/__tests__/`.

**Mismatches:**
- `state/__tests__/CombatPreview.test.ts` — tests `CombatPreview.ts` which is a state utility; location is correct but the file tests calculation functions that touch combat math. No boundary violation.
- `state/__tests__/DistrictOverhaul.types.test.ts`, `Commander.types.test.ts`, `Religion.types.test.ts`, `Government.types.test.ts` — these are type-shape tests (do the interfaces compile and construct). Not a location violation but they are not testing runtime behavior; a future refactor could move them to a `types/__tests__/` directory.
- `systems/__tests__/aiSystem-parity.test.ts` — tests `aiSystem.ts` in `systems/`. Correct location.

---

## 10. Determinism (S-DETERMINISM)

`Math.random()` scan result: **0 occurrences** in any `__tests__/` or `*.spec.ts` file. Full pass.

All engine system tests use `createTestState` which initializes with a fixed seeded RNG (`seed: 42` in most helpers). The Playwright specs use either fixed seeds passed to `startGame(page, { seed: N })` or accept seed-dependent variation and guard with `test.skip`.

---

## 11. TypeScript `any` Violations (S-TS-STRICT-IN-TESTS)

### Engine test files (unit tests)
| Location | Violation |
|----------|-----------|
| `systems/__tests__/buildingPlacementSystem.test.ts:174` | `'nonexistent_building' as any` — should narrow the type or cast as a branded string |
| `systems/__tests__/productionSystem.test.ts:84` | `(updatedCity.productionQueue[0] as any).lockedTile` — accessing a property that shouldn't exist; cast is a smell, better to use `'lockedTile' in updatedCity.productionQueue[0]` |

### E2E spec files
All `(window as any).__gameState` / `(window as any).__gameDispatch` usages — 30+ occurrences across 7 spec files. This is a bridge pattern for accessing internal state from Playwright's `page.evaluate()`. The correct fix is a typed helper module (`window.__gameState: SerializedGameState`) but the cast is unavoidable in the current architecture. **Tolerated but tracked.**

`e2e/diplomacy.spec.ts:133,157,256,294` — `rel.status as any` in `.toContain()`. Should be `rel.status as string`.

---

## 12. Cross-Cutting Issues

### S-CONCRETE-ASSERTIONS — Summary of violations

**High frequency (>5 occurrences):**
- `packages/web/src/canvas/__tests__/AnimationManager.test.ts` — 8 `toBeDefined()` for numeric x/y coordinates
- `packages/engine/src/systems/__tests__/ageSystem.test.ts` — 10 `toBeDefined()` for legacy bonus lookups
- `packages/engine/src/data/__tests__/commanders.test.ts` — 13 `toBeGreaterThan(0)` / `toBeDefined()`
- `packages/engine/src/data/__tests__/pantheons.test.ts` — 12 occurrences

**Pattern:** Many `toBeDefined()` calls appear as a guard before a subsequent `.toEqual()` on the found object's property (the `expect(goldenMilitary).toBeDefined(); expect(goldenMilitary!.effect).toEqual(...)` pattern). This is safer than a bare `!` non-null assertion but still adds noise assertions that hide intent. Preferred alternative: `expect(goldenMilitary).not.toBeNull()` or just assert the full object directly.

### S-TEST-CHANGED-AND-UNCHANGED

Most system tests assert the changed state well. Gaps:
- `combatSystem.test.ts` lines 22-23: `if (defender)` guard means unchanged state (attacker present) is not asserted on the dead-unit path.
- `growthSystem.test.ts` line 53: the OR assertion does not verify which part changed.
- Several rulebook-parity tests verify only the target property, not that unrelated state was unchanged. Acceptable for rulebook regression tests.

---

## 13. Grade Summary

| Layer | Standard | Verdict |
|-------|----------|---------|
| L1 — Engine system unit tests | S-TESTS-L1 | B (all 30+ systems covered, widespread vague assertions) |
| L1 — Engine hex/state tests | S-TESTS-L1 | A (mostly concrete) |
| L2 — Integration tests | S-TESTS-L2 | C (only 1 file, 4 systems covered) |
| L3 — Playwright E2E | S-TESTS-L3 | B (all surfaces covered, vague assertions acceptable in E2E) |
| L4 — Serialization | S-TESTS-L4 | A (3 files, comprehensive) |
| Web unit — Canvas | — | C (AnimationManager: 8 `toBeDefined()` on numeric coords) |
| Web unit — Panels | — | B (shell tests use `toBeTruthy()` instead of `toBeInTheDocument()`) |
| Web unit — HUD | — | A |
| Determinism | S-DETERMINISM | A (0 `Math.random()` in tests) |
| TypeScript any | S-NO-ANY | B (2 engine violations, 30+ tolerated E2E bridge casts) |
| File locations | S-TEST-FILE-LOCATIONS | A |
| Skipped tests | — | 15 total; 14 runtime-conditional, 1 static architectural gap |

---

## 14. Priority Fixes

| Priority | Fix | Standard |
|----------|-----|----------|
| 1 (High) | Add L2 integration tests for combat→promotion, research→age-transition, production→city cross-system flows | S-TESTS-L2 |
| 2 (High) | `AnimationManager.test.ts`: replace 8 `toBeDefined()` with exact pixel assertions using known hex-to-pixel constants | S-CONCRETE-ASSERTIONS |
| 3 (Medium) | `ageSystem.test.ts`: replace 10 `toBeDefined()` guard calls — assert the full effect object directly without a separate `toBeDefined()` precondition | S-CONCRETE-ASSERTIONS |
| 4 (Medium) | `productionSystem.test.ts:84`, `buildingPlacementSystem.test.ts:174`: remove `as any` casts; use `'key' in obj` narrowing or proper interface extension | S-NO-ANY |
| 5 (Medium) | `CombatPreview.test.ts`: replace `toBeGreaterThan(0)` with exact expected damage values (formula is deterministic) | S-CONCRETE-ASSERTIONS |
| 6 (Low) | Panel shell tests: replace `toBeTruthy()` with `toBeInTheDocument()` (8 files) | S-CONCRETE-ASSERTIONS |
| 7 (Low) | `diplomacy.spec.ts`: replace `rel.status as any` with `rel.status as string` | S-NO-ANY |
| 8 (Tracked) | Flip `hud.spec.ts:209` (ValidationFeedback ESC) from skip to active once `HUDManager.register` is wired for sticky toasts | S-HUD-PATTERN |
