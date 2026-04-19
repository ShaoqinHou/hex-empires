# Population & Specialists — hex-empires Audit

**System slug:** `population-specialists`
**GDD doc:** [systems/population-specialists.md](../systems/population-specialists.md)
**Audit date:** `2026-04-19`
**Auditor:** `claude-sonnet-4.6`
**Version target:** Firaxis patch 1.3.0 (per commitment.md)

---

## Engine files audited

- `packages/engine/src/systems/growthSystem.ts` (184 lines)
- `packages/engine/src/systems/specialistSystem.ts` (68 lines)
- `packages/engine/src/state/GrowthUtils.ts` (30 lines)
- `packages/engine/src/state/HappinessUtils.ts` (121 lines)

---

## Summary tally

| Status | Count |
|---|---|
| MATCH | 0 |
| CLOSE | 2 |
| DIVERGED | 2 |
| MISSING | 5 |
| EXTRA | 0 |

**Total findings:** 9

---

## Detailed findings

### F-01: Growth formula constants diverge from GDD (quadratic constants mismatch) — CLOSE
**Location:** `packages/engine/src/state/GrowthUtils.ts:17-29`
**GDD reference:** `systems/population-specialists.md` section Growth food threshold (post-patch 1.1.2)
**Severity:** HIGH
**Effort:** S
**VII says:** Flat + (Scalar * X) + (Exponent * X^2). Antiquity: Flat=5, Scalar=20, Exponent=4. Sample Antiquity X=0: 5 food; X=1: 29; X=5: 205.
**Engine does:** Antiquity: 30 + 3*x + 33*x*x. X=0: 30; X=1: 66; X=5: 870. Antiquity X=0 threshold is 30 in engine vs 5 in GDD -- first growth costs 6x more.
**Gap:** Code comment acknowledges quadratic formula but uses wrong constants. Exponent terms also diverge (33 vs 4 for Antiquity). Much steeper early curve.
**Recommendation:** Replace constants: Antiquity: 5+20*x+4*x*x; Exploration: 30+50*x+5*x*x; Modern: 60+60*x+6*x*x.

---

### F-02: Specialist food cost absent; only happiness cost tracked — MISSING
**Location:** `packages/engine/src/systems/specialistSystem.ts:1-68`, `packages/engine/src/state/HappinessUtils.ts:89-92`
**GDD reference:** `systems/population-specialists.md` section Specialist assignment (Cities only)
**Severity:** HIGH
**Effort:** M
**VII says:** Each specialist costs -2 Food/turn AND -2 Happiness/turn.
**Engine does:** HappinessUtils applies -2 happiness per specialist (line 90: specialistPenalty = city.specialists * 2) -- correct. But no food deduction for specialists. growthSystem computes foodConsumed = city.population * 2 with no specialist food cost.
**Gap:** Specialist food drain entirely missing. Food cost is the second direct constraint limiting heavy specialist stacking in food-poor cities. Without it, the engagement cost of specialists is halved.
**Recommendation:** In growthSystem food loop, add specialistFoodCost = city.specialists * 2 to foodConsumed.

---

### F-03: Specialist adjacency amplification entirely absent — MISSING
**Location:** `packages/engine/src/systems/specialistSystem.ts:1-68` (full file)
**GDD reference:** `systems/population-specialists.md` section Specialist assignment (Cities only) bullet 4
**Severity:** HIGH
**Effort:** M
**VII says:** Specialists amplify adjacency bonuses on their urban tile. Coefficient: +0.5 adjacency per specialist (Game8). Distinct from base +2 Sci / +2 Cul.
**Engine does:** specialistSystem.ts records specialists as a city-level integer. No adjacency lookup in assign/unassign handlers. YieldCalculator does not multiply adjacency yields by specialist count on urban tiles.
**Gap:** Adjacency amplification wholly absent. The VII mechanic where stacking specialists on a high-adjacency Quarter dramatically scales yields is not modeled.
**Recommendation:** In YieldCalculator.calculateCityYields, for each urban tile with buildings and specialist count > 0, add adjacencyBonus * 0.5 * specialists to science+culture output. Requires F-04 per-tile model first.

---

### F-04: Specialists tracked city-wide integer, not per-urban-tile map — DIVERGED
**Location:** `packages/engine/src/systems/specialistSystem.ts:24-44`, `packages/engine/src/state/HappinessUtils.ts:90`
**GDD reference:** `systems/population-specialists.md` section Entities -- SettlementState.specialists is map of urbanTileId to Specialist
**Severity:** HIGH
**Effort:** L
**VII says:** SettlementState.specialists is map<urbanTileId, Specialist>. specialistCapPerTile starts at 1. Quarters (two buildings on one tile) both benefit from a single specialist on that tile. Per-tile tracking essential for adjacency amplification and Quarters interaction.
**Engine does:** CityState.specialists is a plain integer. Constraint is specialists less-than population-minus-1 (city-wide headcount cap). ASSIGN_SPECIALIST action carries no tileId.
**Gap:** Entire per-tile model absent. specialistCapPerTile cannot be implemented. Adjacency amplification cannot be per-tile. Quarters cannot give doubled bonus. Integer is a stub satisfying happiness cost only.
**Recommendation:** Change CityState.specialists from number to ReadonlyMap<string, number> (tileId to count). Update ASSIGN_SPECIALIST / UNASSIGN_SPECIALIST actions to carry action.tileId. Add specialistCapPerTile: number to CityState. Largest change in this audit.

---

### F-05: Town soft-cap is 5, GDD specifies no hard town pop cap — CLOSE
**Location:** `packages/engine/src/systems/growthSystem.ts:87-89`
**GDD reference:** `systems/population-specialists.md` section Town vs city rules
**Severity:** MED
**Effort:** S
**VII says:** Towns use the same food-bucket formula as Cities. No hard population cap documented. Town Focus unlocks at pop 7.
**Engine does:** const townCap = (settlementType === town) ? 5 : Infinity. Towns stop growing at population 5.
**Gap:** Hard cap of 5 not in GDD. Prevents towns from reaching pop 7, making Town Focus unreachable. Contradicts food-forwarding mechanic.
**Recommendation:** Remove the townCap line. The Town Focus check at SPECIALIZATION_POP_MINIMUM = 7 already gates focus assignment correctly.

---

### F-06: Settlement cap increases are age-automatic, not tech/civic-driven — DIVERGED
**Location:** `packages/engine/src/state/HappinessUtils.ts:23-30`
**GDD reference:** `systems/population-specialists.md` section Settlement cap sources
**Severity:** MED
**Effort:** M
**VII says:** Cap increases granted by specific techs/civics: Antiquity (Irrigation, Entertainment, Organized Military); Exploration (Feudalism, Social Class, Sovereignty, Imperialism, Mastery Colonialism); Modern (Urbanization, Mass Production, Nationalism, Globalism, Hegemony).
**Engine does:** calculateEffectiveSettlementCap adds +1 for exploration and +2 for modern age automatically, regardless of tech/civic research.
**Gap:** Tech/civic-gated cap increases replaced by flat age bonuses. A player who skipped Irrigation should not gain the Irrigation cap bonus. The engine removes this strategic choice.
**Recommendation:** Add settlementCapBonus field to PlayerState. When tech/civic with INCREASE_SETTLEMENT_CAP effect is applied via effectSystem, increment this field. Remove age-conditional block from calculateEffectiveSettlementCap.

---

### F-07: growthEventCount not reset on age transition -- MISSING
**Location:** `packages/engine/src/systems/growthSystem.ts` (no TRANSITION_AGE handler present)
**GDD reference:** `systems/population-specialists.md` section Age transition effects bullet 4
**Severity:** MED
**Effort:** S
**VII says:** On TRANSITION_AGE, growthEventCount resets to 0 for all settlements. Early-age growth is cheap: formula starts at X=0 regardless of previous-age city size.
**Engine does:** growthSystem handles only SET_SPECIALIZATION and END_TURN. No TRANSITION_AGE case. getGrowthThreshold uses population minus 1 as X, carrying full growth history into new ages.
**Gap:** Growth counter reset absent. Post-transition growth far more expensive than VII intends.
**Recommendation:** Add TRANSITION_AGE case to growthSystem. Add growthEvents: number to CityState (decouple from population minus 1). Age transition sets it to 0.

---

### F-08: No population-growth → improvement-or-specialist choice prompt — MISSING

**Location:** `packages/engine/src/systems/growthSystem.ts:90-98`
**GDD reference:** `systems/population-specialists.md` § "Growth event resolution"
**Severity:** HIGH
**Effort:** M
**VII says:** Each population-growth event requires the player to resolve with: (a) place an improvement (rural), or (b) assign a Specialist on an urban tile. Growth is gated on this decision.
**Engine does:** `growthSystem` simply increments `city.population` and silently advances. No `pendingGrowthChoice`, no action-required state, no UI surface.
**Gap:** The VII growth→decision loop is absent. Cross-cuts `tile-improvements.md` F-03 and F-08.
**Recommendation:** Add `pendingGrowthChoices: ReadonlyArray<{ cityId: string }>` to `PlayerState`. Set on growth. Require resolution via `PLACE_IMPROVEMENT` or `ASSIGN_SPECIALIST` before next END_TURN is allowed. Cross-system coordination with tile-improvements flagship refactor.

---

### F-09: Specialist cap ignores Quarters / per-tile rules — MISSING

**Location:** `packages/engine/src/systems/specialistSystem.ts:24-44`
**GDD reference:** `systems/population-specialists.md` § "Specialist caps" + Quarters interaction
**Severity:** MED
**Effort:** M
**VII says:** Specialist cap is per-urban-tile (starts at 1, increases with specific civics/techs). A Quarter (2 civ-unique buildings on one tile) still accepts only `specialistCapPerTile` specialists — the cap is per tile, not per building.
**Engine does:** Cap is `city.population - 1` (city-wide headcount). No per-tile cap. No integration with Quarter detection (which is itself missing per tile-improvements F-07).
**Gap:** Without per-tile tracking (F-04), per-tile caps are unimplementable.
**Recommendation:** Depends on F-04 (per-tile specialist model). Add `specialistCapPerTile: number` to `CityState` (default 1). Update civic/tech effects to increment it.

---

## Extras to retire

None. The current specialist system is correct-shape but too simplistic — extend, don't retire.

---

## Missing items

1. Corrected growth thresholds (F-01) — one-line fix, enables proper growth curve.
2. Specialist food cost (F-02) — simple addition to growth food loop.
3. Specialist adjacency amplification (F-03) — requires F-04 first.
4. Per-urban-tile specialist map (F-04) — largest refactor, blocks F-03 + F-09.
5. Tech/civic-gated settlement cap bonuses (F-06).
6. `growthEvents` reset on age transition (F-07).
7. Population-growth → improvement-or-specialist choice prompt (F-08) — flagship VII cadence.
8. Per-tile specialist cap + civic/tech increments (F-09).

---

## Mapping recommendation for GDD system doc

Paste into `.claude/gdd/systems/population-specialists.md` § "Mapping to hex-empires":

**Engine files:**
- `packages/engine/src/systems/growthSystem.ts`
- `packages/engine/src/systems/specialistSystem.ts`
- `packages/engine/src/state/GrowthUtils.ts`
- `packages/engine/src/state/HappinessUtils.ts`

**Status:** 0 MATCH / 2 CLOSE / 2 DIVERGED / 5 MISSING / 0 EXTRA

**Highest-severity finding:** F-01 (wrong growth constants), F-02 (specialist food cost absent), F-04 (per-tile specialist map absent — blocks adjacency amplification), F-08 (growth→choice prompt absent).

---

## Open questions

1. Are the post-patch-1.1.2 growth constants (5/20/4, 30/50/5, 60/60/6) accurate? GDD notes them but wiki coverage is sparse.
2. Per-tile cap increase sources: which civics/techs specifically trigger `specialistCapPerTile++`?
3. For F-04 schema: `ReadonlyMap<string, number>` keyed by tile coord (stringified q,r) or urban-tile-id (if that exists post-Cycle F)?
4. Food forwarding from specialized towns (cross-cut `settlements.md` F-11) — where does the forwarded food enter the growth bucket?

---

## Effort estimate

| Bucket | Findings | Total effort |
|---|---|---|
| S (half-day) | F-01, F-02, F-05, F-07 | 2d |
| M (1-3 days) | F-03, F-06, F-08, F-09 | ~8d |
| L (week+) | F-04 | 1w+ |
| **Total** | 9 | **~2.5w** |

Recommended order: F-01 (fix growth constants), F-02 (specialist food cost), F-05 (remove town pop cap), F-07 (age-transition reset), F-04 (per-tile specialist model — unblocks F-03 + F-09), F-03 (adjacency amplification), F-08 (growth→choice prompt), F-09 (per-tile cap), F-06 (tech/civic-gated settlement cap).

---

<!-- END OF AUDIT -->
