import type { GameState, CityState, HexTile } from '../types/GameState';
import type { HexCoord, HexKey } from '../types/HexCoord';
import type { YieldSet } from '../types/Yields';
import type { BuildingId } from '../types/Ids';
import type { UrbanTileV2 } from '../types/DistrictOverhaul';
import { EMPTY_YIELDS, addYields } from '../types/Yields';
import { neighbors, coordToKey } from '../hex/HexMath';
import { SPECIALIST_AMPLIFIER, WONDER_ADJACENCY_PER_NEIGHBOR } from './AdjacencyConstants';

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
 *
 * F-02: Skips buildings whose age does not match the current game age and
 * are not marked ageless — non-ageless old-age buildings lose adjacency
 * contribution (they keep base yields only, handled in YieldCalculator).
 */
function tileHasBuilding(
  tile: UrbanTileV2,
  predicate: (id: BuildingId) => boolean,
  state?: GameState,
): boolean {
  for (const id of tile.buildings) {
    // F-02: non-ageless old-age buildings contribute only base yields
    if (state) {
      const buildingDef = state.config.buildings.get(id);
      if (buildingDef && buildingDef.age !== state.age.currentAge && !buildingDef.isAgeless) {
        continue;
      }
    }
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
 * W3-02: If the urban tile at `tile` has one or more specialists assigned,
 * the adjacency bonus is amplified by `(1 + SPECIALIST_AMPLIFIER * specialistCount)`.
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
      if (tileHasBuilding(neighbourUrban, (id) => isCampusBuilding(state, id), state)) {
        bonus = addYields(bonus, { science: 1 });
      }
      if (tileHasBuilding(neighbourUrban, (id) => isTheaterBuilding(state, id), state)) {
        bonus = addYields(bonus, { culture: 1 });
      }
      if (tileHasBuilding(neighbourUrban, (id) => isCommercialBuilding(state, id), state)) {
        bonus = addYields(bonus, { gold: 1 });
      }
      // F-06: Wonder adjacency — +2 culture, +1 science per neighbor urban tile with a wonder
      for (const bid of neighbourUrban.buildings) {
        const bDef = state.config.buildings.get(bid);
        if (bDef?.isWonder) {
          bonus = addYields(bonus, WONDER_ADJACENCY_PER_NEIGHBOR);
          break; // one wonder adjacency per neighbor tile
        }
      }
    }
  }

  // W3-02: Specialist amplification — if specialists are assigned to this
  // urban tile, multiply the base adjacency by (1 + SPECIALIST_AMPLIFIER * count).
  const tileKey = coordToKey(tile);
  const urbanTile = city.urbanTiles?.get(tileKey as HexKey);
  const specialistCount = urbanTile?.specialistCount ?? 0;
  if (specialistCount > 0) {
    const multiplier = 1 + SPECIALIST_AMPLIFIER * specialistCount;
    bonus = {
      food: bonus.food * multiplier,
      production: bonus.production * multiplier,
      gold: bonus.gold * multiplier,
      science: bonus.science * multiplier,
      culture: bonus.culture * multiplier,
      faith: bonus.faith * multiplier,
      influence: bonus.influence * multiplier,
      happiness: bonus.happiness * multiplier,
    };
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
 * W3-02 (F-05 fix): Quarter amplification fires ONLY when the tile has at
 * least one specialist assigned. A Quarter without a specialist earns zero
 * bonus beyond base adjacency. This matches the Civ VII rulebook requirement
 * that the specialist is the "activator" of the Quarter bonus.
 *
 * Returns `EMPTY_YIELDS` when the city has no quarters.
 */
export function quarterBonus(city: CityState, state: GameState): YieldSet {
  const quarters = city.quarters;
  if (quarters === undefined || quarters.length === 0) return EMPTY_YIELDS;

  let extra: YieldSet = EMPTY_YIELDS;
  for (const quarter of quarters) {
    // W3-02 guard: no specialist on this tile → no Quarter amplification.
    const tileKey = coordToKey(quarter.coord);
    const urbanTile = city.urbanTiles?.get(tileKey as HexKey);
    const specialistCount = urbanTile?.specialistCount ?? 0;
    if (specialistCount === 0) continue;

    // NOTE: `computeAdjacencyBonus` already applies the specialist multiplier
    // for the tile. Quarter bonus is an ADDITIONAL +50% on top of BASE adjacency,
    // so we compute base without the specialist factor by temporarily checking
    // the raw neighbor yields. To avoid double-amplification, we compute the
    // base adjacency at specialistCount = 0 and then apply the quarter +0.5x.
    // Implementation: call computeAdjacencyBonus on a synthetic city where this
    // tile has specialistCount = 0 — but that is complex. Per the brief's spec,
    // the quarter extra is simply `baseAdjacency * 0.5` where baseAdjacency
    // EXCLUDES specialist amplification. We compute it directly from neighbors.
    const baseNoSpecialist = computeBaseAdjacencyWithoutSpecialist(city, quarter.coord, state);
    extra = addYields(extra, {
      food: baseNoSpecialist.food * 0.5,
      production: baseNoSpecialist.production * 0.5,
      gold: baseNoSpecialist.gold * 0.5,
      science: baseNoSpecialist.science * 0.5,
      culture: baseNoSpecialist.culture * 0.5,
      faith: baseNoSpecialist.faith * 0.5,
      influence: baseNoSpecialist.influence * 0.5,
      happiness: baseNoSpecialist.happiness * 0.5,
    });
  }
  return extra;
}

/**
 * Compute raw adjacency bonus for a tile WITHOUT the specialist amplification.
 * Used by `quarterBonus` to avoid double-amplification: the Quarter +50%
 * should apply to the terrain/building neighbor score, not to the already-
 * specialist-amplified score.
 *
 * This is identical to the neighbor-scanning loop in `computeAdjacencyBonus`
 * minus the final specialist multiplication step.
 */
function computeBaseAdjacencyWithoutSpecialist(
  city: CityState,
  tile: HexCoord,
  state: GameState,
): YieldSet {
  let bonus: YieldSet = EMPTY_YIELDS;

  for (const neighbourCoord of neighbors(tile)) {
    const terrainTile = tileAt(state, neighbourCoord);

    if (terrainTile !== undefined && terrainTile.terrain === 'mountains') {
      bonus = addYields(bonus, { production: 1 });
    }
    if (terrainTile !== undefined && terrainTile.river.length > 0) {
      bonus = addYields(bonus, { food: 1 });
    }

    const neighbourUrban = urbanTileAt(city, neighbourCoord);
    if (neighbourUrban !== undefined) {
      if (tileHasBuilding(neighbourUrban, (id) => isCampusBuilding(state, id), state)) {
        bonus = addYields(bonus, { science: 1 });
      }
      if (tileHasBuilding(neighbourUrban, (id) => isTheaterBuilding(state, id), state)) {
        bonus = addYields(bonus, { culture: 1 });
      }
      if (tileHasBuilding(neighbourUrban, (id) => isCommercialBuilding(state, id), state)) {
        bonus = addYields(bonus, { gold: 1 });
      }
      // F-06: Wonder adjacency (same rule as computeAdjacencyBonus)
      for (const bid of neighbourUrban.buildings) {
        const bDef = state.config.buildings.get(bid);
        if (bDef?.isWonder) {
          bonus = addYields(bonus, WONDER_ADJACENCY_PER_NEIGHBOR);
          break;
        }
      }
    }
  }

  return bonus;
}
