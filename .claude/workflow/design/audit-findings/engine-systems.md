# Audit: Engine Systems Pipeline

Scope: packages/engine/src/systems/*.ts + __tests__/
Auditor: sonnet subagent, 2026-04-15
Files audited: 31 system files (aiSystem, ageSystem, buildingPlacementSystem, citySystem, civicSystem, combatSystem, commanderPromotionSystem, crisisSystem, diplomacySystem, districtSystem, effectSystem, fortifySystem, governmentSystem, governorSystem, growthSystem, improvementSystem, movementSystem, productionSystem, promotionSystem, religionSystem, researchSystem, resourceAssignmentSystem, resourceSystem, specialistSystem, tradeSystem, turnSystem, urbanBuildingSystem, victorySystem, visibilitySystem, wonderPlacementSystem) + index.ts; 43 test files.

---

## Summary

- Total findings: 11
- Category C (genuine): 7
- Category B (acceptable exceptions): 2
- Category A (false positives): not listed below

---

## Category C — Genuine Violations

### C1 — S-GAMECONFIG-EMBEDDED / S-REGISTRY-PATTERN: Global data arrays accessed directly in systems instead of state.config.*

`improvements`, `pantheons`, `governments`, and `policies` are not registered in `GameConfig` / `GameConfigFactory`. Three systems bypass the registry pattern entirely and import from module-level global arrays.

**C1a — aiSystem**
- File: `packages/engine/src/systems/aiSystem.ts:4-10`
- Offenders:
  ```typescript
  import { ALL_IMPROVEMENTS } from '../data/improvements';
  import { ALL_PANTHEONS } from '../data/religion';
  import { ALL_GOVERNMENTS, ALL_POLICIES } from '../data/governments';
  ```
  Used at lines 540, 553, 579, 660, 1468, 1598 (ALL_IMPROVEMENTS), 1433–1568 (AI helpers).
- Standard: S-GAMECONFIG-EMBEDDED, S-REGISTRY-PATTERN
- Proposed fix: add `improvements`, `pantheons`, `governments`, `policies` fields to `GameConfig` / `GameConfigFactory`, then replace direct array imports with `state.config.improvements.get(...)` etc.
- Est. LOC: ~20 (config factory additions) + ~15 (aiSystem call-site changes)

**C1b — governmentSystem**
- File: `packages/engine/src/systems/governmentSystem.ts:43`
- Offenders:
  ```typescript
  import { ALL_GOVERNMENTS, ALL_POLICIES } from '../data/governments';
  ```
  Used in `findGovernment` (line 84) and `findPolicy` (line 89) helpers which are exported.
- Standard: S-GAMECONFIG-EMBEDDED
- Proposed fix: accept `config` from `state.config` once governments/policies are in `GameConfig`; remove the direct data import.
- Est. LOC: 5

**C1c — improvementSystem**
- File: `packages/engine/src/systems/improvementSystem.ts:4`
- Offender: `import { ALL_IMPROVEMENTS } from '../data/improvements';`
  Used at line 21: `const improvement = ALL_IMPROVEMENTS.find(i => i.id === improvementId);`
- Standard: S-GAMECONFIG-EMBEDDED
- Proposed fix: add `improvements` to `GameConfig` and use `state.config.improvements.get(improvementId)` instead.
- Est. LOC: 3

**C1d — religionSystem**
- File: `packages/engine/src/systems/religionSystem.ts:41`
- Offender: `import { ALL_PANTHEONS } from '../data/religion/pantheons';`
  Used at line 63 in `findPantheon` helper.
- Standard: S-GAMECONFIG-EMBEDDED
- Proposed fix: add `pantheons` to `GameConfig` and use `state.config.pantheons.get(pantheonId)`.
- Est. LOC: 3

---

### C2 — S-NO-ANY: `any` typed parameters in system source files

**C2a — districtSystem**
- File: `packages/engine/src/systems/districtSystem.ts:56, 208, 209, 265`
- Offenders:
  ```typescript
  function handlePlaceDistrict(state, cityId, districtId, tile: any): GameState
  function validatePlacementConstraints(districtDef, tile: any, city: any, state): string | null
  function calculateAdjacencyBonus(districtDef, position: any, state): number
  ```
  In all three cases `tile`/`position`/`city` should be typed `HexCoord` or a concrete city/tile interface.
- Standard: S-NO-ANY
- Proposed fix: replace `any` with `HexCoord` (already imported via `coordToKey`); `city` can be typed `CityState`.
- Est. LOC: 4

**C2b — aiSystem**
- File: `packages/engine/src/systems/aiSystem.ts:1433, 1464, 1515, 1568`
- Offenders:
  ```typescript
  function tryBuildImprovement(state, builder, player: any, ...): boolean
  function pickBestImprovement(state, tile: any, player: any): string | null
  function moveTowardImprovementSpot(state, builder, player: any, ...): void
  function pickTownSpecialization(state, city, player: any): TownSpecialization | null
  ```
  `player` should be `PlayerState`; `tile` should be the map tile type.
- Standard: S-NO-ANY
- Proposed fix: type `player` as `PlayerState` (imported from types) and `tile` as the `HexTile` interface.
- Est. LOC: 4

---

### C3 — S-CONCRETE-ASSERTIONS: Vague test assertions that do not verify concrete values

Multiple test files use `toBeDefined()` as the sole assertion (not as a guard before a concrete check), or `toBeGreaterThan(0)` where an exact value is knowable.

**C3a — combatSystem.test.ts**
- File: `packages/engine/src/systems/__tests__/combatSystem.test.ts:157-158`
- Offender:
  ```typescript
  const attacker = next.units.get('a1');
  if (attacker) expect(attacker.experience).toBeGreaterThan(0);
  ```
  The `if` guard silently passes the test when the attacker is killed, and `toBeGreaterThan(0)` hides the expected exact value (+5 XP per combat in the spec).
- Standard: S-CONCRETE-ASSERTIONS
- Proposed fix: assert `expect(attacker).toBeDefined()` unconditionally then `expect(attacker!.experience).toBe(5)` (or `toBe(prev_xp + 5)` for a surviving attacker scenario).
- Est. LOC: 3

**C3b — ageSystem.test.ts (pattern, 12 instances)**
- File: `packages/engine/src/systems/__tests__/ageSystem.test.ts` — lines 207, 228, 248, 268, 289, 291, 314, 337, 359, 361 and 2 more.
- Pattern: `expect(goldenMilitary).toBeDefined()` followed by a concrete `toEqual` on the next line. The `toBeDefined()` here is a guard (acceptable) but 4 of the 12 are standalone without a follow-up concrete assertion (lines 289–291 on dark-age effects and 337, 359).
- Standard: S-CONCRETE-ASSERTIONS
- Proposed fix: replace standalone `expect(x).toBeDefined()` with direct destructuring and a concrete `toEqual`; or add the concrete effect assertion after each `toBeDefined`.
- Est. LOC: ~8

**C3c — Additional isolated vague assertions (5 files)**
- `diplomacySystem.test.ts:213` — `expect(rel.relationship).toBeGreaterThan(0)` (friendship endeavor increments relationship by a known amount; assert exact value).
- `civicSystem.test.ts:73,187,370` — `toBeGreaterThan(0)` on progress values where the science yield is deterministic from test state.
- `researchSystem.test.ts:60,180` — same pattern as civic.
- `growthSystem.test.ts:39` — `expect(updatedCity.food).toBeGreaterThan(0)`.
- `productionSystem.test.ts:109` — `expect(...productionProgress).toBeGreaterThan(0)`.
- Standard: S-CONCRETE-ASSERTIONS
- Proposed fix: compute the expected value from the known test state and assert `toBe(expectedValue)`.
- Est. LOC: ~15 across files

---

### C4 — Observation only (NOT a formal C violation): systems/index.ts missing 6 system exports

`wonderPlacementSystem`, `religionSystem`, `governmentSystem`, `urbanBuildingSystem`, `resourceAssignmentSystem`, `commanderPromotionSystem` are exported from the engine barrel (`packages/engine/src/index.ts`) but NOT from `packages/engine/src/systems/index.ts`. All 31 system files exist; the barrel is simply incomplete. This is not a standards violation (no S-* rule mandates the barrel) but it creates inconsistency.

---

## Category B — Acceptable Exceptions

### B1 — S-SYSTEM-INDEPENDENT in __tests__/: cross-system imports in test files

Detection pattern `from.*[.]/[A-Za-z]*System` matches many test files (e.g. `combat-rulebook-parity.test.ts` imports `combatSystem`, `movementSystem`, `buildingPlacementSystem`, `turnSystem`). These are L2 integration tests that intentionally exercise the multi-system pipeline. Cross-system imports in `__tests__/` are permitted by the rule; the rule only prohibits source system files from importing each other. All confirmed false positives for source files — no source system imports another system.

### B2 — S-GAMESTATE-IMMUTABLE / push+delete on local copies

Detection pattern `[.]push[(]|[.]delete[(]` matches ~40 lines across `combatSystem.ts`, `aiSystem.ts`, `citySystem.ts`, etc. In every case the mutation is on a **locally created copy** (`new Map(state.units)`, `[...state.log]`) before being assigned into a new spread state object. This is the correct immutable pattern. No direct mutation of `state.*` properties was found.

---

## Observations

1. **No browser/DOM leaks (S-ENGINE-PURE)**: Zero matches for `react|window|document|canvas|requestAnimationFrame` in any system file. Engine purity is solid.

2. **No Math.random in system source files (S-SEEDED-RNG)**: All randomness (combat dice rolls in `combatSystem.ts`, age outcome rolls in `ageSystem.ts`) correctly uses `nextRandom(state.rng)` from `SeededRng.ts`. No `Math.random()` in tests either.

3. **No require() / no default exports (S-ESM-ONLY, S-NAMED-EXPORTS)**: All files use ESM imports, all exports are named.

4. **No cross-system imports in source files (S-SYSTEM-INDEPENDENT)**: `aiSystem.ts` lines 22-40 explicitly mirror the diplomacy `getRelationKey` logic locally to avoid importing `diplomacySystem` — with a comment noting the intent. This is the correct pattern.

5. **Full L1 test coverage (S-TESTS-L1)**: All 30 system files have at least one corresponding `__tests__/{Name}.test.ts` file. Several systems have additional `*-rulebook-parity.test.ts` files for rule-correctness coverage.

6. **GameConfig gap is the largest structural issue**: `improvements`, `pantheons`, `governments`, and `policies` are content types that exist in `data/` but are not in `GameConfig`. Until they are registered, the three affected systems (`aiSystem`, `governmentSystem`, `improvementSystem`, `religionSystem`) are forced to use global array imports — which is the architectural smell that C1 documents. The fix requires extending `GameConfig` + `GameConfigFactory`, not rewriting the systems.

7. **`growthSystem.ts` re-export at line 208**: `export { calculateCityYields } from '../state/YieldCalculator'` is a backward-compat shim. Not a violation but creates the impression that `calculateCityYields` lives in `growthSystem`. The `systems/index.ts` already re-exports it directly from `YieldCalculator` (line 5), so the shim in `growthSystem.ts` is redundant.
