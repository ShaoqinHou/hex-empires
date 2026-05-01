# Yields & Adjacency — hex-empires Audit

**System slug:** `yields-adjacency`
**GDD doc:** [systems/yields-adjacency.md](../systems/yields-adjacency.md)
**Audit date:** `2026-04-19`
**Auditor:** `claude-sonnet-4.6`
**Version target:** Firaxis patch 1.3.0

---

## Engine files audited

- `packages/engine/src/state/CityYieldsWithAdjacency.ts`
- `packages/engine/src/state/DistrictAdjacency.ts`
- `packages/engine/src/state/YieldCalculator.ts`
- `packages/engine/src/state/EconomyAnalytics.ts`
- `packages/engine/src/types/Yields.ts` (supporting)

---

## Summary tally

| Status | Count |
|---|---|
| MATCH | 1 |
| CLOSE | 2 |
| DIVERGED | 2 |
| MISSING | 4 |
| EXTRA | 1 |

**Total findings:** 10

---

## Detailed findings

### F-01: `YieldSet` has `housing`/`diplomacy` fields; `happiness` absent — DIVERGED

**Location:** `packages/engine/src/types/Yields.ts:1`
**GDD reference:** `systems/yields-adjacency.md` § "Yield types" (VII's 8 yields)
**Severity:** HIGH
**Effort:** S
**VII says:** 8 yield types: Food, Production, Gold, Science, Culture, Happiness, Influence, Faith.
**Engine does:** `YieldSet` declares 9 fields: `food`, `production`, `gold`, `science`, `culture`, `faith`, `influence`, `housing`, `diplomacy`. `happiness` is absent. `housing` is a Civ VI concept; `diplomacy` duplicates `influence`.
**Gap:** Without `happiness` in `YieldSet`, the -2%/point local yield penalty, the -100% floor at -50, and celebration-trigger accumulator cannot be cleanly expressed. Two Civ-VI-ism fields (housing, diplomacy) pollute the shape.
**Recommendation:** Add `happiness: number`. Remove `housing` and `diplomacy` (or reclassify `diplomacy` as alias for `influence`). Audit all YieldSet consumers for the newly-required `happiness` field.

---

### F-02: Adjacency triggers cover only 2 of 6 GDD categories — CLOSE

**Location:** `packages/engine/src/state/DistrictAdjacency.ts:119-144`
**GDD reference:** `systems/yields-adjacency.md` § "Adjacency triggers"
**Severity:** HIGH
**Effort:** M
**VII says:** Adjacency trigger categories: Food/Gold from Coastal + River + Wonders; Production/Science from Resources + Wonders; Culture/Happiness from Mountains + Natural Wonders + Wonders (universal).
**Engine does:** Implements only Mountain (+1 Production) and River (+1 Food). Missing: Coastal adjacency for Food/Gold, Wonder adjacency (universal), Natural Wonder adjacency, Resource adjacency for Production/Science. The campus/theater/commercial building-to-building adjacency rules in the engine have no GDD backing (VII adjacency is map-based, not intra-city).
**Gap:** 4 of 6 trigger categories missing; 3+ invalid categories present (building-to-building adjacency).
**Recommendation:** Rewrite `DistrictAdjacency.computeAdjacencyBonus` against the GDD trigger table. Coastal trigger = count coastal neighbors × +1 F/+1 G per building type. Wonder trigger = universal +1 Yield for any wonder neighbor. Add Natural Wonder and Resource triggers. Remove the building-to-building adjacency code path.

---

### F-03: River bonus is double-counted across base and adjacency layers — DIVERGED

**Location:** `YieldCalculator.ts:40-42`, `DistrictAdjacency.ts:124-126`
**GDD reference:** `systems/yields-adjacency.md` § "Tile base yields" vs § "Adjacency triggers"
**Severity:** MED
**Effort:** S
**VII says:** River benefit placed exclusively in the adjacency layer (+1 Food/Gold for adjacent buildings).
**Engine does:** `YieldCalculator` applies +1 Gold per river tile in city territory (base layer). `DistrictAdjacency.computeAdjacencyBonus` also applies +1 Food per adjacent river tile (adjacency layer). When `CityYieldsWithAdjacency` stacks both, a river tile contributes both bonuses.
**Gap:** Double-count. `YieldCalculator` river bonus is a pre-adjacency holdover.
**Recommendation:** Remove lines 40-42 in `YieldCalculator.ts`. Keep adjacency-layer river bonus in `DistrictAdjacency`.

---

### F-04: Specialist model is city-level count, not per-tile spatial — MISSING

**Location:** `YieldCalculator.ts:53-60`
**GDD reference:** `systems/yields-adjacency.md` § "Specialists" (cross-cut with `tile-improvements.md` F-08)
**Severity:** HIGH
**Effort:** M
**VII says:** Specialist assigned to a specific Quarter tile; provides base Science/Culture AND amplifies that tile's adjacency by +50%. Costs Food + Happiness per specialist.
**Engine does:** `city.specialists` is a flat integer. Yield = `specialists * 2` Science/Culture empire-averaged. Upkeep is Food only (not Happiness). No tile coordinate, no per-tile amplification.
**Gap:** Specialist spatial model missing; amplification can't target the right tile; upkeep wrong.
**Recommendation:** Blocked on tile-improvements F-08 (Cycle F district overhaul). After that lands, wire `specialistAssigned: boolean` per UrbanTileV2; trigger `+0.5 * adjacencyBonus` on that tile; charge Happiness alongside Food.

---

### F-05: Quarter amplification fires unconditionally (no specialist guard) — MISSING

**Location:** `DistrictAdjacency.ts:177-197`
**GDD reference:** `systems/yields-adjacency.md` § "Specialists" (amplification requires assignment)
**Severity:** HIGH
**Effort:** S
**VII says:** Quarter's +50% adjacency activates only when a Specialist is assigned to that tile.
**Engine does:** `quarterBonus` iterates `city.quarters` and multiplies every tile's adjacency by 0.5 with no `specialistAssigned` check. Every quarter earns +50% adjacency whether or not it has a specialist.
**Gap:** Specialist-assignment decision is removed from the adjacency math. Players get the amplification "for free" just by forming a Quarter.
**Recommendation:** Add `if (!tile.specialistAssigned) continue;` in the quarter loop. Also blocked partly on F-04's spatial specialist model.

---

### F-06: Civic/tech/Happiness yield modifiers pipeline incomplete — MISSING

**Location:** `YieldCalculator.ts:62-72`
**GDD reference:** `systems/yields-adjacency.md` § "Yield modifiers" (civic policies, tech, happiness)
**Severity:** HIGH
**Effort:** L
**VII says:** Yield modifiers stack: base tile yields × (1 + civ + leader + civic + tech + happiness).
**Engine does:** Correctly passes civ/leader `MODIFY_YIELD` effects via `getYieldBonus` for Food, Production, Gold, Science, Culture, Faith. Missing: (1) no civic-policy yield layer; (2) no tech-effect yield layer; (3) no Happiness penalty multiplier (`localHappiness × -0.02`); (4) `influence` omitted from the `getYieldBonus` call.
**Gap:** 3 modifier layers missing; 1 yield type (`influence`) excluded from the bonus pipeline.
**Recommendation:** Thread `player.slottedPolicies` effects through `getYieldBonus`. Thread `player.researchedTechs` effects similarly. Apply `applyHappinessPenalty` at the final multiplier step. Add `influence` to the yield loop.

---

### F-07: Ageless flag not filtered in adjacency — MISSING

**Location:** `DistrictAdjacency.ts` (entire module), `YieldCalculator.ts`
**GDD reference:** `systems/yields-adjacency.md` § "Age transition" (cross-cut `tile-improvements.md` F-06, `ages.md` F-09)
**Severity:** MED
**Effort:** S
**VII says:** On age transition, non-ageless buildings lose adjacency and no longer count toward Quarters. Ageless persists.
**Engine does:** `computeAdjacencyBonus` and `quarterBonus` have no `ageless` / `obsolete` filter. A Library from Antiquity still contributes Science adjacency in the Modern age.
**Gap:** Adjacency survives indefinitely regardless of age.
**Recommendation:** Blocked on tile-improvements F-06 (add `ageless` field). Once landed, skip non-ageless buildings in the adjacency loop post-transition.

---

### F-08: Town Production-to-Gold conversion absent in YieldCalculator — CLOSE

**Location:** `YieldCalculator.ts:48-51`
**GDD reference:** `systems/yields-adjacency.md` § "Town yields" (cross-cut `settlements.md` F-06 MATCH)
**Severity:** MED
**Effort:** S
**VII says:** Towns convert 100% of Production to Gold at 1:1 per turn.
**Engine does:** `getSpecializationYields` correctly models all 9 town specialization bonuses; `productionSystem` correctly converts town production to gold ledger-side. But `calculateCityYields` returns Production as Production for all settlements — the conversion happens downstream, not in the yield layer itself.
**Gap:** Cosmetic — yield output is technically Production-labeled for towns, but downstream consumers handle the conversion. The aggregation layer is inconsistent.
**Recommendation:** In `calculateCityYields`, check `city.settlementType === 'town'` and pre-convert Production to Gold. Avoids downstream conversion and makes yield reporting consistent with town display.

---

### F-09: Growth formula scoped to growthSystem, not YieldCalculator — MATCH

**Location:** `YieldCalculator.ts` (absence of growth logic), `growing_town` specialization returns `{}`
**GDD reference:** `systems/yields-adjacency.md` § "Scope boundary"
**Severity:** LOW
**Effort:** —
**VII says:** Growth formula belongs in `growthSystem`, not `YieldCalculator`.
**Engine does:** Correctly returns `{}` for `growing_town` specialization (growth threshold reduction handled in `growthSystem.ts`).
**Gap:** None.
**Recommendation:** No action.

---

### F-10: EconomyAnalytics omits Science/Culture leaderboards — EXTRA

**Location:** `EconomyAnalytics.ts:12`
**GDD reference:** `systems/yields-adjacency.md` (no GDD prescription for analytics API; cross-cut `victory-paths.md`)
**Severity:** LOW
**Effort:** S
**VII says:** Analytics API is not prescribed by this GDD; but Science/Culture are primary victory-path metrics (per `victory-paths.md`).
**Engine does:** `RankingMetric` = `'gold' | 'score' | 'cities' | 'units' | 'population'`. Science and Culture accumulation not ranked despite being victory-path metrics. `score` reads from an optional undocumented player field.
**Gap:** Practical gap for Science/Cultural victory tracking; `score` field is undocumented.
**Recommendation:** Add `'science' | 'culture'` to `RankingMetric`. Document the `score` source. Not a GDD violation but a useful enhancement.

---

## Extras to retire

- `YieldSet.housing` field — Civ VI concept, no GDD use. Delete after downstream consumer migration.
- `YieldSet.diplomacy` field — duplicates `influence`. Delete after migration.
- Campus/theater/commercial building-to-building adjacency in `DistrictAdjacency.ts` — no GDD backing; VII adjacency is map-based, not intra-city.

---

## Missing items

1. `YieldSet.happiness` field (F-01) — prerequisite for Celebration/penalty math.
2. Coastal adjacency trigger (F-02).
3. Wonder adjacency trigger (universal; F-02).
4. Natural Wonder adjacency trigger (F-02).
5. Resource adjacency trigger (F-02).
6. `specialistAssigned` guard on Quarter bonus (F-05).
7. Civic policy yield modifier layer (F-06).
8. Tech-effect yield modifier layer (F-06).
9. Happiness penalty multiplier (F-06).
10. Ageless filter in adjacency (F-07) — blocked on tile-improvements F-06.
11. Per-tile specialist spatial model (F-04) — blocked on tile-improvements F-08.

---

## Cross-reference with other audits

| Other audit finding | Impact here |
|---|---|
| `tile-improvements.md` F-04: Civ-VI district model coexists with VII spatial | `DistrictAdjacency.ts` is built for VII but `CityYieldsWithAdjacency.ts` not yet wired; depends on Cycle F |
| `tile-improvements.md` F-06: Ageless flag absent | Directly causes F-07 here — no obsolescence filter |
| `tile-improvements.md` F-08: Specialist is city-level | Directly causes F-04 + F-05 here — no per-tile amplification |
| `ages.md` F-09: BuildingDef has no isAgeless | Shared with tile-improvements F-06 |

---

## Mapping recommendation for GDD system doc

Paste into `.codex/gdd/systems/yields-adjacency.md` § "Mapping to hex-empires":

**Engine files:**
- `packages/engine/src/state/YieldCalculator.ts` — base yields per city
- `packages/engine/src/state/DistrictAdjacency.ts` — adjacency bonus computation
- `packages/engine/src/state/CityYieldsWithAdjacency.ts` — combined yield + adjacency aggregation
- `packages/engine/src/types/Yields.ts` — YieldSet shape (has housing/diplomacy extras; missing happiness)

**Status:** 1 MATCH / 2 CLOSE / 2 DIVERGED / 4 MISSING / 1 EXTRA (see `.codex/gdd/audits/yields-adjacency.md`)

**Highest-severity finding:** F-01 — `happiness` absent from `YieldSet`; entire Happiness mechanic (local yield penalty, celebration trigger) is unmodelable.

---

## Open questions

1. Should `housing` and `diplomacy` be truly deleted, or renamed? (No GDD use, but deletion may break tests.)
2. What is the Happiness penalty cap — is it clipped at 100% reduction (matches `HappinessUtils.applyHappinessPenalty`) or deeper?
3. Cycle F district overhaul timing: F-04/F-05 need the spatial specialist model; when is Cycle F expected to land?
4. Does `Tile.isUrban` exist yet (tile-improvements F-13)? `DistrictAdjacency.quarterBonus` needs it.
5. For F-06 civic/tech pipeline: is there a preferred effect-composition order (civ → leader → civic → tech), or should it be order-independent via effect stacking?

---

## Effort estimate

| Bucket | Findings | Total effort |
|---|---|---|
| S (half-day) | F-01, F-03, F-05, F-07, F-08, F-10 | 3d |
| M (1-3 days) | F-02, F-04 | 4-6d |
| L (week+) | F-06 | 1w+ |
| **Total** | 10 | **~2.5w** |

Recommended order (highest severity × lowest effort first): F-01 (add happiness field) → F-05 (specialist guard, quick win) → F-03 (remove river double-count) → F-08 (town prod→gold aggregation) → F-02 (rewrite adjacency triggers) → F-07 (needs tile-improvements F-06) → F-04 (needs Cycle F) → F-06 (full modifier pipeline).

---

<!-- END OF AUDIT -->
