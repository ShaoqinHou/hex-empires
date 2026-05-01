# Map & Terrain — hex-empires Audit

**System slug:** `map-terrain`
**GDD doc:** [systems/map-terrain.md](../systems/map-terrain.md)
**Audit date:** `2026-04-19`
**Auditor:** `claude-sonnet-4.6`
**Version target:** Firaxis patch 1.3.0

---

## Engine files audited

- `packages/engine/src/data/terrains/base-terrains.ts`
- `packages/engine/src/data/terrains/features.ts`
- `packages/engine/src/hex/TerrainCost.ts`
- `packages/engine/src/systems/movementSystem.ts`
- `packages/engine/src/systems/visibilitySystem.ts`
- `packages/engine/src/state/TileContents.ts`
- `packages/engine/src/state/MapAnalytics.ts`
- `packages/engine/src/types/GameState.ts` (HexTile, HexMap)
- `packages/engine/src/types/Terrain.ts`

---

## Summary tally

| Status | Count |
|---|---|
| MATCH | 0 |
| CLOSE | 3 |
| DIVERGED | 3 |
| MISSING | 4 |
| EXTRA | 2 |

**Total findings:** 12

---

## Detailed findings

### F-01: Terrain model uses Civ VI per-tile types, not VII biome+modifier — DIVERGED

**Location:** `data/terrains/base-terrains.ts:1-88`
**GDD reference:** `systems/map-terrain.md` § "Biome System"
**Severity:** HIGH
**Effort:** L
**VII says:** Terrain = biome (desert|grassland|plains|tropical|tundra|marine) × modifier (flat|rough|vegetated|wet). Snow subsumed into Tundra. Tropical = new VII biome.
**Engine does:** 7 flat terrains: grassland, plains, desert, tundra, snow, coast, ocean. Features (hills, forest, jungle, marsh) layered. Single `movementCost` + `defenseBonus` per terrain. No biome/modifier fields.
**Gap:** Biome+modifier architecture absent. SNOW standalone. Tropical absent.
**Recommendation:** Add `biome` + `modifier` to `TerrainDef`. Derive yields/movement/defense from compound. Remove SNOW standalone. Add Tropical biome rows.

---

### F-02: Navigable rivers are edge markers, not traversable water tiles — DIVERGED

**Location:** `types/GameState.ts:26`, `state/MapAnalytics.ts:76-82`
**GDD reference:** `systems/map-terrain.md` § "Navigable Rivers — VII Innovation"
**Severity:** HIGH
**Effort:** L
**VII says:** Navigable rivers are wide water tiles. Naval units traverse. Connect inland to coast. Support coastal + land buildings. Grant fresh water (+5 happiness). Raidable.
**Engine does:** `HexTile.river` is `ReadonlyArray<number>` — edge indices. All rivers are tile-edge decorations. No navigable river tile type, no fresh water flag, no naval traversal. `WATER_TERRAINS = ['ocean', 'coast', 'reef']` only.
**Gap:** VII's navigable river innovation absent.
**Recommendation:** Add `navigableRiver` terrain type. Add `HexTile.hasFreshWater`. Wire naval movement to treat navigable as water.

---

### F-03: Movement costs are fractional additions, not binary deplete-all — DIVERGED

**Location:** `hex/TerrainCost.ts:1-64`
**GDD reference:** `systems/map-terrain.md` § "Movement Rules (Binary)"
**Severity:** MED
**Effort:** M
**VII says:** Strictly binary. Flat = 1 MP. Rough/Vegetated/Wet = deplete ALL remaining MP.
**Engine does:** Additive fractional. Hills `+1`, Forest `+1`, Marsh `+1`. Unit can enter hills and continue moving.
**Gap:** Deplete-all mechanic absent. Tactical results qualitatively wrong.
**Recommendation:** Refactor `getMovementCost` to return `{ cost: number | 'deplete' | null }`. In `movementSystem`, when 'deplete' returned, set `movementSpent = movementLeft`.

---

### F-04: Distant Lands partition absent — MISSING

**Location:** `types/GameState.ts` (HexTile), `systems/visibilitySystem.ts`
**GDD reference:** `systems/map-terrain.md` § "Homelands / Distant Lands"
**Severity:** HIGH
**Effort:** L
**VII says:** Every tile tagged `isDistantLands: boolean` at world-gen. Distant Lands permafog during Antiquity. Accessible in Exploration after Cartography/Shipbuilding. Required for 2 Exploration victory paths.
**Engine does:** `HexTile` has no `isDistantLands`. `visibilitySystem` single fog layer, no age-gated permafog.
**Gap:** Most novel VII geographic feature absent.
**Recommendation:** Add `isDistantLands: boolean` to `HexTile`. Add `distantLandsReachable: boolean` to `PlayerState`. `visibilitySystem` treats Distant Lands as permanent fog until reachable.

---

### F-05: Deep Ocean and ocean attrition absent — MISSING

**Location:** `data/terrains/base-terrains.ts`, `systems/movementSystem.ts`
**GDD reference:** `systems/map-terrain.md` § "Water Terrain"
**Severity:** MED
**Effort:** M
**VII says:** Deep Ocean deals 11-20 HP/turn attrition to naval without ocean-crossing tech (Cartography/Shipbuilding mastery). Attrition removed progressively as techs researched.
**Engine does:** OCEAN `isPassable: false` — binary block. No attrition, no tech gating, no Coast/Deep Ocean distinction.
**Gap:** Graduated access absent.
**Recommendation:** Add `deepOcean` terrain. Add ocean attrition as move side-effect. Wire to `researchSystem` tech gates.

---

### F-06: Snow standalone + Tropical absent + JUNGLE missing Science — CLOSE

**Location:** `data/terrains/base-terrains.ts:47-56`
**GDD reference:** `systems/map-terrain.md` § "Biome System"
**Severity:** MED
**Effort:** S content + M biome dependency
**VII says:** Snow not separate (subsumed into Tundra). Tropical biome: Flat 3F, Rough 1F 2P, Vegetated/Rainforest 2P 1Sci, Wet/Mangrove 1F 2P 1Sci.
**Engine does:** SNOW standalone with 0 yields. Tropical absent. `JUNGLE` feature exists but has no Science (only +1 Food).
**Gap:** 3 content issues.
**Recommendation:** Correct JUNGLE yields +1 Sci. Remove SNOW (part of F-01 refactor). Add Tropical biome rows.

---

### F-07: Natural wonders absent from map tile model — MISSING

**Location:** `types/GameState.ts` (HexTile)
**GDD reference:** `systems/map-terrain.md` § "Natural Wonders"
**Severity:** MED
**Effort:** M
**VII says:** 12 natural wonders at world gen (3 on Tiny, +1 per size tier). Each 1-4 tiles tagged `isNaturalWonder`. No improvements. First civ to settle gets scaling bonuses. Specific: fresh water (Gullfoss, Iguazu Falls), volcano events (Kilimanjaro, Thera), permanent promotions (Torres del Paine).
**Engine does:** `HexTile` has no `isNaturalWonder`. Existing `wonderPlacementSystem.ts` handles city-built wonders only. No natural wonder data.
**Gap:** Map-placed natural wonders entirely absent.
**Recommendation:** Add `isNaturalWonder: boolean` + `naturalWonderId: string | null` to `HexTile`. Create `data/natural-wonders/` with 12 entries. World-gen hook.

---

### F-08: Defense bonuses use inconsistent percentage vs flat formats — CLOSE

**Location:** `data/terrains/features.ts:3-83`
**GDD reference:** `systems/map-terrain.md` § "Defense Bonuses"
**Severity:** MED
**Effort:** S
**VII says:** Flat CS additions: Hills +3 CS, Forest/Rainforest +2 CS, minor river defender -5 CS.
**Engine does:** HILLS `flatDefenseBonus = 3` (correct). FOREST `flatDefenseBonus = 2` (correct). JUNGLE `defenseBonusModifier = 0.25` (percentage). MARSH `defenseBonusModifier = -0.15` (percentage). `TerrainDef.defenseBonus` comment says `"0.25 = +25%"` — multiplicative, inconsistent with VII flat-CS. River defender penalty absent.
**Gap:** Mixed formats; river penalty missing.
**Recommendation:** Standardize to flat CS: JUNGLE 0.25 → 2; MARSH -0.15 → 0. Add -5 CS river-crossing defender check to `combatSystem`.

---

### F-09: Fog of war lacks terrain occlusion — CLOSE

**Location:** `systems/visibilitySystem.ts:67-79`
**GDD reference:** `systems/map-terrain.md` § "Fog of War"
**Severity:** LOW
**Effort:** M
**VII says:** Two-state visible/explored fog (standard Civ). Mountains block LOS in many Civ titles (VII documentation not explicit).
**Engine does:** `recalcFullVisibility` uses `range(unit.position, sightRange)` — simple radius, no terrain occlusion.
**Gap:** LOS doesn't block through mountains.
**Recommendation:** Add `lineOfSight(origin, target, tiles)` utility. Block LOS through mountains. Lower priority — VII spec unclear.

---

### F-10: Terrain base yields diverge from VII — CLOSE

**Location:** `data/terrains/base-terrains.ts`
**GDD reference:** `systems/map-terrain.md` § "Biome System" yield table
**Severity:** MED
**Effort:** S
**VII says:** Grassland Flat 3F. Plains Flat 2F 1P. Desert Flat 2F 1P. Tundra Flat 3F. Ocean = 0 until Modern (1F 3G).
**Engine does:** Grassland `food=2` (VII=3). Plains `{food:1, production:1}` (VII 2F 1P — off by 1F). Desert `food=0` (VII 2F 1P). Tundra `food=1` (VII=3F). Ocean `food=1, gold=0` (always, not age-gated).
**Gap:** 4 biome yield errors + no ocean age-gating.
**Recommendation:** Grassland 2→3, Plains 1F→2F, Desert 0→2F+1P, Tundra 1F→3F. Ocean age-gating via yield system hook.

---

### F-11: Fresh water flag absent from HexTile — MISSING

**Location:** `types/GameState.ts` (HexTile)
**GDD reference:** `systems/map-terrain.md` § "Fresh Water"
**Severity:** MED
**Effort:** S + M integration
**VII says:** `Tile.hasFreshWater` computed flag. Sources: adjacent navigable river, lake, minor river settlement, Gullfoss/Iguazu Falls. Founding on fresh water = +5 happiness; without = -5.
**Engine does:** `HexTile` no `hasFreshWater`. `citySystem` no fresh water check on FOUND_CITY. +5/-5 mechanic absent.
**Gap:** Key city placement differentiator absent.
**Recommendation:** Add `hasFreshWater: boolean` to `HexTile`. Compute at map-gen. Add +5/-5 happiness in FOUND_CITY.

---

### F-12: TerrainId is open string; WATER_TERRAINS is magic-string set — EXTRA

**Location:** `types/Terrain.ts:3`, `state/MapAnalytics.ts:15`
**GDD reference:** N/A (structural)
**Severity:** LOW
**Effort:** S
**VII says:** N/A.
**Engine does:** `TerrainId = string` (open alias). `WATER_TERRAINS = new Set(['ocean', 'coast', 'reef'])` — hardcoded. F-02, F-04, F-05 all require new terrain types (`navigableRiver`, `deepOcean`, `lake`). Each silently omitted from water queries unless set updated.
**Gap:** Maintenance trap.
**Recommendation:** Narrow `TerrainId` to literal union, or add comment flag.

---

## Extras to retire

- `TerrainId = string` open alias (F-12) — narrow to literal union.
- SNOW as standalone terrain (F-06) — fold into Tundra.

---

## Missing items

1. Biome+modifier compound model (F-01).
2. Navigable river + fresh water (F-02, F-11).
3. Distant Lands partition (F-04).
4. Natural wonders (F-07).
5. Deep Ocean + attrition (F-05).

---

## Quick wins (S effort, data-only)

- F-10: Correct terrain yields — single data change.
- F-08: Standardize defense format.
- F-06: +1 Science to JUNGLE.

---

## Mapping recommendation for GDD system doc

Paste into `.codex/gdd/systems/map-terrain.md` § "Mapping to hex-empires":

**Engine files:**
- `packages/engine/src/data/terrains/{base-terrains,features}.ts`
- `packages/engine/src/hex/TerrainCost.ts`
- `packages/engine/src/systems/{movementSystem,visibilitySystem}.ts`
- `packages/engine/src/state/{TileContents,MapAnalytics}.ts`
- `packages/engine/src/types/{GameState,Terrain}.ts`

**Status:** 0 MATCH / 3 CLOSE / 3 DIVERGED / 4 MISSING / 2 EXTRA

**Highest-severity finding:** F-01 (biome+modifier refactor), F-02 (navigable rivers), F-04 (Distant Lands) — three L-size structural rewrites that define VII's map system.

---

## Open questions

1. Biome refactor scope — full rewrite, or additive `biome`/`modifier` fields?
2. Natural wonder world-gen — deterministic or seeded-RNG placement?
3. LOS through mountains — verify VII behavior before implementing F-09.

---

## Effort estimate

| Bucket | Findings | Total |
|---|---|---|
| S | F-06, F-08, F-10, F-12 | 2d |
| M | F-03, F-05, F-07, F-09, F-11 | ~10d |
| L | F-01, F-02, F-04 | ~5w |
| **Total** | 12 | **~7w** |

Recommended order: F-10 (yield fix) → F-08 (defense standardize) → F-06 (jungle Science) → F-03 (binary movement) → F-11 (fresh water) → F-05 (ocean attrition) → F-07 (natural wonders) → F-02/F-04/F-01 (map overhaul cycle).

---

<!-- END OF AUDIT -->
