# Tile Improvements & Urban/Rural Districts -- hex-empires Audit

**System slug:** `tile-improvements`
**GDD doc:** [systems/tile-improvements.md](../systems/tile-improvements.md)
**Audit date:** `2026-05-02`
**Auditor:** `codex-gpt-5.5-lead`
**Version target:** Firaxis patch 1.3.0 (per source-target.md; official drift flagged there)

---

## Engine files audited

- `packages/engine/src/systems/improvementSystem.ts`
- `packages/engine/src/systems/growthSystem.ts`
- `packages/engine/src/systems/turnSystem.ts` (pending-growth end-turn guard)
- `packages/engine/src/systems/urbanBuildingSystem.ts` (lines 1-177)
- `packages/engine/src/systems/districtSystem.ts` (lines 1-293)
- `packages/engine/src/systems/specialistSystem.ts`
- `packages/engine/src/state/ImprovementRules.ts`
- `packages/engine/src/state/UrbanPlacementHints.ts` (lines 1-214)
- `packages/engine/src/types/DistrictOverhaul.ts` (lines 1-205)
- `packages/engine/src/data/improvements/index.ts`
- `packages/engine/src/__tests__/retirement-invariants.test.ts`
- `packages/web/src/ui/panels/CityPanel.tsx` (growth-choice UI)
- `packages/web/src/ui/layout/BottomBar.tsx` (builder-remnant UI text only)

---

## Summary tally

| Status | Count |
|---|---|
| MATCH -- code does what VII does | 6 |
| CLOSE -- right shape, wrong specifics | 6 |
| DIVERGED -- fundamentally different (Civ-VI-ism or custom) | 0 |
| MISSING -- GDD describes, engine lacks | 0 |
| EXTRA -- engine has, VII/GDD does not have | 0 |

**Total findings:** 12

---

## Detailed findings

### F-01: Worker/Builder unit triggers improvements -- MATCH

**Location:** `packages/engine/src/systems/improvementSystem.ts`, `packages/engine/src/types/GameState.ts` (GameAction union), `packages/engine/src/__tests__/retirement-invariants.test.ts`
**GDD reference:** `systems/tile-improvements.md` section "The No-Worker Shift"
**Severity:** LOW (resolved)
**Effort:** S (verification)
**VII says:** VII has NO worker or builder units. Improvement placement is a city-level event triggered by population growth (CITY_POPULATION_GROWTH). The player picks a tile; the game auto-assigns the improvement type from terrain+resource. Placement is instant.
**Engine does:** `BUILDER` unit data and the `BUILD_IMPROVEMENT` action are retired. `improvementSystem` accepts city-level `PLACE_IMPROVEMENT`, verifies a pending growth choice, verifies city territory, and derives the improvement type from terrain/resource.
**Gap:** No active gameplay gap for the rural-improvement placement path. Some web/component names still use "builder" as legacy labels, but no builder unit/action path remains.
**Recommendation:** Keep the retirement invariant tests. Clean up legacy UI names opportunistically when touching selection chrome.

---

### F-02: Population growth does not trigger improvement-placement prompt -- CLOSE

**Location:** `packages/engine/src/systems/growthSystem.ts:90-98`
**GDD reference:** `systems/tile-improvements.md` section "Triggers" -> CITY_POPULATION_GROWTH
**Severity:** HIGH
**Effort:** M (1-3 days)
**VII says:** When food_in_bucket >= food_threshold, population increments AND a CITY_POPULATION_GROWTH event fires, prompting the player to spend the new point -- improve a tile (rural) or assign as Specialist.
**Engine does:** `growthSystem` appends `PlayerState.pendingGrowthChoices` on growth, emits a city-targeted production warning, `turnSystem` blocks human `END_TURN` while choices remain, and `CityPanel` renders improvement/specialist resolution controls.
**Gap:** The core non-bankable growth-choice loop exists. Remaining UI polish: map-level tile highlighting/selection flow is still panel-button driven rather than a full map prompt.
**Recommendation:** Add a map-highlight placement mode for pending growth choices in a follow-up UI slice; keep the current engine guard as the source of truth.

---

### F-03: Improvement type is player-chosen, not terrain-auto -- MATCH

**Location:** `packages/engine/src/state/ImprovementRules.ts`, `packages/engine/src/systems/improvementSystem.ts`, `packages/engine/src/systems/growthSystem.ts`, `packages/web/src/ui/panels/CityPanel.tsx`
**GDD reference:** `systems/tile-improvements.md` section "Rural Tiles and Rural Improvements"
**Severity:** LOW (resolved)
**Effort:** S (verification)
**VII says:** Player picks the tile; game selects the type from terrain+resource. Players cannot force a Farm onto Hills, or a Mine onto Grassland.
**Engine does:** `deriveImprovementType` is the canonical mapping. `PLACE_IMPROVEMENT` and `RESOLVE_GROWTH_CHOICE` derive from terrain/resource; explicit mismatch attempts are rejected.
**Gap:** None for the active city-growth improvement path.
**Recommendation:** Expand derivation tests whenever new resources/terrains are added.

---

### F-04: Pre-built District model (Civ VI) coexists with spatial urban tile model -- CLOSE

**Location:** `packages/engine/src/systems/districtSystem.ts:39-153`, `packages/engine/src/types/DistrictOverhaul.ts`
**GDD reference:** `systems/tile-improvements.md` section "Urban Tiles, Districts, and Building Slots"
**Severity:** HIGH
**Effort:** L (week+)
**VII says:** No pre-built District. A tile becomes urban when the first building is placed on it. A District is established automatically. Each urban tile holds exactly two building slots. No per-slot type specialization.
**Engine does:** `PLACE_URBAN_BUILDING` is in `GameAction`, `urbanBuildingSystem` is wired into `DEFAULT_SYSTEMS`, and building placement uses the spatial two-slot urban tile model. The old `districtSystem` remains only for `UPGRADE_DISTRICT` against legacy district state.
**Gap:** Legacy district data/state and `UPGRADE_DISTRICT` remain, so the old abstraction is not fully retired.
**Recommendation:** Retire or migrate legacy `districts` state and `UPGRADE_DISTRICT` after confirming no active production/UI path still relies on it.

---

### F-05: Quarter formation uses age-match, not civ-unique pair -- CLOSE

**Location:** `packages/engine/src/systems/urbanBuildingSystem.ts:61-88`
**Severity:** MED
**Effort:** M (1-3 days)
**VII says:** A Quarter forms when two civ-specific Unique Buildings are co-located on one tile (e.g., Parthenon + Odeon -> Acropolis). The Quarter is civilization-locked and named.
**Engine does:** `computeQuarter` checks `state.config.quarters` for civ-locked unique building pairs, records `quarterId` for named unique quarters, and still supports pure-age/ageless-pair fallback quarters.
**Gap:** The unique-quarter rule shape exists, but content completeness and exact named-quarter coverage still need a content audit.
**Recommendation:** Expand quarter content alongside civ-unique building content; keep `unique_quarter` behavior as the canonical path.

---

### F-06: Ageless flag absent from ImprovementDef -- MATCH

**Location:** `packages/engine/src/types/Improvement.ts`
**Severity:** LOW (resolved)
**Effort:** S (verification)
**VII says:** Civ-unique improvements are tagged Ageless -- they persist across age transitions. Non-ageless standard buildings lose effects and adjacency on transition.
**Engine does:** `ImprovementDef.isAgeless` and `BuildingDef.isAgeless` exist; `ageSystem` preserves ageless entries and removes explicitly non-ageless improvements/buildings on transition.
**Gap:** None for the data-model/transition hook.
**Recommendation:** Keep content validation for `isAgeless` on civ-unique improvements and wonders.

---

### F-07: Civ-unique rural improvements absent from data -- CLOSE

**Location:** `packages/engine/src/data/improvements/index.ts`
**Severity:** MED
**Effort:** M (1-3 days)
**VII says:** Each civilization has at least one unique rural improvement (Baray for Khmer, Great Wall for Han China, Pairidaeza for Persia, etc.; 16 unique improvements catalogued in the GDD).
**Engine does:** `ALL_IMPROVEMENTS` now includes standard improvements plus several civ-unique improvements with `civId` and `isAgeless`.
**Gap:** The catalog is not yet complete against the GDD's full civ-unique list, and some referenced civ IDs are still planned content.
**Recommendation:** Continue civ-unique data expansion as a content slice, with validation against known civ IDs once those civs land.

---

### F-08: Specialist is city-level count, not per-urban-tile -- CLOSE

**Location:** `packages/engine/src/systems/specialistSystem.ts:1-68`
**Severity:** MED
**Effort:** M (1-3 days)
**VII says:** Assign the point as a Specialist on a specific existing urban tile. Specialists amplify that tile adjacency bonuses (plus 50 percent per DistrictOverhaul.ts spec). The assignment is spatial.
**Engine does:** `ASSIGN_SPECIALIST` supports optional `tileId`, updates `specialistsByTile`, and syncs `UrbanTileV2.specialistCount` when spatial data exists. The growth-choice path still resolves to city-level `ASSIGN_SPECIALIST_FROM_GROWTH`.
**Gap:** Growth-triggered specialist assignment is not yet tile-targeted, and adjacency-amplification coverage needs a focused audit against `YieldCalculator`.
**Recommendation:** Extend the growth-choice UI/action to select an urban tile for specialist assignment after the urban-tile flow is fully stable.

---

### F-09: Farm terrain prerequisites include Desert/Tundra -- MATCH

**Location:** `packages/engine/src/data/improvements/index.ts:3-14`
**Severity:** LOW (resolved)
**Effort:** S (verification)
**VII says:** Farm is for flat terrain (Grassland, Plains, Tropical) -- primary Food producer. Desert and Tundra are non-arable terrain types that should not support Farms.
**Engine does:** `FARM.prerequisites.terrain` is limited to plains, grassland, and tropical.
**Gap:** None for farm terrain eligibility.
**Recommendation:** Keep farm derivation covered in `w2-01-growth-improvement.test.ts`.

---

### F-10: PLACE_IMPROVEMENT action absent from GameAction union -- MATCH

**Location:** `packages/engine/src/types/GameState.ts` (GameAction union)
**Severity:** LOW (resolved)
**Effort:** S (verification)
**VII says:** Two explicit actions: PLACE_IMPROVEMENT (city-level, triggered by population growth) and PLACE_BUILDING (converts tile to urban, auto-creates district, checks for Quarter pair).
**Engine does:** `GameAction` includes `PLACE_IMPROVEMENT`, `ASSIGN_SPECIALIST_FROM_GROWTH`, `RESOLVE_GROWTH_CHOICE`, and `PLACE_URBAN_BUILDING`.
**Gap:** None for action-union availability.
**Recommendation:** Keep action union tests focused on behavior rather than type-only assertions.

---

### F-11: Road is a rural improvement -- MATCH

**Location:** `packages/engine/src/data/improvements/index.ts:86-97`
**Severity:** LOW (resolved)
**Effort:** S (verification)
**VII says:** The GDD lists Farm, Mine, Quarry, Pasture, Plantation, Camp, Woodcutter, Clay Pit, Fishing Boat, Oil Rig, and civ-unique improvements. Roads are not listed as tile improvements in VII.
**Engine does:** `ROAD` is retired from `ALL_IMPROVEMENTS`; retirement-invariant tests assert it stays removed.
**Gap:** None for the rural-improvement catalog.
**Recommendation:** Treat roads/rail as trade or infrastructure systems, not rural improvement data.

---

### F-12: Woodcutter, Clay Pit, Fishing Boat, Oil Rig absent -- CLOSE (content gap)

**Location:** `packages/engine/src/data/improvements/index.ts`
**Severity:** LOW
**Effort:** S (half-day)
**VII says:** Standard rural improvements include Woodcutter (vegetated forest tiles), Clay Pit (wet terrain), Fishing Boat (coastal/river with aquatic resources), and Oil Rig (Oil, Modern-only).
**Engine does:** `WOODCUTTER`, `CLAY_PIT`, `FISHING_BOATS`, and `OIL_RIG` exist in `ALL_IMPROVEMENTS` and are covered by derivation tests.
**Gap:** Oil Rig is forward-compatible for an `oil` resource but lacks Modern-only gating because the current improvement rule does not receive age context and no oil resource exists yet.
**Recommendation:** Add age/tech gating for Oil Rig when the oil resource and Modern resource data are introduced.

---

## Extras to retire

- `packages/engine/src/systems/districtSystem.ts` / `GameState.districts` -- legacy district upgrade state remains. Retire or migrate after confirming no active save/UI dependency.
- Builder naming remnants in web UI callbacks and icon code -- not an active gameplay path, but should be renamed when that chrome is next touched.

---

## Missing items

- Full map-highlight UI for pending growth choice tile selection (F-02 follow-up).
- Complete civ-unique rural improvement catalog (F-07).
- Growth-triggered specialist assignment to a specific urban tile (F-08).
- Oil Rig Modern-only gating once oil resource data exists (F-12).

---

## Mapping recommendation for GDD system doc

Paste into .codex/gdd/systems/tile-improvements.md section Mapping to hex-empires:

**Engine files:**
- `packages/engine/src/systems/improvementSystem.ts`
- `packages/engine/src/systems/growthSystem.ts`
- `packages/engine/src/systems/turnSystem.ts`
- `packages/engine/src/systems/urbanBuildingSystem.ts`
- `packages/engine/src/systems/districtSystem.ts` (legacy upgrade state -- pending retirement)
- `packages/engine/src/systems/specialistSystem.ts`
- `packages/engine/src/types/DistrictOverhaul.ts`
- `packages/engine/src/data/improvements/index.ts`
- `packages/web/src/ui/panels/CityPanel.tsx`

**Status:** 6 MATCH / 6 CLOSE / 0 DIVERGED / 0 MISSING / 0 EXTRA (see .codex/gdd/audits/tile-improvements.md for details)

**Highest-severity finding:** F-02 -- Population growth prompt (CLOSE -- core pending-choice loop exists; map-highlight prompt polish remains)

---

## Open questions

- Whether legacy `districts` state can be retired outright or needs save migration.
- food_threshold curve: engine uses GrowthUtils.getGrowthThreshold with age-dependent formulas -- reasonable but not cross-checked against VII exact formula.
- District/urban adjacency and growth-specialist tile targeting should be re-audited together because F-08 depends on both.

---

## Effort estimate

| Bucket | Findings | Estimated total effort |
|---|---|---|
| S (half-day) | verification/cleanup for F-01, F-03, F-06, F-09, F-10, F-11 | done |
| M (1-3 days) | F-02 map prompt polish, F-05 content coverage, F-08 tile-targeted growth specialists, F-12 oil gating | ~8d |
| L (week+) | F-04 legacy district-state retirement, F-07 full civ-unique catalog | ~2w |
| **Remaining** | 6 CLOSE findings | **~3w** |

Recommended order: F-02 map-highlight UI polish, F-08 growth specialist tile targeting, F-07 civ-unique catalog completion, F-04 legacy district-state retirement, F-12 oil gating when Modern resource data lands.

---

<!-- END OF AUDIT TEMPLATE -->
