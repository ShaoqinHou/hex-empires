import type { GameState, CityState, HexTile } from '../types/GameState';
import type { HexCoord, HexKey } from '../types/HexCoord';
import type { YieldSet } from '../types/Yields';
import type { BuildingId } from '../types/Ids';
import type { UrbanTileV2 } from '../types/DistrictOverhaul';
import { EMPTY_YIELDS, addYields } from '../types/Yields';
import { neighbors, coordToKey } from '../hex/HexMath';

/**
 * Pure adjacency + Quarter yield helpers for the Districts Overhaul (Cycle D).
 *
 * These functions compute the Civ VII-style adjacency bonuses that an urban
 * building earns from its six neighbouring hexes and the +50% Quarter
 * amplification (rulebook §3.4). None of the results are plumbed into the
 * main yield pipeline yet — `YieldCalculator.ts` is untouched by this cycle.
 * Cycle E will wire these helpers into the spatial yield path.
 *
 * Simplified ruleset (expanded in later cycles):
 *   +1 Production per adjacent Mountain tile
 *   +1 Science    per adjacent Campus-class urban tile (science category)
 *   +1 Culture    per adjacent Theater-class urban tile (culture category)
 *   +1 Gold       per adjacent Commercial-class urban tile (gold category)
 *   +1 Food       per adjacent river tile
 *
 * "Adjacent building X" resolves by looking up each urban-neighbour's
 * `buildings` against the `GameState.config.buildings` registry and matching
 * on `BuildingDef.category` (science / culture / gold), or by the fixed
 * building ids `campus` / `theater` / `commercial` when present.
 *
 * All functions are pure — no state mutation, no RNG, no I/O.
 */

// ── Category helpers ───────────────────────────────────────────────────────

/**
 * Does the given building id qualify as a Campus (science-class)?
 * Matches either the literal id `'campus'` or any building whose
 * `BuildingDef.category === 'science'` in the config registry.
 */
function isCampusBuilding(state: GameState, buildingId: BuildingId): boolean {
  if (buildingId === 'campus') return true;
  const def = state.config.buildings.get(buildingId);
  return def?.category === 'science';
}

/**
 * Does the given building id qualify as a Theater (culture-class)?
 */
function isTheaterBuilding(state: GameState, buildingId: BuildingId): boolean {
  if (buildingId === 'theater') return true;
  const def = state.config.buildings.get(buildingId);
  return def?.category === 'culture';
}

/**
 * Does the given building id qualify as a Commercial (gold-class)?
 */
function isCommercialBuilding(state: GameState, buildingId: BuildingId): boolean {
  if (buildingId === 'commercial' || buildingId === 'commercial_hub') return true;
  const def = state.config.buildings.get(buildingId);
  return def?.category === 'gold';
}

/**
 * Does any building on the given urban tile satisfy the predicate?
 * Returns false for an empty tile.
 */
function tileHasBuilding(
  tile: UrbanTileV2,
  predicate: (id: BuildingId) => boolean,
): boolean {
  for (const id of tile.buildings) {
    if (predicate(id)) return true;
  }
  return false;
}

// ── Neighbour lookup ───────────────────────────────────────────────────────

/**
 * Return the HexTile at `coord` from `state.map`, or undefined if that hex is
 * outside the map bounds. Uses `coordToKey` for the map lookup.
 */
function tileAt(state: GameState, coord: HexCoord): HexTile | undefined {
  return state.map.tiles.get(coordToKey(coord));
}

/**
 * Return the UrbanTileV2 at `coord` within this city, or undefined if the
 * coord is not a populated urban hex in the city.
 */
function urbanTileAt(city: CityState, coord: HexCoord): UrbanTileV2 | undefined {
  const urban = city.urbanTiles;
  if (urban === undefined) return undefined;
  return urban.get(coordToKey(coord));
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Compute the adjacency yields a building placed on `tile` in `city` would
 * earn from its six neighbouring hexes. Does NOT include the base yields of
 * the building itself, and does NOT apply the Quarter amplification.
 *
 * If `tile` is outside the map, all six rules simply yield zero contributions
 * because their predicate lookups return undefined.
 */
export function computeAdjacencyBonus(
  city: CityState,
  tile: HexCoord,
  state: GameState,
): YieldSet {
  let bonus: YieldSet = EMPTY_YIELDS;

  for (const neighbourCoord of neighbors(tile)) {
    const terrainTile = tileAt(state, neighbourCoord);

    // +1 Production per adjacent Mountain terrain tile
    if (terrainTile !== undefined && terrainTile.terrain === 'mountains') {
      bonus = addYields(bonus, { production: 1 });
    }

    // +1 Food per adjacent river tile (any tile whose river edges list
    // is non-empty is considered a river tile for adjacency purposes).
    if (terrainTile !== undefined && terrainTile.river.length > 0) {
      bonus = addYields(bonus, { food: 1 });
    }

    // Same-city urban-neighbour rules: campus/theater/commercial.
    const neighbourUrban = urbanTileAt(city, neighbourCoord);
    if (neighbourUrban !== undefined) {
      if (tileHasBuilding(neighbourUrban, (id) => isCampusBuilding(state, id))) {
        bonus = addYields(bonus, { science: 1 });
      }
      if (tileHasBuilding(neighbourUrban, (id) => isTheaterBuilding(state, id))) {
        bonus = addYields(bonus, { culture: 1 });
      }
      if (tileHasBuilding(neighbourUrban, (id) => isCommercialBuilding(state, id))) {
        bonus = addYields(bonus, { gold: 1 });
      }
    }
  }

  return bonus;
}

/**
 * Sum the adjacency bonus across every populated urban tile in the city.
 * A city with no spatial data (`urbanTiles === undefined`) or an empty urban
 * map returns `EMPTY_YIELDS`. Each tile is evaluated independently.
 */
export function totalAdjacencyYieldsForCity(
  city: CityState,
  state: GameState,
): YieldSet {
  const urban = city.urbanTiles;
  if (urban === undefined || urban.size === 0) return EMPTY_YIELDS;

  let total: YieldSet = EMPTY_YIELDS;
  for (const urbanTile of urban.values()) {
    const tileBonus = computeAdjacencyBonus(city, urbanTile.coord, state);
    total = addYields(total, tileBonus);
  }
  return total;
}

/**
 * Return the EXTRA yield attributable to Quarter amplification (not the base
 * adjacency, which is already returned by `totalAdjacencyYieldsForCity`).
 *
 * Per rulebook §3.4, each Quarter amplifies its tile's adjacency by +50%.
 * Concretely: for every QuarterV2 in the city, add `base × 0.5` where `base`
 * is the adjacency computed for that Quarter's tile.
 *
 * Returns `EMPTY_YIELDS` when the city has no quarters.
 */
export function quarterBonus(city: CityState, state: GameState): YieldSet {
  const quarters = city.quarters;
  if (quarters === undefined || quarters.length === 0) return EMPTY_YIELDS;

  let extra: YieldSet = EMPTY_YIELDS;
  for (const quarter of quarters) {
    const base = computeAdjacencyBonus(city, quarter.coord, state);
    extra = addYields(extra, {
      food: base.food * 0.5,
      production: base.production * 0.5,
      gold: base.gold * 0.5,
      science: base.science * 0.5,
      culture: base.culture * 0.5,
      faith: base.faith * 0.5,
      influence: base.influence * 0.5,
      housing: base.housing * 0.5,
      diplomacy: base.diplomacy * 0.5,
    });
  }
  return extra;
}
