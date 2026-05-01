# Audit Findings: engine-core

**Scope:** `packages/engine/src/hex/`, `state/`, `types/`, `registry/`, `effects/` (empty), `GameEngine.ts`, `index.ts`
**Date:** 2026-04-15
**Standards checked:** S-SEEDED-RNG, S-ENGINE-PURE, S-IMPORT-BOUNDARIES, S-GAMESTATE-IMMUTABLE, S-READONLY, S-NO-ANY, S-NAMED-EXPORTS, S-ESM-ONLY, S-DISCRIMINATED-UNIONS, S-REGISTRY-PATTERN, S-CONCRETE-ASSERTIONS, S-DETERMINISM, S-GAMECONFIG-EMBEDDED, S-TESTS-L4

---

## Summary

| Severity | Count |
|----------|-------|
| C (critical) | 5 |
| B (high) | 4 |
| Observation | 3 |

---

## C Items (Critical)

### C-1 — S-SEEDED-RNG: `Math.random()` in engine code

**File:** `packages/engine/src/state/CombatPreview.ts:339-340`

```typescript
const attackerDmg = attackerDmgMin + Math.random() * (attackerDmgMax - attackerDmgMin);
const defenderDmg = defenderDmgMin + Math.random() * (defenderDmgMax - defenderDmgMin);
```

`calculateCombatOdds()` (called from both `calculateCombatPreview` and `calculateCityCombatPreview`) uses `Math.random()` in its 100-iteration Monte Carlo loop. This makes combat odds non-deterministic and non-replayable — two calls with identical inputs produce different results.

`CombatPreview.ts` is exported from `index.ts` and consumed by the web UI for hover previews. Because it is a pure utility in `state/`, there is no `rng: RngState` parameter available at the call site without a threading change.

**Fix:** Pass a seeded RNG snapshot into `calculateCombatOdds` (or accept a `RngState` parameter on the top-level function) and use `nextRandom` from `SeededRng.ts` to sample the loop.

---

### C-2 — S-IMPORT-BOUNDARIES: `state/` imports from `systems/`

**Files:**
- `packages/engine/src/state/BuildingPlacementValidator.ts:6` — imports `isWonderPlacementValid` from `../systems/wonderPlacementSystem`
- `packages/engine/src/state/ResourceChangeCalculator.ts:3-4` — imports `calculateCityHappiness`, `calculateSettlementCapPenalty`, `applyHappinessPenalty` from `../systems/resourceSystem` and `getGrowthThreshold` from `../systems/growthSystem`

Per `.codex/rules/import-boundaries.md`, `state/` may import from `types/`, `hex/`, and `registry/` — never from `systems/`. These imports invert the layering: utilities that the web UI calls now indirectly depend on system implementation details.

**Fix:** Move the shared logic (`isWonderPlacementValid`, `calculateCityHappiness`, `calculateSettlementCapPenalty`, `applyHappinessPenalty`, `getGrowthThreshold`) to `state/` helper modules or inline equivalent logic in the validator/calculator without importing from `systems/`.

---

### C-3 — S-REGISTRY-PATTERN / S-GAMECONFIG-EMBEDDED: `YieldCalculator.ts` bypasses `state.config`

**File:** `packages/engine/src/state/YieldCalculator.ts:4,121`

```typescript
import { ALL_IMPROVEMENTS } from '../data/improvements';
// ...
function getImprovementYields(improvementId: string): Partial<YieldSet> {
  const improvement = ALL_IMPROVEMENTS.find(i => i.id === improvementId);
```

`YieldCalculator` is in `state/` but directly imports and linearly searches the `ALL_IMPROVEMENTS` global array instead of accessing `state.config.improvements` (which would be an `O(1)` `ReadonlyMap` lookup). This violates S-GAMECONFIG-EMBEDDED (systems/utilities must access content via `state.config.*`) and S-REGISTRY-PATTERN. It is also O(n) instead of O(1).

**Note:** `state.config` does not currently have an `improvements` map — `GameConfig` in `types/GameConfig.ts` does not include an `improvements` field. The pattern violation is therefore shared between the caller and the config definition.

**Fix:** Add `improvements: ReadonlyMap<string, ImprovementDef>` to `GameConfig`, populate it in `GameConfigFactory.ts`, and update `getImprovementYields` to accept `config` and call `config.improvements.get(improvementId)`.

---

### C-4 — S-SEEDED-RNG: `GameInitializer.ts` uses `Date.now()` as fallback seed

**File:** `packages/engine/src/state/GameInitializer.ts:19`

```typescript
const gameSeed = seed ?? Date.now();
```

When no seed is provided (the common production path from the web UI), the RNG is seeded with wall-clock time, making the game non-replayable from that point. If the same `Date.now()` timestamp is used twice within a millisecond, maps are identical — but that is coincidental, not guaranteed.

This is not a violation of S-SEEDED-RNG in the narrow sense (only systems are audited there), but it breaks the S-DETERMINISM guarantee stated in `tech-conventions.md`: "Games must be deterministic and replayable."

**Fix:** The caller (web layer) should always supply a seed; make `seed` a required parameter, or generate the seed deterministically from user-chosen config options and expose it to the save system.

---

### C-5 — S-CONCRETE-ASSERTIONS: vague `toBeGreaterThan(0)` assertions in `CombatPreview.test.ts`

**File:** `packages/engine/src/state/__tests__/CombatPreview.test.ts:94-97,115,166,361-362`

```typescript
expect(preview.attackerStrength).toBeGreaterThan(0);
expect(preview.defenderStrength).toBeGreaterThan(0);
expect(preview.expectedDamageToDefender).toBeGreaterThan(0);
expect(preview.expectedDamageToAttacker).toBeGreaterThan(0);
```

`calculateCombatPreview` is non-deterministic (see C-1). The tests reflect this — rather than asserting exact strength and damage values, they only assert `> 0`. Because the underlying `calculateCombatOdds` uses `Math.random()`, pinning exact values is impossible without fixing C-1 first. These assertions would pass for any positive number and do not catch regressions in calculation logic.

**Fix:** After fixing C-1 (seeded RNG), replace these assertions with exact expected values for known inputs (e.g., warrior vs warrior at full health on grassland = specific strength difference = specific damage range).

Also affects `hex/__tests__/MapGenerator.test.ts:60,74,75` — `toBeGreaterThan(0)` is used to verify "maps differ" and "land/water both exist," which are acceptable here because these are inherently non-exact statistical properties of map generation (not calculation correctness). Classify as observation-level.

---

## B Items (High)

### B-1 — S-IMPORT-BOUNDARIES: `types/GameConfig.ts` imports from `data/`

**File:** `packages/engine/src/types/GameConfig.ts:10-11`

```typescript
import type { CivilizationDef } from '../data/civilizations/types';
import type { LeaderDef } from '../data/leaders/types';
```

Per `import-boundaries.md`, `types/` may only be imported by other layers — it should not import from `data/`. The standard import direction is `data/ → types/` (data files import type definitions), not the reverse. This inversion exists because `CivilizationDef` and `LeaderDef` are defined in `data/` subdirectory type files rather than in `types/`.

**Fix:** Move `CivilizationDef` and `LeaderDef` to `types/Civilization.ts` and `types/Leader.ts` respectively, then re-export from `data/civilizations/types.ts` for backward compat. This restores the canonical import direction.

---

### B-2 — S-REGISTRY-PATTERN: `Registry<T>` internal `Map` is mutable

**File:** `packages/engine/src/registry/Registry.ts:3`

```typescript
private readonly items: Map<string, T> = new Map();
```

The `items` field is declared `readonly` (the reference is constant) but the `Map` itself is a mutable `Map<string, T>`, not a `ReadonlyMap`. The `clear()` method at line 30 allows arbitrary in-place mutation of all registered content after startup. If `GameConfig` is built once and the registries are then `clear()`ed, systems that cached a reference to the config would see empty registries.

The `register` method also mutates `items` directly. This is expected for a registry that is populated at startup, but the interface could be strengthened.

**Fix:** Add a `freeze(): void` method that converts `items` to `ReadonlyMap` after registration is complete, or remove the `clear()` method from the public API (it is only used in tests).

---

### B-3 — S-NO-ANY: mutable arrays in `ResourceChangeSummary`

**File:** `packages/engine/src/state/ResourceChangeCalculator.ts:23-24`

```typescript
starvingCities: Array<{ cityId: string; cityName: string; foodDeficit: number }>;
goldDeficitCities: Array<{ cityId: string; cityName: string; deficit: number }>;
```

The `ResourceChangeSummary` interface uses mutable `Array<T>` (not `ReadonlyArray<T>`) for `starvingCities` and `goldDeficitCities`, violating S-READONLY. These are summary fields built once and should be immutable.

**Fix:** Change to `ReadonlyArray<{ readonly cityId: string; readonly cityName: string; readonly foodDeficit: number }>`.

---

### B-4 — S-CONCRETE-ASSERTIONS: `toBeGreaterThan(0)` vague assertions in `CombatPreview.test.ts` (non-RNG cases)

**File:** `packages/engine/src/state/__tests__/CombatPreview.test.ts:166`

```typescript
expect(preview.modifiers.terrainDefenseBonus).toBeGreaterThan(0);
```

This assertion verifies only that the terrain bonus is positive, not that it is a specific value. For a known terrain (hills) and known unit types, the exact value is deterministic and should be asserted precisely.

**Fix:** Assert the exact expected terrain defense bonus value for the configured test tile.

---

## Observations (Low / Style)

### O-1 — `GameInitializer.ts`: non-readonly local object construction

**File:** `packages/engine/src/state/GameInitializer.ts:42-80`

The `makePlayer` and `makeUnit` functions return plain mutable objects (e.g., `researchedTechs: [] as string[]`). These objects are immediately assigned into `ReadonlyMap` entries in the final `GameState`, so they become immutable at the container level. However, `[] as string[]` should be `[] as ReadonlyArray<string>` for consistency with S-READONLY. This is a style issue, not a structural violation.

---

### O-2 — `SaveLoad.ts`: deserializer returns untyped Maps/Sets

**File:** `packages/engine/src/state/SaveLoad.ts:22-34`

`deserializeState` casts the `JSON.parse` result directly to `GameState` without validation. Deserialized `Map` and `Set` instances are plain `Map`/`Set`, not `ReadonlyMap`/`ReadonlySet` — TypeScript accepts this because `ReadonlyMap` is a subtype of `Map` structurally. This is safe at runtime but the round-trip loses the `readonly` contract at the type level in practice; a load from disk could silently violate immutability if the caller mutates the result.

---

### O-3 — `types/` directory: no `effects/` directory found

**File:** `packages/engine/src/effects/` — empty (no files)

The CLAUDE.md architecture describes an `effects/` directory with `EffectDef` types and evaluation logic. In practice, `EffectDef` is defined in `types/GameState.ts` and evaluation logic lives in `state/EffectUtils.ts` and `systems/effectSystem.ts`. The directory referenced in architecture docs does not exist. This is a documentation drift issue, not a code defect.

---

## Standards with no findings in this scope

| Standard | Result |
|----------|--------|
| S-ENGINE-PURE | Clean — no DOM, React, or browser imports found in `hex/`, `state/`, `types/`, `registry/` |
| S-ESM-ONLY | Clean — no `require()` calls found |
| S-NAMED-EXPORTS | Clean — no `export default` in any scoped file |
| S-DISCRIMINATED-UNIONS | Clean — `GameAction` and `EffectDef` are proper discriminated unions with `readonly type` discriminants; no class hierarchies |
| S-READONLY on types/ | Clean — all interface fields use `readonly`, all collections use `ReadonlyMap`/`ReadonlyArray`/`ReadonlySet` |
| S-IMPORT-BOUNDARIES (systems→hex) | Clean — `hex/` does not import from `systems/` |
| S-IMPORT-BOUNDARIES (types→state) | Clean — `types/` does not import from `state/` |
| S-TESTS-L4 | Adequate — `state/__tests__/SaveLoad.test.ts` covers round-trip for Maps and Sets; `SaveLoad-religion.test.ts` covers optional fields |
