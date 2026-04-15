# Audit Findings — engine-data

Scope: `packages/engine/src/data/**/*.ts`
Date: 2026-04-15
Auditor: Sonnet 4.6

---

## Summary

| Category | Count |
|----------|-------|
| C — Must Fix | 22 |
| B — Should Fix (exceptions noted) | 5 |
| Observations | 4 |

---

## Category C — Must Fix

### C-01 · S-DATA-PURE · `wonders/placement-rules.ts` imports from `hex/`

**File:** `packages/engine/src/data/wonders/placement-rules.ts:3`
**Standard:** S-DATA-PURE — data files may only import from `../../types/` for type definitions.
**Offender:**
```typescript
import { coordToKey, neighbors } from '../../hex/HexMath';
```
This is a runtime function import from `hex/`, not a type import from `types/`. The file contains game logic (pure predicate functions) wrapped in a data structure. While the comment acknowledges this, S-DATA-PURE does not permit the exception.
**Proposed fix:** Move `WonderPlacementRule` predicates + `WONDER_PLACEMENT_RULES` into a utility file in `state/` or `hex/` (e.g. `state/WonderPlacementRules.ts`). Keep only the `WonderPlacementRule` interface in types. The data file becomes the lookup table that references rule ids, not the rule implementations.
**Est. LOC:** ~340 lines to move; 0 new data file lines.

---

### C-02 · S-ID-UNIQUENESS · `military_science` duplicated across exploration and modern tech trees

**Files:**
- `packages/engine/src/data/technologies/exploration/index.ts:125` — `id: 'military_science'`, age: `exploration`
- `packages/engine/src/data/technologies/modern/index.ts:171` — `id: 'military_science'`, age: `modern`

**Standard:** S-ID-UNIQUENESS — every id must be unique within its content type. Both end up in `ALL_TECHNOLOGIES`.
**Proposed fix:** Rename the modern-age entry to `'advanced_military_science'` or similar. Update `requiredTech` references in buildings/units that point to either entry.
**Est. LOC:** 4 lines (rename id + update 2 references).

---

### C-03 · S-ID-UNIQUENESS · `market`, `barracks`, `workshop` duplicated across antiquity and exploration buildings

**Files:**
- `packages/engine/src/data/buildings/antiquity-buildings.ts:71` — `id: 'market'`
- `packages/engine/src/data/buildings/exploration-buildings.ts:95` — `id: 'market'`
- `packages/engine/src/data/buildings/antiquity-buildings.ts:45` — `id: 'barracks'`
- `packages/engine/src/data/buildings/exploration-buildings.ts:147` — `id: 'barracks'`
- `packages/engine/src/data/buildings/antiquity-buildings.ts:98` — `id: 'workshop'`
- `packages/engine/src/data/buildings/exploration-buildings.ts:108` — `id: 'workshop'`

**Standard:** S-ID-UNIQUENESS — `ALL_BUILDINGS` will contain duplicate IDs; registry lookups (`state.config.buildings.get('market')`) will silently return whichever was registered last.
**Proposed fix:** Rename exploration-age variants to age-qualified IDs: `'medieval_market'`, `'medieval_barracks'`, `'medieval_workshop'`. Update all references (district `allowedBuildings`, tech `unlocks` arrays, UI).
**Est. LOC:** ~24 lines renamed; ~10 reference updates.

---

### C-04 · S-ID-REFS-VALID · All civilization `uniqueUnit` IDs are dangling (no matching unit definition)

**File:** `packages/engine/src/data/civilizations/`
**Standard:** S-ID-REFS-VALID — `uniqueUnit` must resolve to an existing unit id in `ALL_UNITS`.

Missing unit IDs (none exist in any units data file):

| Civ | uniqueUnit |
|-----|-----------|
| Rome | `legion` |
| Egypt | `chariot_archer` |
| Greece | `hoplite` |
| Persia | `immortal` |
| India | `varu` |
| China | `crouching_tiger` |
| Spain | `conquistador` |
| England | `redcoat` |
| France | `garde_imperiale` |
| Ottoman | `janissary` |
| Japan | `samurai` |
| Mongolia | `keshig` |
| America | `minuteman` |
| Germany | `u_boat` |
| Russia | `cossack` |
| Brazil | `minas_geraes` |

**Proposed fix:** Create unique unit definitions for each civilization in the appropriate age unit files and add them to the `ALL_*_UNITS` barrels. This is the highest-value data gap in the game.
**Est. LOC:** ~30 lines per unit × 16 units = ~480 lines.

---

### C-05 · S-ID-REFS-VALID · Most civilization `uniqueBuilding` IDs are dangling

**File:** `packages/engine/src/data/civilizations/`
**Standard:** S-ID-REFS-VALID — `uniqueBuilding` must resolve to an existing building id in `ALL_BUILDINGS`.

Missing building IDs (not found in any buildings data file):

| Civ | uniqueBuilding |
|-----|---------------|
| Egypt | `sphinx` |
| Greece | `acropolis` |
| Persia | `pairidaeza` |
| India | `stepwell` |
| Spain | `mission` |
| England | `royal_navy_dockyard` |
| France | `chateau` |
| Ottoman | `grand_bazaar` |
| Japan | `electronics_factory` |
| Mongolia | `ordu` |
| America | `film_studio` |
| Germany | `hansa` |
| Russia | `lavra` |
| Brazil | `street_carnival` |

Present (resolves): Rome → `bath` (✓), China → `great_wall` (✓ — in exploration wonders)

**Proposed fix:** Add the 14 unique building definitions to the appropriate age building files and include them in barrels.
**Est. LOC:** ~20 lines per building × 14 = ~280 lines.

---

### C-06 · S-ID-REFS-VALID · `machu_picchu` placement rule has no corresponding BuildingDef

**File:** `packages/engine/src/data/wonders/placement-rules.ts:220`
**Standard:** S-ID-REFS-VALID — `wonderId: 'machu_picchu'` references a building that does not exist in `ALL_BUILDINGS` in any age.
**Proposed fix:** Add a `MACHU_PICCHU` BuildingDef to `exploration-buildings.ts` or `modern-buildings.ts` and include it in the barrel.
**Est. LOC:** ~20 lines.

---

### C-07 · S-ID-REFS-VALID · `military_engineering` tech referenced by district but not defined

**File:** `packages/engine/src/data/districts/exploration-districts.ts:110`
**Standard:** S-ID-REFS-VALID — `requiredTech: 'military_engineering'` must resolve to an existing TechnologyId.
**Offender:** `EXPANDED_ENCAMPMENT_DISTRICT.requiredTech = 'military_engineering'`
**Proposed fix:** Add a `MILITARY_ENGINEERING` TechnologyDef to `technologies/exploration/index.ts` and include it in `ALL_EXPLORATION_TECHS`.
**Est. LOC:** 10 lines.

---

### C-08 · S-ID-REFS-VALID · Five `requiredCivic` IDs in antiquity districts reference non-existent civics

**File:** `packages/engine/src/data/districts/antiquity-districts.ts`
**Standard:** S-ID-REFS-VALID

| District | requiredCivic | Status |
|----------|--------------|--------|
| `theater` | `drama_poetry` | NOT FOUND in any civics |
| `holy_site` | `theology` | NOT FOUND |
| `entertainment` | `games_recreation` | NOT FOUND |

And in exploration-districts:

| District | requiredCivic | Status |
|----------|--------------|--------|
| `preserve` | `naturalism` | NOT FOUND |
| `expanded_theater` | `enlightenment` | Found but in modern-civics (wrong age) |
| `expanded_holy_site` | `medieval_faires` | NOT FOUND |

**Proposed fix:** Either add the missing civic definitions to the appropriate age civic files, or update the `requiredCivic` field to reference existing civic IDs.
**Est. LOC:** ~8–10 lines per civic × 5 = ~50 lines to add civics, or 6 reference updates.

---

### C-09 · S-ID-REFS-VALID · `crossbowman` unit requiredTech mismatch with tech tree

**File:** `packages/engine/src/data/units/exploration-units.ts:114`
**Standard:** S-ID-REFS-VALID
**Offender:** `CROSSBOWMAN.requiredTech = 'education'` but `education.unlocks = ['university']` — the tech does not unlock crossbowman. The tech tree shows `castles` as the correct tech (`castles.unlocks = ['crossbowman', 'dungeon']`).
**Proposed fix:** Change `CROSSBOWMAN.requiredTech` to `'castles'` (and optionally update `education.unlocks` to remove the implicit reference).
**Est. LOC:** 1 line.

---

### C-10 · S-BARREL-COMPLETE · `wonders/` directory has no barrel `index.ts`

**File:** `packages/engine/src/data/wonders/` — only `placement-rules.ts` exists; no `index.ts` barrel.
**Standard:** S-BARREL-COMPLETE — every data subdirectory must have a barrel that assembles `ALL_*` and re-exports individual items.
**Proposed fix:** Create `wonders/index.ts` that exports `WONDER_PLACEMENT_RULES` and `WonderPlacementRule`. (After C-01 is fixed, this becomes simpler.)
**Est. LOC:** 4 lines.

---

### C-11 · S-BARREL-COMPLETE · `crises/index.ts` does not assemble a single `ALL_CRISES_COMPLETE` array

**File:** `packages/engine/src/data/crises/index.ts`
**Standard:** S-BARREL-COMPLETE
**Offender:** The barrel exports `ALL_CRISES` (from `all-crises`) and `EXPANSION_CRISES` (from `expansion-crises`) separately. Consumers must know to combine both, and `all-crises.ts` imports directly from `expansion-crises.ts` (intra-data cross-import, minor S-DATA-PURE concern).
**Proposed fix:** Move the combined array to `index.ts`:
```typescript
export const ALL_CRISIS_EVENTS = [...ALL_CRISES, ...EXPANSION_CRISES];
```
Remove the intra-data import in `all-crises.ts`.
**Est. LOC:** 3 lines changed.

---

### C-12 · S-BARREL-COMPLETE · `buildings/index.ts` missing many modern building named exports

**File:** `packages/engine/src/data/buildings/index.ts`
**Standard:** S-BARREL-COMPLETE
**Offender:** The barrel does not export named constants for: `MALL`, `STADIUM`, `MILITARY_BASE`, `MILITARY_ACADEMY`, `AERODROME`, `CITY_PARK`, `DEPARTMENT_STORE`, `RADIO_STATION`, `MUSEUM`, `OPERA_HOUSE`, `SCHOOLHOUSE`, `RAIL_STATION`, `TENEMENT`, `EIFFEL_TOWER`, `STATUE_OF_LIBERTY`, `OXFORD_UNIVERSITY`, `BIG_BEN`, `PENTAGON`, `UN_HEDQUARTERS`. All 19 are in `ALL_MODERN_BUILDINGS` (via `ALL_BUILDINGS`) but cannot be individually imported from the barrel.
**Proposed fix:** Add a named export line for all missing modern building constants.
**Est. LOC:** ~5 lines (grouped re-export).

---

### C-13 · S-BARREL-COMPLETE · Districts barrel `index.ts` exports `ALL_DISTRICTS` but no individual named exports

**File:** `packages/engine/src/data/districts/index.ts`
**Standard:** S-BARREL-COMPLETE — individual district constants are inaccessible by name from the barrel; consumers must import directly from age files.
**Proposed fix:** Add named exports for key district constants (at minimum the antiquity base set).
**Est. LOC:** 3 lines.

---

### C-14 · S-BARREL-COMPLETE · Governors barrel `index.ts` exports `ALL_GOVERNORS` but no individual named exports

**File:** `packages/engine/src/data/governors/index.ts`
**Standard:** S-BARREL-COMPLETE
**Proposed fix:** Add named re-exports from age files.
**Est. LOC:** 3 lines.

---

### C-15 · S-ID-UNIQUENESS · `feudalism` id duplicated: exists as both a Technology and a Civic

**Files:**
- `packages/engine/src/data/technologies/exploration/index.ts:158` — TechnologyDef `id: 'feudalism'`
- `packages/engine/src/data/civics/exploration/index.ts:97` — CivicDef `id: 'feudalism'`

**Standard:** S-ID-UNIQUENESS — IDs must be unique within their type. Since technologies and civics are separate registries this is not a runtime collision, but the tech `feudalism` prerequisite in `castles` (`prerequisites: ['feudalism']`) is ambiguous and the cross-type naming is highly confusing for developers and for future validation tooling.
**Proposed fix:** Rename the civic to `'feudal_society'` or the tech to `'feudal_system'`. Update the 1 prerequisite reference.
**Est. LOC:** 3 lines.

---

### C-16 · S-ID-REFS-VALID · `divine_kingship` civic unlocks `'sphinx'` (not defined) and `athenian_democracy` unlocks `'acropolis'` (not defined)

**File:** `packages/engine/src/data/civics/antiquity/index.ts:130,143`
**Standard:** S-ID-REFS-VALID — civic `unlocks` arrays must reference existing BuildingDef ids.
**Offender:** `sphinx` and `acropolis` do not exist in `ALL_BUILDINGS` (see C-05).
**Proposed fix:** Depends on C-05: once the unique buildings are added, these references resolve automatically. Or, clear the `unlocks` arrays until the buildings are created.
**Est. LOC:** 0 (resolved by C-05); or 2 lines to clear arrays as interim fix.

---

### C-17 · S-ID-REFS-VALID · `state_service` civic unlocks `'government_oligarchy'` — not a building id

**File:** `packages/engine/src/data/civics/antiquity/index.ts:102`
**Standard:** S-ID-REFS-VALID — `unlocks` arrays in CivicDef should reference BuildingId or valid content IDs. `government_oligarchy` is not in `ALL_BUILDINGS` nor is it a recognized content type id.
**Note:** This may be intentional if `governmentSystem` reads civic `unlocks` for government IDs rather than building IDs. If so, the `unlocks` field type is overloaded and the typing needs clarification. Similarly for `feudalism` civic → `government_feudal_monarchy`, `scholasticism` → `government_theocracy`, `class_struggle` → `government_communism`, `enlightenment` → `government_democracy`, `political_theory` → `adopt_ideology`.
**Proposed fix:** Either: (a) define a separate `unlocksGovernment?: GovernmentId` field on `CivicDef` and move these references there; or (b) document the convention in a type comment. The current approach silently overloads `unlocks: string[]` with mixed semantics.
**Est. LOC:** ~10 lines for a new typed field; 8 civic updates.

---

### C-18 · S-ID-REFS-VALID · `EXPANDED_INDUSTRIAL_DISTRICT` references `'industrialization'` (modern tech) from an exploration-age district

**File:** `packages/engine/src/data/districts/exploration-districts.ts:220`
**Standard:** S-ID-REFS-VALID — the tech `industrialization` exists (it is a modern tech) but is assigned as `requiredTech` on an exploration-age district. This creates an age contradiction: an exploration district gated behind a modern tech will be permanently unreachable during the exploration age.
**Proposed fix:** Change `requiredTech` to an appropriate exploration-age tech (e.g. `'apprenticeship'`) or add an intermediate tech.
**Est. LOC:** 1 line.

---

### C-19 · S-NO-HARDCODE-COLORS · Raw hex colors in all civilization definitions

**Files:** `antiquity-civs.ts`, `exploration-civs.ts`, `modern-civs.ts`
**Standard:** S-NO-HARDCODE-COLORS — no raw hex values in data files.
**Offenders:** Every `CivilizationDef` has a `color` field with a raw hex string, e.g. `color: '#e53935'` (Rome), `color: '#fdd835'` (Egypt), etc. — 14 occurrences across the three files.
**Note:** The `CivilizationDef` type declares `color: string` — the field itself is legitimate for renderer consumption. However, the values are hard-coded hex strings. Since these are data files (not UI), the violation is moderate; they are not CSS chrome values. Classified C because the tech-conventions rule is explicit ("never hardcode colors").
**Proposed fix:** Move civ color tokens into a `civ-colors.ts` constant map keyed by civ id and referenced from there, or accept as a deliberate data-layer exception and document it.
**Est. LOC:** 30 lines to centralize; or a 1-line comment per file documenting the exception.

---

### C-20 · S-ID-REFS-VALID · `economics` referenced in modern `big_ben.requiredTech` — exists only in exploration techs

**File:** `packages/engine/src/data/buildings/modern-buildings.ts:190`
**Standard:** S-ID-REFS-VALID
**Offender:** `BIG_BEN.requiredTech = 'economics'` — `economics` is an exploration-age technology. A modern wonder requiring an exploration-age tech is technically valid (techs carry forward) but is inconsistent with the age design intent. This is a weak C; could be classified B depending on design decision.
**Proposed fix:** Add a modern-age tech (e.g. `'advanced_economics'`) or document carry-forward as intentional.
**Est. LOC:** 10 lines for a new tech; or 0 with documentation.

---

### C-21 · S-ID-UNIQUENESS · Variable name typo `UN_HEDQUARTERS` (missing Q) vs `id: 'un_headquarters'`

**File:** `packages/engine/src/data/buildings/modern-buildings.ts:210`
**Standard:** S-NAMED-EXPORTS (name hygiene)
**Offender:** `export const UN_HEDQUARTERS = { id: 'un_headquarters', ... }` — the export name and the id disagree; typo in the export name.
**Proposed fix:** Rename the variable to `UN_HEADQUARTERS`.
**Est. LOC:** 2 lines (declaration + ALL_MODERN_BUILDINGS reference).

---

### C-22 · S-ID-REFS-VALID · `siege_tower.requiredTech = 'construction'` — antiquity tech on an exploration unit

**File:** `packages/engine/src/data/units/exploration-units.ts:228`
**Standard:** S-ID-REFS-VALID (age coherence)
**Offender:** `SIEGE_TOWER` is age `'exploration'` but `requiredTech: 'construction'` is age `'antiquity'`. While a carry-forward may work at runtime, the unit was already unlockable in the antiquity age if construction is researched — undermining the age separation.
**Proposed fix:** Change to `'siege_tactics'` or another exploration-age tech, or document the carry-forward as intentional.
**Est. LOC:** 1 line.

---

## Category B — Should Fix (exceptions)

### B-01 · S-DATA-PURE · `all-crises.ts` imports from sibling data file `./expansion-crises`

**File:** `packages/engine/src/data/crises/all-crises.ts:2`
**Rule says:** data files only import from `../../types/`. Importing from a sibling data file in the same subcategory is a mild violation — no circular dependency, no system imports.
**Exception rationale:** The import is intra-category and avoids duplication. The barrel should be the assembly point (see C-11), not a lateral data-to-data import. Fix is mechanical once C-11 is done.

---

### B-02 · S-DATA-PURE · `wonders/placement-rules.ts` contains game logic (predicate functions), not pure data

This is covered by C-01 but worth noting separately: the file's predicate functions constitute game logic embedded in a data file — they read from `GameState`, traverse maps, and produce runtime decisions. This is not a "victory condition check function" (the one documented exception in S-DATA-PURE); it is general constraint logic.

---

### B-03 · S-READONLY · District files define local helper `Y()` functions and `EMPTY_YIELDS` constants

**Files:** `antiquity-districts.ts:11`, `exploration-districts.ts:10`
**Note:** Helper functions inside data files are not prohibited by S-READONLY, but they are game logic (not pure data). Acceptable for readability; low priority.

---

### B-04 · S-ID-REFS-VALID · `horseman.requiredTech = 'archery'` — antiquity tech on an exploration-age unit

**File:** `packages/engine/src/data/units/exploration-units.ts:146`
`HORSEMAN` is `age: 'exploration'` but `requiredTech: 'archery'` is an antiquity tech. At runtime this means `horseman` is available from antiquity if `archery` is researched, before the exploration age begins. Carry-forward may be intentional for gameplay continuity.

---

### B-05 · S-BARREL-COMPLETE · `religions/index.ts` is intentionally not wired into the engine barrel

**File:** `packages/engine/src/data/religion/index.ts:1–5`
The comment explicitly marks this as deferred until the Religion system ships. The barrel exists and exports correctly within its scope. The engine `index.ts` does not re-export it. This is a documented intentional state, not an oversight.

---

## Observations

1. **No S-DATA-NO-SYSTEM-IMPORTS violations found** outside the `wonders/placement-rules.ts` `hex/` import. All other data files import only from `../../types/` or sibling data files.

2. **No `export default` violations found.** All data files use named exports. S-NAMED-EXPORTS is fully satisfied (excepting the `UN_HEDQUARTERS` typo, C-21).

3. **No `require()` usage found.** S-ESM-ONLY is satisfied across all data files.

4. **16 unique units defined in civilizations are entirely absent from the unit registry.** This is the largest content gap in the game. Every civilization's signature unit is a dangling reference. The AI and combat systems that check `state.config.units.get(civDef.uniqueUnit)` will silently return `undefined` for every player.

---

## Quick-Reference: Dangling ID Summary

All items below produce a `state.config.*.get(id) → undefined` at runtime.

| Type | Dangling IDs | Count |
|------|-------------|-------|
| Units (uniqueUnit) | legion, chariot_archer, hoplite, immortal, varu, crouching_tiger, conquistador, redcoat, garde_imperiale, janissary, samurai, keshig, minuteman, u_boat, cossack, minas_geraes | 16 |
| Buildings (uniqueBuilding) | sphinx, acropolis, pairidaeza, stepwell, mission, royal_navy_dockyard, chateau, grand_bazaar, electronics_factory, ordu, film_studio, hansa, lavra, street_carnival | 14 |
| Buildings (wonder placement) | machu_picchu | 1 |
| Technologies | military_engineering | 1 |
| Civics (district requiredCivic) | drama_poetry, theology, games_recreation, naturalism, medieval_faires | 5 |
| **Total** | | **37** |

