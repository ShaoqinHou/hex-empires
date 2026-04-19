# Tile Improvements & Urban/Rural Districts -- hex-empires Audit

**System slug:** `tile-improvements`
**GDD doc:** [systems/tile-improvements.md](../systems/tile-improvements.md)
**Audit date:** `2026-04-19`
**Auditor:** `claude-sonnet-4-6`
**Version target:** Firaxis patch 1.3.0 (per commitment.md)

---

## Engine files audited

- `packages/engine/src/systems/improvementSystem.ts` (lines 1-107)
- `packages/engine/src/systems/growthSystem.ts` (lines 1-184)
- `packages/engine/src/systems/urbanBuildingSystem.ts` (lines 1-177)
- `packages/engine/src/systems/districtSystem.ts` (lines 1-293)
- `packages/engine/src/systems/specialistSystem.ts` (lines 1-68)
- `packages/engine/src/state/UrbanPlacementHints.ts` (lines 1-214)
- `packages/engine/src/types/DistrictOverhaul.ts` (lines 1-205)
- `packages/engine/src/data/improvements/index.ts` (lines 1-107)
- `packages/engine/src/data/units/antiquity-units.ts` (BUILDER unit)
- `packages/web/src/ui/panels/ImprovementPanel.tsx` (lines 1-207)

---

## Summary tally

| Status | Count |
|---|---|
| MATCH -- code does what VII does | 3 |
| CLOSE -- right shape, wrong specifics | 2 |
| DIVERGED -- fundamentally different (Civ-VI-ism or custom) | 3 |
| MISSING -- GDD describes, engine lacks | 3 |
| EXTRA -- engine has, VII/GDD does not have | 1 |

**Total findings:** 12

---

## Detailed findings

### F-01: Worker/Builder unit triggers improvements -- DIVERGED

**Location:** `packages/engine/src/systems/improvementSystem.ts:9-68`, `packages/engine/src/data/units/antiquity-units.ts:166-180`
**GDD reference:** `systems/tile-improvements.md` section "The No-Worker Shift"
**Severity:** HIGH
**Effort:** L (week+)
**VII says:** VII has NO worker or builder units. Improvement placement is a city-level event triggered by population growth (CITY_POPULATION_GROWTH). The player picks a tile; the game auto-assigns the improvement type from terrain+resource. Placement is instant.
**Engine does:** `improvementSystem` handles a `BUILD_IMPROVEMENT` action dispatched by a `Builder` unit (ability: build_improvement, defined in antiquity-units.ts). The builder must be on the target tile. Building consumes the builder unit (`updatedUnits.delete(unitId)`). The player explicitly selects both the unit and the improvement type.
**Gap:** Three Civ-VII divergences stacked: (1) a builder unit exists (Civ VI/V pattern); (2) improvement placement is unit-action not city-event; (3) player chooses the improvement type (not terrain-auto). `ImprovementPanel.tsx` shows all valid improvement types for the tile -- the player picks, defeating the "terrain dictates type" rule.
**Recommendation:** Remove `BUILDER` unit data and `BUILD_IMPROVEMENT` action. Add `CITY_POPULATION_GROWTH` event to `growthSystem` when population increments. Add `PLACE_IMPROVEMENT` action to `improvementSystem` that auto-selects type from terrain+resource via a lookup table matching the GDD terrain-to-improvement mapping (Farm for flat, Mine for rough+mineral, etc.).

---

### F-02: Population growth does not trigger improvement-placement prompt -- MISSING

**Location:** `packages/engine/src/systems/growthSystem.ts:90-98`
**GDD reference:** `systems/tile-improvements.md` section "Triggers" -> CITY_POPULATION_GROWTH
**Severity:** HIGH
**Effort:** M (1-3 days)
**VII says:** When food_in_bucket >= food_threshold, population increments AND a CITY_POPULATION_GROWTH event fires, prompting the player to spend the new point -- improve a tile (rural) or assign as Specialist.
**Engine does:** `growthSystem` increments `city.population` and expands territory. No event is fired. No improvement-placement prompt is triggered. The growth turn ends with population incremented but no tile-assignment step.
**Gap:** The core VII mechanic -- every pop point = one improvement charge -- is entirely absent. The engine has city growth but the growth-improvement coupling does not exist.
**Recommendation:** After `population + 1` in `growthSystem`, append a pending-action or event to `state.pendingCityActions` (or equivalent) so the UI can surface the "improve a tile / assign specialist" choice. This is closely tied to F-01 (the improvement action must be a city-level action, not a builder action).

---

### F-03: Improvement type is player-chosen, not terrain-auto -- DIVERGED

**Location:** `packages/engine/src/systems/improvementSystem.ts:14`, `packages/web/src/ui/panels/ImprovementPanel.tsx:29-55`
**GDD reference:** `systems/tile-improvements.md` section "Rural Tiles and Rural Improvements"
**Severity:** HIGH
**Effort:** M (1-3 days)
**VII says:** Player picks the tile; game selects the type from terrain+resource. Players cannot force a Farm onto Hills, or a Mine onto Grassland.
**Engine does:** `ImprovementPanel` shows all improvements whose prerequisites match the tile terrain/feature/resource, and lets the player pick any of them. There is no automatic derivation -- multiple improvements can match a tile and the player chooses.
**Gap:** The filter in `ImprovementPanel` enforces prerequisites but does not enforce the "exactly one improvement type per tile" determinism VII requires.
**Recommendation:** Add `deriveImprovementType(terrain, feature, resource): ImprovementId` to `improvementSystem` or a new `ImprovementRules` utility, implementing the GDD mapping table. Wire it into the `PLACE_IMPROVEMENT` action (F-01) so the type is never player-chosen.

---

### F-04: Pre-built District model (Civ VI) coexists with spatial urban tile model -- DIVERGED

**Location:** `packages/engine/src/systems/districtSystem.ts:39-153`, `packages/engine/src/types/DistrictOverhaul.ts`
**GDD reference:** `systems/tile-improvements.md` section "Urban Tiles, Districts, and Building Slots"
**Severity:** HIGH
**Effort:** L (week+)
**VII says:** No pre-built District. A tile becomes urban when the first building is placed on it. A District is established automatically. Each urban tile holds exactly two building slots. No per-slot type specialization.
**Engine does:** Two competing district models coexist. `districtSystem.ts` implements a Civ-VI-style explicit `PLACE_DISTRICT` action with a typed DistrictDef (campus, harbor, etc.), one-per-city-per-type limit, and population-cost gating. Simultaneously, `DistrictOverhaul.ts` and `urbanBuildingSystem.ts` implement the VII-style spatial model (PLACE_URBAN_BUILDING, UrbanTileV2, 2-slot cap, QuarterV2). `DistrictOverhaul.ts` comments confirm these are "NOT yet wired into GameEngine".
**Gap:** The legacy `districtSystem` is the live implementation. The VII-parity overhaul (`urbanBuildingSystem`) is isolated in a parallel namespace and disconnected from the main engine pipeline. Players currently experience Civ-VI-style district placement.
**Recommendation:** Complete the Districts Overhaul Cycle F integration: wire `urbanBuildingSystem` into `GameEngine`, splice `DistrictOverhaulActionV2` into `GameAction`, and remove the legacy `PLACE_DISTRICT` path. The type infrastructure in `DistrictOverhaul.ts` is already well-designed.

---

### F-05: Quarter formation uses age-match, not civ-unique pair -- CLOSE

**Location:** `packages/engine/src/systems/urbanBuildingSystem.ts:61-88`
**Severity:** MED
**Effort:** M (1-3 days)
**VII says:** A Quarter forms when two civ-specific Unique Buildings are co-located on one tile (e.g., Parthenon + Odeon -> Acropolis). The Quarter is civilization-locked and named.
**Engine does:** computeQuarter in urbanBuildingSystem detects a Quarter when two buildings share the same age. No civ-unique check, no named Quarter catalog, no civilization-lock.
**Gap:** Quarter detection rule is wrong (age-match instead of civ-unique pair), Quarters are anonymous, and there is no civilization guard.
**Recommendation:** Add a QUARTER_CATALOG mapping civ+building-pair to named Quarter definitions. Update computeQuarter to check the building pair against the catalog for the current player civ.

---

### F-06: Ageless flag absent from ImprovementDef -- MISSING

**Location:** `packages/engine/src/types/Improvement.ts`
**Severity:** MED
**Effort:** S (half-day)
**VII says:** Civ-unique improvements are tagged Ageless -- they persist across age transitions. Non-ageless standard buildings lose effects and adjacency on transition.
**Engine does:** ImprovementDef has no ageless boolean field. ageSystem.ts handles TRANSITION_AGE but contains zero logic for preserving ageless improvements.
**Gap:** The Ageless/outdated split -- a core VII design pillar -- is not modeled. All improvements behave identically across ages.
**Recommendation:** Add readonly ageless: boolean to ImprovementDef and BuildingDef. Add TRANSITION_AGE handler in ageSystem to nullify effects on non-ageless buildings.

---

### F-07: Civ-unique rural improvements absent from data -- MISSING

**Location:** `packages/engine/src/data/improvements/index.ts`
**Severity:** MED
**Effort:** M (1-3 days)
**VII says:** Each civilization has at least one unique rural improvement (Baray for Khmer, Great Wall for Han China, Pairidaeza for Persia, etc.; 16 unique improvements catalogued in the GDD).
**Engine does:** ALL_IMPROVEMENTS contains exactly 7 entries: Farm, Mine, Pasture, Plantation, Quarry, Camp, Road. No civ-unique rural improvements exist.
**Gap:** The entire civ-unique improvement layer (16 improvements per GDD) is absent.
**Recommendation:** Create data files in packages/engine/src/data/improvements/ for each civ-unique improvement. Add ageless: true, define a civId foreign key, add placement constraints. Add all to the barrel export.

---

### F-08: Specialist is city-level count, not per-urban-tile -- CLOSE

**Location:** `packages/engine/src/systems/specialistSystem.ts:1-68`
**Severity:** MED
**Effort:** M (1-3 days)
**VII says:** Assign the point as a Specialist on a specific existing urban tile. Specialists amplify that tile adjacency bonuses (plus 50 percent per DistrictOverhaul.ts spec). The assignment is spatial.
**Engine does:** specialistSystem operates on city.specialists (a flat integer count). ASSIGN_SPECIALIST and UNASSIGN_SPECIALIST actions take only cityId -- no tile coordinate. DistrictOverhaul.ts defines a per-tile specialistAssigned: boolean field, but this is in the unintegrated V2 namespace.
**Gap:** The live specialist system is city-level not tile-level, so the adjacency-amplification effect cannot be expressed.
**Recommendation:** Wire AssignUrbanSpecialistActionV2 into the main pipeline as part of Cycle F overhaul (F-04). Update YieldCalculator to read UrbanTileV2.specialistAssigned and apply the adjacency multiplier.

---

### F-09: Farm terrain prerequisites include Desert/Tundra -- CLOSE

**Location:** `packages/engine/src/data/improvements/index.ts:3-14`
**Severity:** LOW
**Effort:** S (half-day)
**VII says:** Farm is for flat terrain (Grassland, Plains, Tropical) -- primary Food producer. Desert and Tundra are non-arable terrain types that should not support Farms.
**Engine does:** FARM.prerequisites.terrain includes plains, grassland, desert, tundra -- allowing farms on Desert and Tundra tiles.
**Gap:** Desert and Tundra terrain types are non-arable in VII. Allowing Farms on them breaks the terrain-to-improvement mapping.
**Recommendation:** Remove desert and tundra from FARM.prerequisites.terrain. Verify MINE.prerequisites restricts to hills and mountains to match the GDD rough terrain rule.

---

### F-10: PLACE_IMPROVEMENT action absent from GameAction union -- MISSING

**Location:** `packages/engine/src/types/GameState.ts` (GameAction union)
**Severity:** HIGH
**Effort:** M (1-3 days)
**VII says:** Two explicit actions: PLACE_IMPROVEMENT (city-level, triggered by population growth) and PLACE_BUILDING (converts tile to urban, auto-creates district, checks for Quarter pair).
**Engine does:** The live GameAction union contains BUILD_IMPROVEMENT (builder-unit action) and PLACE_DISTRICT (Civ-VI district placement). PLACE_IMPROVEMENT and the VII-style PLACE_BUILDING are absent from the live action union.
**Gap:** The VII action vocabulary is not present in the live engine. Fixing F-01, F-02, and F-04 all require these actions to exist in GameAction.
**Recommendation:** Add PLACE_IMPROVEMENT with cityId+tile and splice PlaceUrbanBuildingActionV2 as PLACE_URBAN_BUILDING into GameAction as part of Cycle F. This is a prerequisite blocker for F-01, F-02, and F-04.

---

### F-11: Road is a rural improvement -- EXTRA

**Location:** `packages/engine/src/data/improvements/index.ts:86-97`
**Severity:** LOW
**Effort:** S (half-day)
**VII says:** The GDD lists Farm, Mine, Quarry, Pasture, Plantation, Camp, Woodcutter, Clay Pit, Fishing Boat, Oil Rig, and civ-unique improvements. Roads are not listed as tile improvements in VII.
**Engine does:** ROAD is defined as an ImprovementDef in ALL_IMPROVEMENTS with category: infrastructure, cost: 1 Builder charge, requiredTech: wheel, and a movement: -0.5 modifier.
**Gap:** Road as a Builder-unit improvement is a Civ V/VI holdover. VII has no documented road-improvement mechanism.
**Recommendation:** Remove ROAD from ALL_IMPROVEMENTS or move to a separate infrastructure category explicitly marked as not a VII improvement.

---

### F-12: Woodcutter, Clay Pit, Fishing Boat, Oil Rig absent -- MISSING (content gap)

**Location:** `packages/engine/src/data/improvements/index.ts`
**Severity:** LOW
**Effort:** S (half-day)
**VII says:** Standard rural improvements include Woodcutter (vegetated forest tiles), Clay Pit (wet terrain), Fishing Boat (coastal/river with aquatic resources), and Oil Rig (Oil, Modern-only).
**Engine does:** None of these four types exist in ALL_IMPROVEMENTS. The current 7-item list omits Woodcutter, Clay Pit, Fishing Boat, and Oil Rig.
**Gap:** Four of VII ten standard improvements are unimplemented.
**Recommendation:** Create data entries for Woodcutter, Clay Pit, Fishing Boat, and Oil Rig. Oil Rig requires Modern-age gating via requiredTech or an age field added to ImprovementDef.

---

## Extras to retire

- `packages/engine/src/data/units/antiquity-units.ts` -- BUILDER unit with build_improvement ability; VII removed the worker unit entirely. Retire after F-01.
- `packages/engine/src/systems/districtSystem.ts` -- PLACE_DISTRICT Civ-VI-style district placement. Retire after Cycle F overhaul promotes urbanBuildingSystem.
- ROAD in improvements/index.ts -- not a VII improvement type (see F-11).

---

## Missing items

- Population-growth -> improvement-placement event coupling (F-02) -- required for clone; most critical missing link.
- PLACE_IMPROVEMENT + PLACE_URBAN_BUILDING in live GameAction union (F-10) -- prerequisite blocker.
- Ageless flag on improvements/buildings + age-transition handler (F-06) -- required for VII age-transition semantics.
- 16 civ-unique rural improvements (F-07) -- required for civ differentiation.
- Woodcutter, Clay Pit, Fishing Boat, Oil Rig standard improvements (F-12) -- content completeness.

---

## Mapping recommendation for GDD system doc

Paste into .claude/gdd/systems/tile-improvements.md section Mapping to hex-empires:

**Engine files:**
- `packages/engine/src/systems/improvementSystem.ts`
- `packages/engine/src/systems/growthSystem.ts`
- `packages/engine/src/systems/urbanBuildingSystem.ts` (V2 -- not yet wired)
- `packages/engine/src/systems/districtSystem.ts` (Civ-VI legacy -- pending retirement)
- `packages/engine/src/systems/specialistSystem.ts`
- `packages/engine/src/types/DistrictOverhaul.ts`
- `packages/engine/src/data/improvements/index.ts`
- `packages/web/src/ui/panels/ImprovementPanel.tsx`

**Status:** 3 MATCH / 2 CLOSE / 3 DIVERGED / 3 MISSING / 1 EXTRA (see .claude/gdd/audits/tile-improvements.md for details)

**Highest-severity finding:** F-01 -- Worker/Builder unit triggers improvements (DIVERGED -- VII has no worker unit; improvement is a city-level population-growth event)

---

## Open questions

- Whether urbanBuildingSystem Cycle F integration is in-flight -- the overhaul design is complete in DistrictOverhaul.ts but not wired in. If Cycle F is active, F-04 and F-08 may be partially resolved.
- food_threshold curve: engine uses GrowthUtils.getGrowthThreshold with age-dependent formulas -- reasonable but not cross-checked against VII exact formula.
- District adjacency in districtSystem.ts:265-292 is a stub (terrain feature check noted as simplified). A secondary gap not surfaced as a top-level finding.

---

## Effort estimate

| Bucket | Findings | Estimated total effort |
|---|---|---|
| S (half-day) | F-06, F-09, F-11, F-12 | 2d |
| M (1-3 days) | F-02, F-03, F-05, F-07, F-08, F-10 | ~12d |
| L (week+) | F-01, F-04 | ~3w |
| **Total** | 12 | **~4w** |

Recommended order: F-10, F-02, F-01, F-04 -- action-union prerequisite first, then growth event, then builder retirement, then district overhaul promotion. F-06, F-09, F-11, F-12 are low-effort and can be done in parallel.

---

<!-- END OF AUDIT TEMPLATE -->
