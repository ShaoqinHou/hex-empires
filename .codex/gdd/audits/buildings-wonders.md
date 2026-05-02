# Buildings & Wonders — hex-empires Audit

**System slug:** `buildings-wonders`
**GDD doc:** [systems/buildings-wonders.md](../systems/buildings-wonders.md)
**Audit date:** `2026-04-19`
**Auditor:** `claude-sonnet-4.6`
**Version target:** Firaxis patch 1.3.0

---

## Engine files audited

- `packages/engine/src/systems/buildingPlacementSystem.ts`
- `packages/engine/src/systems/urbanBuildingSystem.ts`
- `packages/engine/src/systems/wonderPlacementSystem.ts`
- `packages/engine/src/state/BuildingPlacementValidator.ts`
- `packages/engine/src/state/WonderPlacement.ts`
- `packages/engine/src/types/Building.ts`
- `packages/engine/src/types/DistrictOverhaul.ts`
- `packages/engine/src/systems/productionSystem.ts`

---

## Summary tally

| Status | Count |
|---|---|
| MATCH | 2 |
| CLOSE | 0 |
| DIVERGED | 3 |
| MISSING | 5 |
| EXTRA | 2 |

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

### F-02: `ageSystem` performs zero building obsolescence on TRANSITION_AGE — MISSING

**Location:** `packages/engine/src/systems/ageSystem.ts`
**GDD reference:** `systems/buildings-wonders.md` § "Age transition" (cross-cut `ages.md` F-09)
**Severity:** HIGH
**Effort:** M
**VII says:** Non-ageless buildings lose all effect yields and adjacency on age transition.
**Engine does:** `ageSystem` handles TRANSITION_AGE but contains no code touching `CityState.buildings`, `urbanTiles`, or yields.
**Gap:** Post-transition cities retain full prior-age yields indefinitely.
**Recommendation:** On TRANSITION_AGE, iterate each city's urbanTiles; for each non-ageless building, write `obsolete: true` or zero its yield contribution. Requires F-01.

---

### F-03: `wonderPlacementSystem` is a one-line no-op; not wired — EXTRA

**Location:** `packages/engine/src/systems/wonderPlacementSystem.ts`
**GDD reference:** `systems/buildings-wonders.md` § "Wonder placement rules"
**Severity:** HIGH
**Effort:** M
**VII says:** Wonder placement validates geographic constraints (adjacent river, coast, mountain, etc.) and enforces one-per-world uniqueness.
**Engine does:** `export function wonderPlacementSystem(state, _action) { return state; }`. Comment says "NOT yet wired into SYSTEMS pipeline." Geographic rules exist in `WonderPlacement.ts` + `WonderPlacementUtils.ts` but called from `BuildingPlacementValidator` only.
**Gap:** Dead stub file + unwired placement logic.
**Recommendation:** Wire `wonderPlacementSystem` into `GameEngine.ts` SYSTEMS array OR retire the stub.

---

### F-04: Quarter formation ignores ageless-pair; `unique_quarter` kind missing — DIVERGED

**Location:** `packages/engine/src/systems/urbanBuildingSystem.ts:61-88`, `packages/engine/src/types/DistrictOverhaul.ts:83`
**GDD reference:** `systems/buildings-wonders.md` § "Quarter formation" (cross-cut `tile-improvements.md` F-07)
**Severity:** HIGH
**Effort:** M
**VII says:** Two quarter paths: (1) Unique quarter — two civ-unique buildings co-located; (2) Generic quarter — two same-age or two ageless buildings co-located.
**Engine does:** `computeQuarter` only checks `first.age === second.age` for `pure_age`. No ageless-pair check. No `unique_quarter` kind in `QuarterKindV2` — civ-unique pairs (Acropolis, Forum, Necropolis) receive no named bonus.
**Gap:** Both VII quarter bonus types malformed.
**Recommendation:** Add `'unique_quarter' | 'ageless_pair'` to `QuarterKindV2`. Update `computeQuarter` to detect both via `isAgeless` and `civId` flags (needs F-01).

---

### F-05: Specialist adjacency amplification unimplemented — MISSING

**Location:** `packages/engine/src/state/DistrictAdjacency.ts`, `packages/engine/src/state/CityYieldsWithAdjacency.ts`
**GDD reference:** `systems/buildings-wonders.md` § "Specialist amplification" (cross-cut `yields-adjacency.md` F-04/F-05, `population-specialists.md` F-03)
**Severity:** HIGH
**Effort:** M
**VII says:** `effectiveAdjacency = baseAdjacency × (1 + SPECIALIST_AMPLIFIER × specialistCount)`.
**Engine does:** `DistrictAdjacency.computeAdjacencyBonus` never reads `UrbanTileV2.specialistAssigned`. `specialistAssigned` is `boolean` not count.
**Gap:** Specialists cost food but grant no adjacency amplification.
**Recommendation:** Change `specialistAssigned: boolean` to `specialistCount: number`. In `computeAdjacencyBonus`, multiply tile adjacency by `(1 + 0.5 * specialistCount)`.

---

### F-06: Wonder adjacency bonus to neighbors unimplemented — MISSING

**Location:** `packages/engine/src/state/DistrictAdjacency.ts`
**GDD reference:** `systems/buildings-wonders.md` § "Wonder adjacency"
**Severity:** MED
**Effort:** S
**VII says:** "Each Wonder occupies a full tile and provides adjacency bonuses to every surrounding Building."
**Engine does:** `computeAdjacencyBonus` checks Mountain, River, and building-to-building neighbors only. Never checks `buildingDef.isWonder === true` neighbor.
**Gap:** Wonders contribute zero outward adjacency.
**Recommendation:** Add wonder-neighbor check + define `WONDER_ADJACENCY_PER_NEIGHBOR = { culture: 2, science: 1 }`.

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

### F-09: `urbanBuildingSystem` not wired into GameEngine — EXTRA

**Location:** `packages/engine/src/systems/urbanBuildingSystem.ts:26-30`
**GDD reference:** `systems/buildings-wonders.md` § "V2 spatial model"
**Severity:** HIGH
**Effort:** L
**VII says:** V2 spatial model (2-slot urban tiles, quarters, specialist amp) is core VII-parity.
**Engine does:** Comment: "NOT yet wired into GameEngine pipeline — Cycle F integration." `PLACE_URBAN_BUILDING` is in `GameAction` union but system is absent from `SYSTEMS` array. Dispatching is a no-op.
**Gap (root blocker):** `city.urbanTiles` is never populated. Quarter formation (F-04), adjacency bonuses (F-05, F-06), specialist amplification all effectively dead for real gameplay.
**Recommendation:** Cycle F wiring: add `urbanBuildingSystem` to `GameEngine.SYSTEMS`. Retire legacy `buildingPlacementSystem`.

---

### F-10: growth/production use base yield calculator (no adjacency) — DIVERGED

**Location:** `packages/engine/src/systems/growthSystem.ts:69`, `productionSystem.ts:328`
**GDD reference:** `systems/buildings-wonders.md` § "Yield pipeline"
**Severity:** MED
**Effort:** S
**VII says:** Growth, production, etc. flow from full yield calculation including adjacency + quarter bonuses.
**Engine does:** Both systems call `calculateCityYields` (base, no adjacency) instead of `calculateCityYieldsWithAdjacency`.
**Gap:** Mountain-adjacent cities grow and produce at same rate as flat-terrain cities.
**Recommendation:** Swap to `calculateCityYieldsWithAdjacency` in both systems.

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

### F-12: Two parallel placement systems (one-slot vs two-slot tile model) — DIVERGED

**Location:** `buildingPlacementSystem.ts`, `urbanBuildingSystem.ts`
**GDD reference:** `systems/buildings-wonders.md` § "Urban tile slot rules"
**Severity:** MED
**Effort:** L
**VII says:** Urban tile has exactly 2 building slots.
**Engine does:** `buildingPlacementSystem` enforces 1-per-tile (`if (actualTile.building) return invalid`). `urbanBuildingSystem` allows 2-per-tile. Both callable. Two sources of truth (`HexTile.building` vs `CityState.urbanTiles`).
**Gap:** Legacy one-building constraint contradicts VII two-slot model.
**Recommendation:** Retire `buildingPlacementSystem` after F-09 Cycle F wiring.

---

## Extras to retire

- `wonderPlacementSystem.ts` (F-03) — no-op stub; wire in or retire.
- Legacy `buildingPlacementSystem.ts` (F-12) — superseded by `urbanBuildingSystem.ts` once Cycle F lands.

---

## Missing items

1. `ageSystem` obsolescence handler (F-02).
2. Quarter kinds `unique_quarter` + `ageless_pair` (F-04).
3. Specialist adjacency amplification (F-05).
4. Wonder adjacency to neighbors (F-06).
5. Rival-wonder race UX (F-08).
6. `urbanBuildingSystem` wired into `GameEngine.SYSTEMS` (F-09) — root blocker.
7. `DEMOLISH_BUILDING` handler (F-11).

---

## Mapping recommendation for GDD system doc

Paste into `.codex/gdd/systems/buildings-wonders.md` § "Mapping to hex-empires":

**Engine files:**
- `packages/engine/src/systems/buildingPlacementSystem.ts` (legacy)
- `packages/engine/src/systems/urbanBuildingSystem.ts` (V2, not yet wired)
- `packages/engine/src/systems/wonderPlacementSystem.ts` (no-op stub)
- `packages/engine/src/types/Building.ts` (missing ageless fields)
- `packages/engine/src/types/DistrictOverhaul.ts` (V2 types)

**Status:** 0 MATCH / 0 CLOSE / 4 DIVERGED / 6 MISSING / 2 EXTRA

**Highest-severity finding:** F-09 — `urbanBuildingSystem` not wired (root blocker); F-01 — missing `isAgeless`/`civId` fields (unblocks F-02, F-04, F-05).

---

## Open questions

1. Cycle F timing?
2. `WONDER_ADJACENCY_PER_NEIGHBOR` exact values?
3. `SPECIALIST_AMPLIFIER` numeric value (proposed 0.5)?

---

## Effort estimate

| Bucket | Findings | Total |
|---|---|---|
| S | F-01, F-06, F-07, F-10 | 2d |
| M | F-02, F-03, F-04, F-05, F-08, F-11 | ~10d |
| L | F-09, F-12 | 2w+ |
| **Total** | 12 | **~3.5w** |

Recommended order: F-01 → F-09 → F-02 → F-04 → F-05 → F-06 → F-07 → F-10 → F-08 → F-11 → F-12 → F-03.

---

<!-- END OF AUDIT -->
