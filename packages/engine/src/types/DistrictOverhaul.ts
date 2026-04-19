/**
 * District Overhaul — parallel-namespace type definitions (Cycle A).
 *
 * Civ VII parity work-package introducing spatial rural/urban tile classification,
 * tile-level building placement (1–2 per urban tile), per-tile worker/specialist
 * assignment, and derived Quarter detection.
 *
 * These types are NOT yet wired into `GameState`. They live in a parallel namespace
 * (names ending in `V2` / prefixed `DistrictOverhaul`) so they cannot collide with
 * the existing `District.ts` model. Cycle B will add an optional
 * `spatial?: DistrictOverhaulStateV2` field to `GameState`; Cycle F will flip the
 * source of truth and drop the legacy flat-list representation.
 *
 * See `.claude/workflow/design/districts-overhaul.md` for the full 6-cycle plan.
 */

import type { HexCoord, HexKey } from './HexCoord';
import type { BuildingId, CityId } from './Ids';
import type { Age } from './GameState';

// ── Tile classification ─────────────────────────────────────────────────────

/**
 * Every tile within a settlement's territory is classified as either
 * worked terrain (`rural`) or built-up (`urban`). Tiles outside any
 * territory remain unclassified (represented as absence from the spatial maps).
 */
export type DistrictKindV2 = 'rural' | 'urban';

// ── Urban tiles ─────────────────────────────────────────────────────────────

/**
 * A single urban hex within a settlement. Hosts up to 2 buildings
 * (a full tile can form a Quarter) and may host one Specialist.
 *
 * Invariants enforced by `urbanBuildingSystem` (Cycle C):
 *  - `buildings.length <= 2`
 *  - All buildings on the tile must be either of the same Age or Ageless
 *    (Walls, Warehouse buildings, Wonders). Walls never count toward Quarter
 *    pairing but may co-exist on a tile.
 *  - `walled` is a derived convenience flag equal to `buildings` containing
 *    a Walls building; stored for fast combat/defense lookups.
 */
export interface UrbanTileV2 {
  readonly cityId: CityId;
  readonly coord: HexCoord;
  readonly buildings: ReadonlyArray<BuildingId>;
  /**
   * Number of specialists assigned to this urban tile (W3-02 spatial model).
   * Replaces the legacy `specialistAssigned: boolean`.
   * Default 0; max = `specialistCapPerTile`.
   */
  readonly specialistCount: number;
  /**
   * Maximum specialists this tile can host. Default 1 for regular urban tiles;
   * higher-tier districts may increase this cap.
   */
  readonly specialistCapPerTile: number;
  readonly walled: boolean;
}

// ── Rural tiles ─────────────────────────────────────────────────────────────

/**
 * A worked terrain hex within a settlement. Yields are a sum of:
 *  - terrain base yields (`TerrainDef.baseYields`)
 *  - improvement yields when `improvement` is non-null
 *  - adjacency contributions from neighbouring urban tiles / natural features
 *
 * A rural tile only produces its yields when `workerAssigned === true`.
 * Citizens not assigned to any rural tile become Specialists on urban tiles.
 *
 * `improvement` is typed as `string | null` because `ImprovementId` is not yet
 * declared in `Ids.ts` at Cycle A; Cycle B will tighten this once the engine
 * core has a canonical `ImprovementId` type (or we promote it here).
 */
export interface RuralTileV2 {
  readonly cityId: CityId;
  readonly coord: HexCoord;
  readonly improvement: string | null;
  readonly workerAssigned: boolean;
}

// ── Quarters ────────────────────────────────────────────────────────────────

/**
 * Kind of Quarter formed on an urban tile with 2 buildings.
 *  - `pure_age`      — both buildings share the same Age (the rulebook Quarter).
 *  - `unique_quarter`— civ-unique building pair matching the named Quarter catalog;
 *                      grants the QuarterDef.bonusEffect to the tile.
 *  - `ageless_pair`  — both buildings carry `isAgeless === true`; legal co-location
 *                      but no age-based Quarter bonus.
 */
export type QuarterKindV2 = 'pure_age' | 'unique_quarter' | 'ageless_pair';

/**
 * Derived descriptor for a 2-building urban tile. Quarters are recomputed at
 * end-of-turn by `urbanClassificationSystem` (Cycle E) rather than being placed
 * explicitly. `age === 'ageless'` means both buildings are ageless-class.
 *
 * `quarterId` is non-null only when `kind === 'unique_quarter'`, pointing to the
 * matching `QuarterDef.id` in `state.config.quarters`.
 */
export interface QuarterV2 {
  readonly cityId: CityId;
  readonly coord: HexCoord;
  readonly age: Age | 'ageless';
  readonly kind: QuarterKindV2;
  readonly buildingIds: ReadonlyArray<BuildingId>;
  readonly quarterId?: string | null;
}

// ── City-level spatial container ────────────────────────────────────────────

/**
 * Per-city spatial model: the tile grid of the settlement's territory, split
 * into urban and rural hexes, plus the currently-derived quarters.
 *
 * `urbanTileCap` tracks how many urban tiles the city may currently have given
 * its population and age. Exceeding the cap is forbidden — a new urban tile
 * requires either population growth or an age advance.
 *
 * Invariants (enforced across Cycles B–E):
 *  - No `HexKey` appears in both `urbanTiles` and `ruralTiles`.
 *  - `sum(rural.workerAssigned) + sum(urban.specialistAssigned) ===
 *     CityState.population`.
 *  - `quarters` is derived from `urbanTiles`; mutating `urbanTiles` invalidates
 *    `quarters` and the classification system must re-run.
 */
export interface CitySpatialV2 {
  readonly cityId: CityId;
  readonly urbanTiles: ReadonlyMap<HexKey, UrbanTileV2>;
  readonly ruralTiles: ReadonlyMap<HexKey, RuralTileV2>;
  readonly quarters: ReadonlyArray<QuarterV2>;
  readonly urbanTileCap: number;
}

// ── Top-level overhaul state ────────────────────────────────────────────────

/**
 * Top-level slot that will be wired into `GameState` as an optional field
 * `spatial?: DistrictOverhaulStateV2` in Cycle B. Keyed by `CityId`.
 *
 * Games saved before Cycle B deserialize with `spatial === undefined`, which
 * is a signal to systems to fall back to legacy flat-list behavior.
 */
export interface DistrictOverhaulStateV2 {
  readonly byCity: ReadonlyMap<CityId, CitySpatialV2>;
}

// ── Proposed GameAction shapes (declared, not yet wired) ────────────────────

/**
 * Urban-tile building placement. Replaces the existing `PLACE_BUILDING` action
 * at Cycle C. The `tile` must already be an urban hex in the city's spatial
 * map, and the pairing rules (§2 of the overhaul plan) must be satisfied.
 */
export interface PlaceUrbanBuildingActionV2 {
  readonly type: 'PLACE_URBAN_BUILDING';
  readonly cityId: CityId;
  readonly tile: HexCoord;
  readonly buildingId: BuildingId;
}

/**
 * Demolishes a specific building on an urban tile so that a replacement may
 * be placed. Required because urban tiles cap at 2 buildings and overbuild
 * in later ages is expected. No production refund (rulebook §8).
 */
export interface DemolishBuildingActionV2 {
  readonly type: 'DEMOLISH_BUILDING';
  readonly cityId: CityId;
  readonly tile: HexCoord;
  readonly buildingId: BuildingId;
}

/** Assign a citizen to work a specific rural tile. */
export interface AssignRuralWorkerActionV2 {
  readonly type: 'ASSIGN_RURAL_WORKER';
  readonly cityId: CityId;
  readonly tile: HexCoord;
}

/** Remove a citizen from a rural tile. Must respect population invariant. */
export interface UnassignRuralWorkerActionV2 {
  readonly type: 'UNASSIGN_RURAL_WORKER';
  readonly cityId: CityId;
  readonly tile: HexCoord;
}

/**
 * Assign a citizen as Specialist on a specific urban tile. Specialists cost
 * 2 Food + 2 Happiness and give +2 Science +2 Culture, plus +50% amplification
 * on the adjacency bonus of buildings on that tile.
 */
export interface AssignUrbanSpecialistActionV2 {
  readonly type: 'ASSIGN_URBAN_SPECIALIST';
  readonly cityId: CityId;
  readonly tile: HexCoord;
}

/** Remove a Specialist from an urban tile. */
export interface UnassignUrbanSpecialistActionV2 {
  readonly type: 'UNASSIGN_URBAN_SPECIALIST';
  readonly cityId: CityId;
  readonly tile: HexCoord;
}

/**
 * Discriminated union of all District-Overhaul actions. Cycle C will splice
 * these variants into the existing `GameAction` union in `GameState.ts`.
 */
export type DistrictOverhaulActionV2 =
  | PlaceUrbanBuildingActionV2
  | DemolishBuildingActionV2
  | AssignRuralWorkerActionV2
  | UnassignRuralWorkerActionV2
  | AssignUrbanSpecialistActionV2
  | UnassignUrbanSpecialistActionV2;
