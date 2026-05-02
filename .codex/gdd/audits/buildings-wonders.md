# Buildings & Wonders — hex-empires Audit

**System slug:** `buildings-wonders`
**GDD doc:** [systems/buildings-wonders.md](../systems/buildings-wonders.md)
**Audit date:** `2026-05-02`
**Auditor:** `codex`
**Version target:** Firaxis patch 1.3.0

---

## Engine files audited

- `packages/engine/src/systems/buildingPlacementSystem.ts`
- `packages/engine/src/systems/urbanBuildingSystem.ts`
- `packages/engine/src/systems/wonderPlacementSystem.ts`
- `packages/engine/src/systems/ageSystem.ts`
- `packages/engine/src/systems/growthSystem.ts`
- `packages/engine/src/systems/productionSystem.ts`
- `packages/engine/src/state/DistrictAdjacency.ts`
- `packages/engine/src/state/CityYieldsWithAdjacency.ts`
- `packages/engine/src/state/BuildingPlacementValidator.ts`
- `packages/engine/src/state/WonderPlacement.ts`
- `packages/engine/src/GameEngine.ts`
- `packages/engine/src/types/Building.ts`
- `packages/engine/src/types/DistrictOverhaul.ts`

---

## Summary tally

| Status | Count |
|---|---|
| MATCH | 8 |
| CLOSE | 2 |
| DIVERGED | 0 |
| MISSING | 2 |
| EXTRA | 0 |

**Total findings:** 12

---

## Detailed findings

### F-01: `isAgeless`, `isCivUnique`, `civId` fields present on `BuildingDef` — MATCH

**Location:** `packages/engine/src/types/Building.ts`
**GDD reference:** `systems/buildings-wonders.md` § "Ageless buildings" + "Civ-unique buildings"
**Severity:** HIGH
**Effort:** S
**VII says:** Three ageless building classes (Warehouse, Unique, Wonder) carry full yields across age transitions. Civ-unique buildings are constructable only by one civ.
**Engine does:** `BuildingDef` now includes `isAgeless`, `isCivUnique`, `civId`, and `requiredCivic`. Data marks ageless infrastructure/wonders and civ-unique buildings with owning civilization ids.
**Gap:** None for the type/model fields. Age-transition obsolescence and quarter semantics remain tracked separately in F-02/F-04.
**Recommendation:** Keep these fields as the single source for age persistence, civ-unique gating, and quarter detection.

---

### F-02: `ageSystem` removes older non-ageless city and V2 urban-tile buildings — MATCH

**Location:** `packages/engine/src/systems/ageSystem.ts:307-341`; `packages/engine/src/systems/__tests__/ageSystem.test.ts:1449-1523`
**GDD reference:** `systems/buildings-wonders.md` § "Age transition" (cross-cut `ages.md` F-09)
**Severity:** HIGH
**Effort:** M
**VII says:** Non-ageless buildings lose all effect yields and adjacency on age transition.
**Engine does:** `ageSystem` filters older non-ageless building ids out of each transitioning player's `CityState.buildings` and `CityState.urbanTiles`, keeps ageless buildings/wonders and same-or-newer-age buildings, preserves tile specialist state, updates the wall flag from remaining buildings, and recomputes or clears V2 quarter metadata through the shared `computeQuarter` helper.
**Gap:** None for the local age-transition obsolescence model.
**Recommendation:** Keep V2 urban-tile and flat city-building obsolescence in the same age-transition pass so adjacency cannot retain obsolete buildings.

---

### F-03: Wonder geography validation is enforced through the placement validator, but the system wrapper remains pass-through — CLOSE

**Location:** `packages/engine/src/systems/wonderPlacementSystem.ts`; `packages/engine/src/state/BuildingPlacementValidator.ts:86-94`; `packages/engine/src/systems/urbanBuildingSystem.ts:167-171`
**GDD reference:** `systems/buildings-wonders.md` § "Wonder placement rules"
**Severity:** HIGH
**Effort:** M
**VII says:** Wonder placement validates geographic constraints (adjacent river, coast, mountain, etc.) and enforces one-per-world uniqueness.
**Engine does:** `BuildingPlacementValidator` calls `isWonderPlacementValid` for `isWonder` buildings, and `urbanBuildingSystem` rejects invalid wonder placements through that validator. `wonderPlacementSystem` is present in `DEFAULT_SYSTEMS`, but its pipeline function is still pass-through because validation happens in the helper path.
**Gap:** The wrapper/comment still present a stale "not wired" story, and one-per-world uniqueness is handled later by production/final locks rather than by the placement preflight itself.
**Recommendation:** Either retire the pass-through system wrapper and keep the validator API as the source of truth, or make the wrapper own placement-specific logging/uniqueness checks so its pipeline slot has clear value.

---

### F-04: Quarter formation supports unique quarters, ageless pairs, and pure-age pairs — MATCH

**Location:** `packages/engine/src/systems/urbanBuildingSystem.ts:61-127`; `packages/engine/src/types/DistrictOverhaul.ts:87-110`; `packages/engine/src/systems/__tests__/urbanBuildingSystem.test.ts:406-708`
**GDD reference:** `systems/buildings-wonders.md` § "Quarter formation" (cross-cut `tile-improvements.md` F-07)
**Severity:** HIGH
**Effort:** M
**VII says:** Two quarter paths: (1) Unique quarter — two civ-unique buildings co-located; (2) Generic quarter — two same-age or two ageless buildings co-located.
**Engine does:** `QuarterKindV2` includes `pure_age`, `unique_quarter`, and `ageless_pair`. `computeQuarter` checks the named quarter catalog first with civ-lock, then ageless pairs, then same-age non-ageless pairs, with tests for each path and the non-matching fallback.
**Gap:** None for quarter kind detection.
**Recommendation:** Keep unique-quarter detection before pure-age fallback so civ-unique pairs do not collapse to generic quarters.

---

### F-05: Specialist adjacency amplification implemented with capped specialist counts — MATCH

**Location:** `packages/engine/src/state/DistrictAdjacency.ts:213-231`; `packages/engine/src/state/__tests__/DistrictAdjacency-specialist-amplification.test.ts`
**GDD reference:** `systems/buildings-wonders.md` § "Specialist amplification" (cross-cut `yields-adjacency.md` F-04/F-05, `population-specialists.md` F-03)
**Severity:** HIGH
**Effort:** M
**VII says:** `effectiveAdjacency = baseAdjacency × (1 + SPECIALIST_AMPLIFIER × specialistCount)`.
**Engine does:** `DistrictAdjacency.computeAdjacencyBonus` reads `UrbanTileV2.specialistCount`, caps it at `SPECIALIST_AMPLIFIER_MAX_COUNT`, and multiplies adjacency yields by `1 + SPECIALIST_AMPLIFIER * cappedCount`. Tests cover zero, one, two, capped three-plus, and multi-yield amplification.
**Gap:** None for the local amplification formula.
**Recommendation:** Keep `specialistCount` as the numeric source of truth; avoid reintroducing boolean specialist flags in V2 urban-tile code.

---

### F-06: Wonder adjacency bonus to neighbors implemented — MATCH

**Location:** `packages/engine/src/state/DistrictAdjacency.ts:189-208`; `packages/engine/src/state/__tests__/DistrictAdjacency-wonder.test.ts`
**GDD reference:** `systems/buildings-wonders.md` § "Wonder adjacency"
**Severity:** MED
**Effort:** S
**VII says:** "Each Wonder occupies a full tile and provides adjacency bonuses to every surrounding Building."
**Engine does:** `computeAdjacencyBonus` detects neighboring buildings with `isWonder === true`, applies a per-wonder `adjacencyEffect` when present, and falls back to `WONDER_ADJACENCY_PER_NEIGHBOR` otherwise. Tests cover Pyramids, Hanging Gardens, Great Library, and generic fallback behavior.
**Gap:** None for local neighbor adjacency application.
**Recommendation:** Keep per-wonder `adjacencyEffect` data authoritative when present; use the generic fallback only for wonders without a specific rule.

---

### F-07: `requiredCivic` present; tech/civic/civ gates enforced at queue and purchase — MATCH

**Location:** `packages/engine/src/types/Building.ts`, `packages/engine/src/systems/productionSystem.ts` `handleSetProduction`
**GDD reference:** `systems/buildings-wonders.md` § "Building prerequisites"
**Severity:** MED
**Effort:** S
**VII says:** Buildings can be gated on tech OR civic. Queue admission checks prereqs at queue-time.
**Engine does:** `BuildingDef` has both `requiredTech` and `requiredCivic`. `productionSystem` now rejects queue and purchase attempts for unmet tech/civic prerequisites and mismatched civ-unique buildings.
**Gap:** None for queue/purchase admission. Wonder race cancellation and placement-system consolidation remain separate findings.
**Recommendation:** Keep future production entry points routed through the same admission gate so purchase, queue, and any UI preview stay aligned.

---

### F-08: Rival-wonder race notification + mid-queue cancellation absent — MISSING

**Location:** `packages/engine/src/systems/productionSystem.ts`
**GDD reference:** `systems/buildings-wonders.md` § "Wonder competition"
**Severity:** MED
**Effort:** M
**VII says:** (1) Notification when a rival starts building a wonder you're also building. (2) Mid-queue cancellation when a rival completes a wonder, with notification.
**Engine does:** Engine enforces final lock but generates no notifications. After a rival completes, the item stays in queue and fails silently at end-of-turn, losing all accumulated production.
**Gap:** Race UX entirely missing.
**Recommendation:** After any wonder completes, iterate all other cities' `productionQueue`; remove the wonder + emit warning log entry.

---

### F-09: `urbanBuildingSystem` wired into GameEngine — MATCH

**Location:** `packages/engine/src/GameEngine.ts:16-105`; `packages/engine/src/__tests__/system-wiring.test.ts:248-354`
**GDD reference:** `systems/buildings-wonders.md` § "V2 spatial model"
**Severity:** HIGH
**Effort:** L
**VII says:** V2 spatial model (2-slot urban tiles, quarters, specialist amp) is core VII-parity.
**Engine does:** `GameEngine.DEFAULT_SYSTEMS` imports and includes `adaptUrbanBuilding`, and system-wiring tests assert `PLACE_URBAN_BUILDING` mutates `city.urbanTiles` through the pipeline. The legacy `buildingPlacementSystem` is no longer in the default pipeline.
**Gap:** None for default pipeline wiring.
**Recommendation:** Keep pipeline wiring tests around so future system-order changes cannot silently drop the V2 placement path.

---

### F-10: growth/production consume the adjacency-aware yield calculator — MATCH

**Location:** `packages/engine/src/systems/growthSystem.ts:13,134`; `packages/engine/src/systems/productionSystem.ts:6,86,411`
**GDD reference:** `systems/buildings-wonders.md` § "Yield pipeline"
**Severity:** MED
**Effort:** S
**VII says:** Growth, production, etc. flow from full yield calculation including adjacency + quarter bonuses.
**Engine does:** `growthSystem` and `productionSystem` import `calculateCityYieldsWithAdjacency`; growth uses it for food surplus and production uses it for cancel thresholds and per-turn production progress.
**Gap:** None for these two yield consumers.
**Recommendation:** Route new city-yield consumers through the adjacency-aware helper unless a subsystem explicitly needs raw base yields.

---

### F-11: `DEMOLISH_BUILDING` type-only; no system handles it — MISSING

**Location:** `packages/engine/src/types/DistrictOverhaul.ts:150-160`
**GDD reference:** `systems/buildings-wonders.md` § "Overbuild mechanic"
**Severity:** MED
**Effort:** M
**VII says:** Primary recovery mechanism after age transition — demolish non-ageless to free a slot.
**Engine does:** `DemolishBuildingActionV2` declared in types. No handler. Not in main `GameAction` union.
**Gap:** Overbuilding mechanic absent.
**Recommendation:** Add `DEMOLISH_BUILDING` to `GameAction`. Add handler. No production refund per GDD §8.

---

### F-12: Legacy one-slot placement system is retired from the pipeline but still present for compatibility — CLOSE

**Location:** `buildingPlacementSystem.ts`, `urbanBuildingSystem.ts`
**GDD reference:** `systems/buildings-wonders.md` § "Urban tile slot rules"
**Severity:** MED
**Effort:** L
**VII says:** Urban tile has exactly 2 building slots.
**Engine does:** `urbanBuildingSystem` is the default-pipeline placement path and allows two buildings per urban tile. `buildingPlacementSystem` is marked deprecated and removed from `DEFAULT_SYSTEMS`, but the legacy file and `PLACE_BUILDING` action shape remain for compatibility/tests.
**Gap:** The compatibility surface can still confuse future work because `HexTile.building` and `PLACE_BUILDING` remain visible even though new placement should use `CityState.urbanTiles` and `PLACE_URBAN_BUILDING`.
**Recommendation:** Keep the deprecation comments, prevent new callers, and eventually delete the legacy action/module once dependent tests and UI affordances are migrated.

---

## Close follow-ups

- F-03: decide whether `wonderPlacementSystem` should own behavior or be retired in favor of the validator helper.
- F-12: finish retiring legacy `PLACE_BUILDING`/`buildingPlacementSystem` compatibility surface.

---

## Missing items

1. Rival-wonder race UX (F-08).
2. `DEMOLISH_BUILDING` handler (F-11).

---

## Mapping recommendation for GDD system doc

Paste into `.codex/gdd/systems/buildings-wonders.md` § "Mapping to hex-empires":

**Engine files:**
- `packages/engine/src/systems/buildingPlacementSystem.ts` (legacy)
- `packages/engine/src/systems/urbanBuildingSystem.ts` (V2, wired)
- `packages/engine/src/systems/wonderPlacementSystem.ts` (pass-through wrapper; validator helper is consumed by V2 placement)
- `packages/engine/src/state/DistrictAdjacency.ts`
- `packages/engine/src/state/CityYieldsWithAdjacency.ts`
- `packages/engine/src/types/Building.ts`
- `packages/engine/src/types/DistrictOverhaul.ts` (V2 types)

**Status:** 8 MATCH / 2 CLOSE / 0 DIVERGED / 2 MISSING / 0 EXTRA

**Highest-severity finding:** F-03 — wonder geography validation is enforced through the placement validator, but the system wrapper remains pass-through (CLOSE, HIGH).

---

## Open questions

1. Should age-transition obsolescence remove non-ageless entries from `urbanTiles`, or mark them obsolete for possible demolition UI?
2. Should wonder one-per-world uniqueness be checked in placement preflight in addition to production completion/final lock?
3. What is the intended deletion timeline for legacy `PLACE_BUILDING` and `buildingPlacementSystem`?

---

## Effort estimate

| Bucket | Findings | Total |
|---|---|---|
| S | F-03, F-12 | ~1d |
| M | F-08, F-11 | ~3d |
| L | — | 0 |
| **Total** | 4 active follow-up items | **~4d** |

Recommended order: F-08 → F-11 → F-12 → F-03.

---

<!-- END OF AUDIT -->
