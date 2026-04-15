# Districts & Quarters Overhaul — Implementation Plan

**Status:** Cycle A (types + plan only) — no behavior change yet
**Target rulebook sections:** 2 (Settlements), 2.3 (Town Specialization), 3 (Population), 3.4 (Quarters), 8 (Buildings)
**Gap-analysis tag:** "Districts & Quarters — SIMPLIFIED" in `gap-analysis-v3.md`

---

## 1. Why this overhaul

### 1.1 Current state (what we ship today)

- `CityState.buildings: ReadonlyArray<BuildingId>` — a flat, unordered list. A city just "has" a building; the tile it sits on is not modelled.
- `CityState.population: number` — a single integer. There is no concept of "citizen N is assigned to tile X".
- `HexTile` has no per-building field in this worktree; downstream work on `main` added `building: BuildingId | null` and `improvement: ImprovementId | null`, but spatial structure stops there.
- `districtSystem` / `DistrictSlot` (on `main`) models districts as a separate map with a single tile position and a buildings-in-district list, but buildings are **also** in the city's flat list — the two representations are not synchronized.
- There is no distinction between **urban** (buildings) and **rural** (worked terrain) tiles.
- Quarters do not exist at all. Adjacency bonuses exist only abstractly via `DistrictSlot.adjacencyBonus: number`.
- Town specialization is a flat tag on `CityState`, with no tile-level interpretation.

### 1.2 Gap vs rulebook

The rulebook requires:

- Every tile in a settlement's territory is classified as **rural** (worked by citizens, generates yields from terrain+improvements) or **urban** (hosts buildings, up to 2 per tile).
- Citizens are placed on rural tiles (giving terrain yields) or as specialists on urban tiles (+2 Sci, +2 Culture, -2 Food, -2 Happiness, +50% adjacency).
- Two qualifying buildings (same Age or Ageless, excluding Walls) on one urban tile form a **Quarter**, which boosts adjacency and is ideal for specialists.
- **Ageless** buildings (Walls, Warehouse buildings, wonders) do not count against same-age Quarter pairing rules.
- Town specialization interacts with rural tile yields (e.g. Farming Town = +1 Food on Farms in rural tiles).

### 1.3 What this overhaul delivers

A spatial, tile-addressed model for buildings, population, and districts inside a city — without breaking existing systems on the first day. Existing `buildings: ReadonlyArray<BuildingId>` stays live until Cycle F finally swaps it.

---

## 2. Civ VII rules recap

Paraphrased from `civ7-rulebook.md`:

### 2.1 Settlements (§2)
- Every settlement (town or city) has a **territory** of hexes around its center.
- Each territory hex is either **rural** or **urban**. City centers and founded plots start urban; newly claimed tiles start rural.
- Cities may host all building types; towns are restricted to Warehouse buildings (purchased with gold).

### 2.2 Population (§3, 3.3, 3.4)
- Population = citizens + specialists. Each citizen is assigned to either a rural tile (yields = terrain + improvement + adjacency) or an urban tile (as a specialist).
- A **Specialist** sits on an urban tile, costs 2 Food + 2 Happiness, gives +2 Science +2 Culture, and **amplifies the adjacency bonus of buildings on that tile by +50%**.
- Max 1 specialist per urban tile.
- When two qualifying buildings share an urban tile, they form a **Quarter**. Quarters stack for adjacency purposes and are the preferred specialist slot.

### 2.3 Buildings and Ageless (§8)
- Buildings carry an Age (Antiquity / Exploration / Modern). Quarters require two buildings of the same Age on one tile.
- **Ageless** buildings (Walls, Warehouse buildings, Wonders) don't count toward the same-age pairing for Quarters — they can co-exist on any urban tile without triggering or breaking a Quarter.
- Each urban tile caps at 2 buildings. Overbuild (replacing an obsolete older building) uses a `DEMOLISH_BUILDING` action.

### 2.4 Town specialization interacts with rural tiles (§2.3)
- Most specializations buff rural-tile yields (Farming, Mining, Fishing) or urban-tile behavior (Urban Center: +Sci/Culture on 2-building urban tiles = Quarters).
- Fort Town buffs Walls HP — a tile-level effect on urban tiles that hold a Walls building.

---

## 3. Proposed data model (new parallel namespace)

All new types live in `types/DistrictOverhaul.ts` with `*V2` / `DistrictOverhaul*` naming so they **do not collide** with the existing `District.ts` types. We will cross-wire at Cycle F.

### 3.1 DistrictKind

```ts
export type DistrictKindV2 = 'rural' | 'urban';
```

Every tile in a settlement's territory is classified as one of these two kinds. Tiles outside any territory are `null` (i.e. not a district).

### 3.2 UrbanTileV2

```ts
export interface UrbanTileV2 {
  readonly cityId: CityId;
  readonly coord: HexCoord;
  readonly buildings: ReadonlyArray<BuildingId>;   // 0..2 entries
  readonly specialistAssigned: boolean;
  readonly walled: boolean;                        // Walls building present (ageless)
}
```

Invariants (enforced by the urban-building system):
- `buildings.length <= 2`
- Buildings on the same tile must either be same-Age or Ageless.
- `walled` derives from `buildings` — stored for fast lookup.

### 3.3 RuralTileV2

```ts
export interface RuralTileV2 {
  readonly cityId: CityId;
  readonly coord: HexCoord;
  readonly improvement: ImprovementId | null;
  readonly workerAssigned: boolean;                // true = one citizen is working this tile
}
```

A rural tile's yield is (terrain base yield) + (improvement yield, if any) + (adjacent-district adjacency bonuses that apply to rural). Worker assignment gates whether the yield is actually collected.

### 3.4 QuarterV2

```ts
export type QuarterKindV2 = 'mixed_age' | 'pure_age' | 'walled_only';

export interface QuarterV2 {
  readonly cityId: CityId;
  readonly coord: HexCoord;
  readonly age: Age | 'ageless';                   // Age of the matching pair, or 'ageless' for pure-ageless pairs
  readonly kind: QuarterKindV2;                    // 'pure_age' triggers the full Quarter bonus
  readonly buildingIds: ReadonlyArray<BuildingId>; // the 2 buildings that form it
}
```

Quarters are **derived** from `UrbanTileV2` rows at end-of-turn; they are not placed directly. Storing them explicitly (instead of re-deriving each read) makes it cheap for the adjacency and specialist systems to consume.

### 3.5 CitySpatialV2

```ts
export interface CitySpatialV2 {
  readonly cityId: CityId;
  readonly urbanTiles: ReadonlyMap<HexKey, UrbanTileV2>;
  readonly ruralTiles: ReadonlyMap<HexKey, RuralTileV2>;
  readonly quarters: ReadonlyArray<QuarterV2>;
  readonly urbanTileCap: number;                   // how many urban tiles are allowed given current population
}
```

One `CitySpatialV2` per city. Stored at `GameState.spatial: ReadonlyMap<CityId, CitySpatialV2>` (added in Cycle B).

### 3.6 DistrictOverhaulState

```ts
export interface DistrictOverhaulStateV2 {
  readonly byCity: ReadonlyMap<CityId, CitySpatialV2>;
}
```

This is the single top-level slot that will be wired into `GameState` in Cycle B as a **nullable** field (`spatial?: DistrictOverhaulStateV2`). Old states deserialize with `spatial: undefined`; new games populate it. Systems ignore missing data.

### 3.7 Mapping to existing types

| Existing field | Relationship to new model |
|---|---|
| `CityState.buildings: ReadonlyArray<BuildingId>` | Computed view — union of all `UrbanTileV2.buildings` once Cycle F lands. Keeps existing systems working unchanged during A–E. |
| `HexTile.building: BuildingId \| null` (on main) | Becomes a **legacy cache** synced from `UrbanTileV2.buildings[0]`. Rendering may keep reading it for now. |
| `DistrictSlot` (on main) | Subsumed by `CitySpatialV2.urbanTiles`. `DistrictSlot.type` becomes an emergent categorization derived from the buildings on the tile. Old `DistrictSlot` rows get migrated in Cycle F (or dropped for v2 games). |
| `CityState.specialists: number` | Computed view — `count(urbanTile.specialistAssigned === true)`. |
| `CityState.population` | Kept authoritative. Sum of `rural workerAssigned` + `urban specialistAssigned` must equal population. |
| `CityState.specialization: TownSpecialization \| null` | Unchanged. Its effects are re-interpreted per rural/urban: e.g. Farming Town now buffs `RuralTileV2.improvement === 'farm'` specifically. |

---

## 4. Proposed GameAction additions

Added to the `GameAction` discriminated union in Cycle C+. This cycle only declares the **shapes** in the types file so consumers can stub handlers.

```ts
| { readonly type: 'PLACE_URBAN_BUILDING'; readonly cityId: CityId; readonly tile: HexCoord; readonly buildingId: BuildingId }
| { readonly type: 'DEMOLISH_BUILDING';    readonly cityId: CityId; readonly tile: HexCoord; readonly buildingId: BuildingId }
| { readonly type: 'ASSIGN_RURAL_WORKER';  readonly cityId: CityId; readonly tile: HexCoord }
| { readonly type: 'UNASSIGN_RURAL_WORKER';readonly cityId: CityId; readonly tile: HexCoord }
| { readonly type: 'ASSIGN_URBAN_SPECIALIST';   readonly cityId: CityId; readonly tile: HexCoord }
| { readonly type: 'UNASSIGN_URBAN_SPECIALIST'; readonly cityId: CityId; readonly tile: HexCoord }
```

Rationale for each:

- **PLACE_URBAN_BUILDING** — replaces the existing `PLACE_BUILDING` once wired. Validates tile is urban, tile has <2 buildings, same-Age (or Ageless) pairing is respected, and the building has been produced.
- **DEMOLISH_BUILDING** — required because tiles cap at 2. Overbuild in late game means removing an obsolete earlier-age building. Refunds 0 (rulebook says no refund for demolition).
- **ASSIGN_RURAL_WORKER / UNASSIGN_RURAL_WORKER** — explicit tile-level citizen assignment, replacing the current "population is a single integer" abstraction.
- **ASSIGN_URBAN_SPECIALIST / UNASSIGN_URBAN_SPECIALIST** — explicit tile-level specialist placement, replacing the current bulk `specialists: number` counter.

These actions declare **intent**; the urban-building / rural-population / specialist systems in Cycle C/D perform validation and state mutation.

---

## 5. System changes

### 5.1 `buildingPlacementSystem` → `urbanBuildingSystem`

Renamed to make scope clear. Responsibilities:

- Process `PLACE_URBAN_BUILDING`, `DEMOLISH_BUILDING`.
- Validate target tile is in `CitySpatialV2.urbanTiles`.
- Validate `urbanTile.buildings.length < 2` before placement.
- Validate same-Age (or Ageless) constraint between existing and new buildings on the tile.
- On placement: update `UrbanTileV2.buildings`, mirror to legacy `CityState.buildings` and `HexTile.building` for compatibility, emit `production` log line.
- On demolition: drop the building, keep the pair-intact invariant.

### 5.2 New `ruralPopulationSystem`

Responsibilities:

- Process `ASSIGN_RURAL_WORKER`, `UNASSIGN_RURAL_WORKER`, `ASSIGN_URBAN_SPECIALIST`, `UNASSIGN_URBAN_SPECIALIST`.
- Enforce the invariant `sum(workers) + sum(specialists) === CityState.population`.
- Reject over-assignment and under-assignment (a turn-end autoplacement step re-balances if the player hasn't manually assigned).
- Autoplacement heuristic: (1) fill rural tiles with improved resources first, (2) then rural tiles with highest food/production, (3) specialists on urban tiles with 2 same-Age buildings (Quarters).

### 5.3 `districtSystem` rewritten as `urbanClassificationSystem`

Responsibilities:

- When a tile enters a city's territory, classify it as rural by default.
- Track transitions `rural → urban` (triggered the first time a building is placed on a rural tile) and `urban → rural` is forbidden.
- Maintain `urbanTileCap` (rule of thumb: 1 urban tile per 2 population, capped by Age).
- Derive `QuarterV2` rows at end-of-turn from the current `UrbanTileV2` buildings. Quarter detection is pure and cheap: for each urban tile with 2 buildings, look up both `BuildingDef.age` and decide `pure_age` / `mixed_age` / `walled_only`.

### 5.4 Adjacency recompute

Adjacency bonuses (currently on `DistrictSlot.adjacencyBonus: number`) become a derived property on `UrbanTileV2`:

- Adjacency contributors: adjacent urban tiles (per-building adjacency rules), adjacent natural features (rivers, mountains), adjacent resources.
- Specialists amplify by +50% (rulebook §3.3).
- Walked as a pure function from `CitySpatialV2` — no hidden state.

### 5.5 Other systems that read `city.buildings`

`resourceSystem`, `growthSystem`, `productionSystem`, `researchSystem`, `crisisSystem`, several victory checks — they iterate `city.buildings`. **None of them need to change during Cycles A–E** because `CityState.buildings` stays populated (synced from `UrbanTileV2.buildings`). Cycle F flips the source of truth.

---

## 6. Migration plan

### 6.1 Scope of compatibility

- **In-flight saves (v1 format)**: no attempt to back-fill `CitySpatialV2`. On load we detect `spatial === undefined` and the game runs in legacy mode (old behavior, flat buildings list). No quarters detected, no tile-level specialists, no rural worker UI.
- **New games (v2 format)**: always populate `CitySpatialV2`. City founding in Cycle B initializes it.
- **Age transitions** are safe: `UrbanTileV2.buildings` carries Age metadata inherited from `BuildingDef.age`, and the Quarter classifier re-runs each turn — no migration at age boundaries.
- The `SaveLoad` module gains a `version: 2` field. Version 1 saves deserialize with `spatial: undefined`; version 2 saves include full `CitySpatialV2` data.

### 6.2 Systems-level migration

Done progressively per cycle. No "big bang" cutover. Each cycle ships in isolation and passes its own tests.

### 6.3 Existing `DistrictSlot` rows

Stale on v2. Cycle F deletes the `districts` map from `GameState` and drops `DistrictSlot` / `DistrictDef` types entirely, replacing reads in the web layer with `CitySpatialV2.urbanTiles` iteration.

---

## 7. UI implications (out of scope for implementation, listed for scoping)

1. **City panel** — needs a tile-grid view of the settlement's territory, showing rural vs urban classification, improvements on rural tiles, building stacks on urban tiles, worker/specialist assignment.
2. **Canvas renderer** — urban tiles need a visually distinct base (e.g. paved overlay) and render 1–2 building icons stacked. Rural tiles render the improvement icon as today.
3. **Quarter highlight** — tiles matching `kind: 'pure_age'` get a glow or badge.
4. **Specialist assignment** — drag-to-assign or click-cycle on urban tiles. Rural worker assignment via clicking the rural tile in the city panel.
5. **Demolish flow** — confirmation dialog when an urban tile is full and the player wants to replace.
6. **Tooltip** — on hover of any territory tile, show its kind, buildings, improvement, worker status, yields breakdown (base + improvement + adjacency).
7. **Age transition panel** — warn when a settlement has ageless-only urban tiles with no age buildings queued (potential wasted quarter slots).

UI cycles are deferred until after engine Cycle E lands.

---

## 8. Implementation cycles

Six sub-cycles, each independently shippable. Each cycle adds tests at the appropriate layer.

### Cycle A — Type scaffolding (DONE THIS CYCLE)
- Add `types/DistrictOverhaul.ts` with all V2 types from §3–§4.
- Compile-time type tests in `state/__tests__/DistrictOverhaul.types.test.ts`.
- No wiring into `GameState`, no barrel export. Parallel namespace only.
- Exit: `npm run build` + `npm run test:engine` green.

### Cycle B — Wire spatial state into GameState
- Add `spatial?: DistrictOverhaulStateV2` to `GameState` as an **optional** field (so existing tests don't break).
- Bump save version to 2. Serializer writes the new field when present; deserializer tolerates absence.
- `citySystem` populates an empty `CitySpatialV2` on `FOUND_CITY`: center tile becomes the first urban tile; remaining territory tiles go rural.
- Tests: L1 (`citySystem` creates spatial entry), L4 (SaveLoad round-trip preserves spatial data).

### Cycle C — PLACE_URBAN_BUILDING + DEMOLISH_BUILDING
- Rename `buildingPlacementSystem` → `urbanBuildingSystem`. Keep the old export name re-exported for one cycle to avoid churn in imports.
- Add the two actions to `GameAction` discriminated union.
- Implement validation: tile exists in `CitySpatialV2.urbanTiles`, `buildings.length < 2`, same-Age or Ageless pairing, building has been produced.
- Sync `UrbanTileV2.buildings` ↔ `CityState.buildings` ↔ `HexTile.building` (dual-write).
- Tests: L1 for each validation branch, L2 for end-to-end production → placement.

### Cycle D — Rural workers + urban specialists (per-tile)
- Add `ruralPopulationSystem` handling the four assignment actions.
- Enforce the `workers + specialists === population` invariant.
- Autoplacement on `END_TURN` (deterministic heuristic, seeded if any ties).
- `resourceSystem` reads from per-tile assignment if `spatial` exists, falls back to old flat `specialists: number` logic otherwise.
- Tests: L1 for each assignment action, L2 for yield recomputation after assignment, L4 for autoplacement determinism.

### Cycle E — Adjacency bonuses + Quarter detection
- Pure helper `classifyQuarters(city: CitySpatialV2, config: GameConfig): ReadonlyArray<QuarterV2>`.
- Run classification at end-of-turn and write `CitySpatialV2.quarters`.
- Adjacency helper `computeAdjacency(urbanTile, city, map, config): YieldSet` including +50% specialist amplification.
- `resourceSystem` consumes the per-tile adjacency yields.
- Tests: L1 for quarter classification on contrived fixtures (pure age, mixed age, ageless-only, walls-only), L1 for adjacency math with/without specialists.

### Cycle F — Flip source of truth, drop legacy
- `CityState.buildings` becomes a getter/view derived from `urbanTiles`. For safety, keep as an explicit synced array until all call sites are updated.
- Remove `CityState.specialists` counter; callers read `sum(urbanTiles | specialistAssigned)`.
- Delete old `types/District.ts`, `systems/districtSystem.ts`, `data/districts/*` — subsumed.
- `HexTile.building` demoted to a render-only hint (or deleted if renderer can iterate spatial).
- Tests: sweep the test suite ensuring no system reads removed fields. Run full integration smoke.

---

## 9. Out of scope for this overhaul

Explicit non-goals to prevent scope creep:

1. **UI / canvas work** — city-panel grid, quarter highlights, drag-to-assign. All deferred to a separate UI overhaul.
2. **Animations** — no new animations for building placement or quarter formation.
3. **Save migration for v1 saves** — v1 saves load in legacy-compat mode, no auto-upgrade to v2 spatial format.
4. **Multiplayer sync** — no multiplayer exists yet; state-shape compatibility for a future multiplayer is not considered here.
5. **New building data** — the C1–C3 missing-buildings work in `gap-analysis-v3.md` is a separate track. This overhaul only restructures how existing buildings are placed.
6. **Specialist amplification balance tuning** — the +50% number comes straight from the rulebook; no tuning until Cycle E ships.
7. **Town → City upgrade effects on urban tiles** — the existing flag `settlementType: 'town' | 'city'` already gates build queues; no spatial re-layout on upgrade.
8. **Governor interactions with quarters** — governors on `main` don't ship in this worktree yet; their quarter-buff abilities are a separate follow-up.
9. **AI heuristics for urban placement** — stub `aiSystem` logic lands in Cycle C with a "place Granary on the nearest urban tile with no Granary" baseline; deep AI tuning is post-F.
10. **Wonders** — wonders are ageless but have unique placement rules (§8). Cycle E treats them as Ageless but does not implement their per-wonder constraints; a follow-up pass will.

---

## 10. Risks and open questions

| Risk | Mitigation |
|------|-----------|
| Dual-write `UrbanTileV2.buildings` ↔ `CityState.buildings` drifts | Add a Layer-4 test that asserts consistency at the end of every turn of a seeded scenario. |
| Population invariant breaks when a citizen can't be placed (e.g. all tiles assigned) | Autoplacement step in `END_TURN` forces correctness; stuck citizens become specialists on the lowest-adjacency urban tile. |
| `CityState.population` grows faster than `urbanTileCap` | Growth is capped; the cap grows with population and age per §3.3. |
| Quarter detection depends on `BuildingDef.age` — buildings without `age` crash | Fall back to `'ageless'` for any building missing age metadata; log a warning once per session. |
| Save version 2 not backward-compatible | `SaveLoad.deserialize` inspects version field; version-1 saves run in compat mode until the user re-founds cities. |

---

## Appendix A — Cycle-by-cycle test matrix

| Cycle | L1 | L2 | L4 |
|-------|----|----|----|
| A | Type-shape compile tests | — | — |
| B | `citySystem` creates empty spatial | `FOUND_CITY` → spatial entry present | SaveLoad v2 round-trip |
| C | Each urban-building validation branch | Produce → place cycle | — |
| D | Each assign/unassign action | Yield diff on assignment | Autoplacement determinism |
| E | Quarter classifier fixtures | Adjacency yield end-to-end | — |
| F | Legacy-field removal sweep | Full integration smoke | Save compat final |

---

## Appendix B — File touch list (projected)

```
packages/engine/src/
  types/
    DistrictOverhaul.ts                            [Cycle A]  new
    GameState.ts                                   [Cycle B]  add spatial?: DistrictOverhaulStateV2
    index.ts                                       [Cycle B]  export new types
  state/
    __tests__/DistrictOverhaul.types.test.ts       [Cycle A]  new
    SaveLoad.ts                                    [Cycle B]  version bump, spatial serialization
  systems/
    citySystem.ts                                  [Cycle B]  initialize CitySpatialV2 on FOUND_CITY
    urbanBuildingSystem.ts                         [Cycle C]  new (renamed from buildingPlacementSystem)
    ruralPopulationSystem.ts                       [Cycle D]  new
    urbanClassificationSystem.ts                   [Cycle E]  new (renamed from districtSystem)
    resourceSystem.ts                              [Cycle D,E] read spatial for specialists + adjacency
  systems/__tests__/
    urbanBuildingSystem.test.ts                    [Cycle C]
    ruralPopulationSystem.test.ts                  [Cycle D]
    urbanClassificationSystem.test.ts              [Cycle E]
```

---

## Appendix C — Worked example: a 6-turn Antiquity city

To make the data model concrete, trace a single settlement through six turns.

**Turn 1 — Founding.** Settler founds `Rome` on hex `(0,0)`. `citySystem` creates
a `CityState` with population 1 and a territory of the 6 neighbouring hexes plus
the center. `urbanClassificationSystem` (Cycle E) marks `(0,0)` as the sole
urban tile (`UrbanTileV2 { coord: (0,0), buildings: [], ... }`) and the 6
neighbours as rural. `urbanTileCap` = 1 at population 1. One citizen auto-
assigns to the highest-yield rural hex.

**Turn 3 — Growth to population 2.** `growthSystem` ticks population. The extra
citizen auto-assigns to the next-best rural hex. Still 1 urban tile, 2 rural
workers, 0 specialists. `urbanTileCap` bumps to 1 (still: cap = `floor(pop/2)`,
minimum 1).

**Turn 5 — Build Granary.** `productionSystem` finishes `granary`. Player
issues `PLACE_URBAN_BUILDING { cityId: 'rome', tile: (0,0), buildingId: 'granary' }`.
`urbanBuildingSystem` validates: `(0,0)` is urban, has 0 buildings, Granary's
Age is Antiquity. Placement succeeds. `UrbanTileV2.buildings` becomes
`['granary']`. Legacy `CityState.buildings` also contains `'granary'` (dual
write). No Quarter yet (need 2 buildings).

**Turn 7 — Build Library, urban tile cap increases.** Population reaches 3.
`urbanTileCap` = 1 (still — cap formula scales slowly in Antiquity). Library
finishes. Player places Library on `(0,0)`. `urbanBuildingSystem`:
`buildings.length === 1 < 2` ✓; pair-check: both Antiquity ✓; placement
succeeds. `UrbanTileV2.buildings = ['granary', 'library']`. At end-of-turn,
`urbanClassificationSystem` runs `classifyQuarters` and emits
`QuarterV2 { kind: 'pure_age', age: 'antiquity', buildingIds: ['granary','library'] }`.

**Turn 8 — Specialist assignment.** Player issues
`ASSIGN_URBAN_SPECIALIST { cityId: 'rome', tile: (0,0) }`. `ruralPopulationSystem`
validates: population 3, current assignments 3 rural + 0 specialist. Over-
commits? No — we first `UNASSIGN_RURAL_WORKER` the lowest-yield rural hex,
then apply the specialist. Net: 2 rural + 1 specialist = 3 ✓.
`resourceSystem` picks up the new `specialistAssigned: true` on `(0,0)` and:
- Subtracts 2 Food, 2 Happiness.
- Adds +2 Science, +2 Culture.
- Amplifies the adjacency bonuses of Granary and Library by +50%.

**Turn 10 — Walls ageless placement.** Walls building finishes. Player places
Walls on `(1,0)` (a rural tile). `urbanClassificationSystem` transitions
`(1,0)` from rural to urban (first building lands there). `buildings = ['walls']`.
Note: Walls is Ageless; even if a player later adds an Antiquity Library on
`(1,0)`, the Quarter kind becomes `walled_only` not `pure_age` — Walls never
count toward a pure-age Quarter per rulebook §8.

This example demonstrates: tile classification, dual-write invariant, quarter
derivation, specialist amplification, ageless handling, and auto-rebalance on
assignment.

---

## Appendix D — Interactions with other pending Civ VII work

`gap-analysis-v3.md` lists several adjacent parity tracks. District Overhaul
intersects with them as follows:

| Track | Relationship | Action |
|-------|-------------|--------|
| Adjacency bonus system | Supersedes it. The adjacency computation in Cycle E is the replacement implementation. | Close the adjacency track after Cycle E ships. |
| Per-tile specialist slots | Entirely subsumed by Cycle D. | Close that track after Cycle D ships. |
| Commander system | Orthogonal — commanders are unit-scoped, not tile-scoped. | No interaction. |
| Government & Social Policies | Celebration bonuses may affect urban/rural yields; read-only interaction. | Government system consumes `CitySpatialV2` but does not modify it. |
| Religion & Pantheons | Pantheons may buff specific rural improvements (Goddess of Harvest → Farms). | Rural yield computation in Cycle D must be extensible for pantheon effects. |

The overhaul intentionally goes first among these tracks: spatial tile data is
the common substrate that adjacency, specialists, and (eventually) religion-
on-tiles all depend on. Going spatial-first lets later tracks sit cleanly on
top without a second refactor.

---

## Appendix E — Design decisions log

Rationale for non-obvious choices, to head off "why didn't we …?" reviews.

1. **Why parallel-namespace `*V2` types instead of replacing `District.ts` now?**
   The existing `districtSystem` on `main` is active in ~12 call sites plus
   renderer. A big-bang replacement would couple this cycle to 12 unrelated
   edits. Parallel namespace lets Cycle A land as pure scaffolding and lets
   Cycle B–E each ship independently with their own tests.

2. **Why store `quarters` as an explicit array instead of deriving on read?**
   Adjacency math consumes quarter data on every yield recompute (every turn
   end, every placement). Storing the derived list once per turn-end avoids
   recomputing per-read. The list is still semantically derived — Cycle E
   includes a test that `classifyQuarters(spatial.urbanTiles) === spatial.quarters`.

3. **Why `improvement: string | null` instead of an `ImprovementId` brand?**
   `Ids.ts` in this worktree does not yet declare `ImprovementId`. Rather than
   add an unused brand in Cycle A (which would be a second unrelated change),
   we start with `string` and tighten at Cycle B when `Ids.ts` grows the brand.

4. **Why `walled: boolean` on `UrbanTileV2` when it's derivable from `buildings`?**
   Combat resolution asks "does this tile have walls?" dozens of times per
   attack animation. Caching the boolean avoids a linear scan of `buildings`
   per query. The flag is written atomically alongside `buildings`, so drift
   cannot occur within a single `urbanBuildingSystem` invocation.

5. **Why not merge `UrbanTileV2` and `RuralTileV2` into a single discriminated
   union?** They genuinely have disjoint fields (`buildings` vs `improvement`)
   and genuinely live in disjoint maps (urban-tile iteration never touches
   rural, and vice versa). A union would force every consumer to narrow, for
   no gain.

6. **Why `Age | 'ageless'` instead of extending `Age` to include `'ageless'`?**
   `Age` is a core type used by 60+ call sites (tech trees, civ definitions,
   age transitions). Extending it would force every switch/match to handle
   `'ageless'` as a noop, which is noise. Keeping the ageless flag local to
   `QuarterV2.age` isolates the concept.

7. **Why `urbanTileCap: number` instead of a formula?** The formula has three
   inputs (population, age, specializations) and may grow more. Keeping it as
   a materialised field means the cap is visible in the UI without re-running
   the formula, and means test fixtures can set arbitrary caps without mocking
   the formula.

---

**End of plan.** Cycle A ships with this document + `types/DistrictOverhaul.ts` + the compile-time test file.
