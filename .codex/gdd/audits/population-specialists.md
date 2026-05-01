# Population & Specialists — hex-empires Audit

**System slug:** `population-specialists`
**GDD doc:** [systems/population-specialists.md](../systems/population-specialists.md)
**Audit date:** `2026-05-02`
**Auditor:** `codex-gpt-5.5-lead` (growth-history refresh)
**Version target:** Firaxis patch 1.3.0 (per commitment.md)

---

## Engine files audited

- `packages/engine/src/state/GrowthUtils.ts`
- `packages/engine/src/systems/growthSystem.ts`
- `packages/engine/src/systems/ageSystem.ts`
- `packages/engine/src/systems/specialistSystem.ts`
- `packages/engine/src/state/YieldCalculator.ts`
- `packages/engine/src/state/CityYieldsWithAdjacency.ts`
- `packages/engine/src/state/DistrictAdjacency.ts`
- `packages/engine/src/state/HappinessUtils.ts`
- `packages/engine/src/systems/turnSystem.ts`
- `packages/web/src/ui/panels/CityPanel.tsx`

---

## Summary tally

| Status | Count |
|---|---|
| MATCH | 5 |
| CLOSE | 3 |
| DIVERGED | 1 |
| MISSING | 0 |
| EXTRA | 0 |

**Total findings:** 9

---

## Detailed findings

### F-01: Growth formula constants align with GDD quadratic constants — MATCH
**Location:** `packages/engine/src/state/GrowthUtils.ts`
**GDD reference:** `systems/population-specialists.md` section Growth food threshold (post-patch 1.1.2)
**Severity:** HIGH
**Effort:** S
**VII says:** Flat + (Scalar * X) + (Exponent * X^2). Antiquity: 5/20/4; Exploration: 30/50/5; Modern: 60/60/6.
**Engine does:** `getGrowthThresholdForEvents` implements the same constants and `getGrowthThreshold` preserves the legacy population fallback.
**Gap:** None for formula constants.
**Recommendation:** Keep formula tests in `population-rulebook-parity.test.ts` and `growthSystem.test.ts` as the guardrail.

---

### F-02: Specialist food and happiness costs are both represented — MATCH
**Location:** `packages/engine/src/state/YieldCalculator.ts`, `packages/engine/src/state/HappinessUtils.ts`
**GDD reference:** `systems/population-specialists.md` section Specialist assignment (Cities only)
**Severity:** HIGH
**Effort:** M
**VII says:** Each specialist costs -2 Food/turn and -2 Happiness/turn.
**Engine does:** `YieldCalculator.calculateCityYields` subtracts 2 food per specialist and adds +2 science/+2 culture. `HappinessUtils.calculateCityHappiness` subtracts 2 happiness per specialist.
**Gap:** None for city-level specialist maintenance. Per-tile placement fidelity is tracked in F-04/F-09.
**Recommendation:** Do not also subtract specialist food in `growthSystem`; the food yield already includes the maintenance deduction.

---

### F-03: Specialist adjacency amplification exists but depends on spatial specialist data — CLOSE
**Location:** `packages/engine/src/state/DistrictAdjacency.ts`, `packages/engine/src/state/CityYieldsWithAdjacency.ts`
**GDD reference:** `systems/population-specialists.md` section Specialist assignment bullet 4
**Severity:** HIGH
**Effort:** M
**VII says:** Specialists amplify adjacency bonuses on their urban tile. Coefficient: +0.5 adjacency per specialist.
**Engine does:** `DistrictAdjacency.computeAdjacencyBonus` multiplies adjacency on an urban tile by `1 + 0.5 * specialistCount`, capped at two specialists. `CityYieldsWithAdjacency` adds that layer over base yields.
**Gap:** Works when `urbanTiles` carry `specialistCount`. Some legacy/UI paths still assign specialists city-wide without a tile target, so those specialists cannot amplify a specific tile.
**Recommendation:** Finish tile-targeted specialist selection in the growth-choice UI and retire city-level-only specialist assignment paths where possible.

---

### F-04: Specialists have a per-urban-tile map, with legacy city-wide fallback still present — CLOSE
**Location:** `packages/engine/src/types/GameState.ts`, `packages/engine/src/systems/specialistSystem.ts`
**GDD reference:** `systems/population-specialists.md` section Entities -- SettlementState.specialists is map of urbanTileId to Specialist
**Severity:** HIGH
**Effort:** L
**VII says:** SettlementState specialists are keyed by urban tile; per-tile tracking is required for adjacency amplification and Quarters.
**Engine does:** `CityState.specialistsByTile` and `urbanTiles[].specialistCount` exist and `ASSIGN_SPECIALIST` / `UNASSIGN_SPECIALIST` update them when `tileId` is supplied. `city.specialists` remains a total-count fallback for old saves/tests and non-spatial callers.
**Gap:** The compatibility fallback is still reachable. `ASSIGN_SPECIALIST_FROM_GROWTH` and the current CityPanel specialist button do not select a tile, so growth-choice specialists remain city-level.
**Recommendation:** Add a tile picker for growth-specialist resolution, pass `tileId`, and keep `city.specialists` as derived total rather than the only actionable state.

---

### F-05: Town pop-7 cap and specialization unlock — MATCH
**Location:** `packages/engine/src/systems/growthSystem.ts`
**GDD reference:** `systems/population-specialists.md` section Town vs city rules
**Severity:** MED
**Effort:** S
**VII says:** Towns use the food-bucket formula until the local settlement target's pop-7 town specialization threshold.
**Engine does:** `growthSystem` caps towns at population 7 and uses `SPECIALIZATION_POP_MINIMUM = 7`, so Town specialization is reachable.
**Gap:** None against the current local settlements target.
**Recommendation:** Keep town cap and specialization threshold aligned with settlements audit tests.

---

### F-06: Settlement cap increases are age-automatic, not tech/civic-driven — DIVERGED
**Location:** `packages/engine/src/state/HappinessUtils.ts`
**GDD reference:** `systems/population-specialists.md` section Settlement cap sources
**Severity:** MED
**Effort:** M
**VII says:** Cap increases are granted by specific techs/civics.
**Engine does:** `calculateEffectiveSettlementCap` applies flat age bonuses regardless of researched techs/civics.
**Gap:** Strategic cap unlocks are collapsed into automatic age progression.
**Recommendation:** Add a tech/civic effect path for settlement-cap bonuses, store the player bonus, then remove the automatic age bonus.

---

### F-07: growthEventCount resets on age transition — MATCH
**Location:** `packages/engine/src/state/GrowthUtils.ts`, `packages/engine/src/systems/growthSystem.ts`, `packages/engine/src/systems/ageSystem.ts`
**GDD reference:** `systems/population-specialists.md` section Age transition effects bullet 4
**Severity:** MED
**Effort:** S
**VII says:** On TRANSITION_AGE, growthEventCount resets to 0 for all settlements. Early-age growth is cheap regardless of prior-age population.
**Engine does:** `CityState.growthEventCount` tracks per-age growth history, `growthSystem` increments it on food-driven growth, and `ageSystem` writes `growthEventCount: 0` plus `food: 0` for transitioning-player settlements.
**Gap:** None for age-reset behavior. Missing old-save counters are explicitly normalized during transition.
**Recommendation:** Keep `getCityGrowthThreshold(city, age)` as the preferred helper; use `getGrowthThreshold(population, age)` only for legacy fallback/tests.

---

### F-08: Population growth creates a resolvable improvement-or-specialist choice — MATCH
**Location:** `packages/engine/src/systems/growthSystem.ts`, `packages/engine/src/systems/turnSystem.ts`, `packages/web/src/ui/panels/CityPanel.tsx`
**GDD reference:** `systems/population-specialists.md` section Growth event resolution
**Severity:** HIGH
**Effort:** M
**VII says:** Each population-growth event requires the player to resolve with an improvement placement or specialist assignment before continuing.
**Engine does:** Food-driven growth emits `pendingGrowthChoices` when at least one legal resolver exists. `turnSystem` blocks human END_TURN while choices are pending. `RESOLVE_GROWTH_CHOICE`, `PLACE_IMPROVEMENT`, and `ASSIGN_SPECIALIST_FROM_GROWTH` clear one pending choice, and CityPanel exposes the resolution controls.
**Gap:** No functional gap for the decision loop. The specialist branch is still city-level unless F-04's tile-targeted path is used.
**Recommendation:** Keep the legal-resolver guard to avoid hard-locks, then improve specialist tile targeting under F-04/F-09.

---

### F-09: Specialist cap is per-tile when spatial data exists; cap-increase sources remain incomplete — CLOSE
**Location:** `packages/engine/src/systems/specialistSystem.ts`, `packages/engine/src/types/GameState.ts`
**GDD reference:** `systems/population-specialists.md` Specialist caps + Quarters interaction
**Severity:** MED
**Effort:** M
**VII says:** Specialist cap is per urban tile, starts at 1, and increases through specific civics/techs.
**Engine does:** `canAssignSpecialist` enforces `urbanTile.specialistCapPerTile ?? 1` when `tileId` is supplied. The total city headcount cap still prevents specialists from consuming the last working population.
**Gap:** Civic/tech cap-increase effects are not wired, and city-level fallback assignments bypass tile-cap checks.
**Recommendation:** Add specialist-cap effects to tech/civic completion and make growth-choice specialist assignment choose an urban tile.

---

## Active items

1. F-04/F-09: make growth-choice specialist assignment tile-targeted instead of city-level fallback.
2. F-03: verify all yield surfaces that need adjacency use `calculateCityYieldsWithAdjacency`.
3. F-06: replace automatic settlement-cap age bonuses with tech/civic-gated bonuses.

---

## Mapping recommendation for GDD system doc

Paste into `.codex/gdd/systems/population-specialists.md` § "Mapping to hex-empires":

**Engine files:**
- `packages/engine/src/state/GrowthUtils.ts`
- `packages/engine/src/systems/growthSystem.ts`
- `packages/engine/src/systems/ageSystem.ts`
- `packages/engine/src/systems/specialistSystem.ts`
- `packages/engine/src/state/YieldCalculator.ts`
- `packages/engine/src/state/CityYieldsWithAdjacency.ts`
- `packages/engine/src/state/DistrictAdjacency.ts`

**Status:** 5 MATCH / 3 CLOSE / 1 DIVERGED / 0 MISSING / 0 EXTRA

**Highest-severity active finding:** F-03/F-04 (specialist tile targeting and adjacency amplification are close but still have city-level fallback paths).

---

## Open questions

1. Which tech/civic records should grant `specialistCapPerTile++`?
2. Should the legacy city-level specialist action remain for AI/autoresolve, or be fully hidden behind tile selection?
3. For settlement-cap bonuses, should the stored player field be a direct numeric bonus or a list of source ids for auditability?

---

## Effort estimate

| Bucket | Findings | Total effort |
|---|---|---|
| S (half-day) | F-03 validation pass | 0.5d |
| M (1-3 days) | F-06, F-09 | ~4d |
| L (week+) | F-04 completion | 1w |
| **Active total** | 4 | **~1.5w** |

Recommended order: F-04/F-09 (tile-targeted specialist resolution), F-03 verification pass, F-06 tech/civic-gated settlement cap.

---

<!-- END OF AUDIT -->
