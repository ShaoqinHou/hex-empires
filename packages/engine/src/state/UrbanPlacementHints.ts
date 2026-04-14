import type { GameState } from '../types/GameState';
import type { HexCoord } from '../types/HexCoord';
import type { BuildingId, CityId } from '../types/Ids';
import type { YieldSet } from '../types/Yields';
import { EMPTY_YIELDS, addYields } from '../types/Yields';
import { coordToKey } from '../hex/HexMath';
import { computeAdjacencyBonus } from './DistrictAdjacency';
import { validateBuildingPlacement } from './BuildingPlacementValidator';

/**
 * UrbanPlacementHints — pure heuristic scoring for AI building placement.
 *
 * Given a city and a candidate (buildingId, tile), `scoreBuildingPlacement`
 * combines two signals:
 *
 *   1. Adjacency bonus — from `computeAdjacencyBonus` (DistrictAdjacency).
 *      Captures the Civ VII-style bonuses a building earns from its six
 *      neighbour hexes (mountains, rivers, same-class urban neighbours).
 *   2. Base yields — from `BuildingDef.yields` in `state.config.buildings`.
 *      Captures the building's own flat per-turn output.
 *
 * Legality is NOT duplicated here. The module defers to
 * `validateBuildingPlacement` (BuildingPlacementValidator) for the
 * territory / tile-cap / ownership / wonder-geography checks. Invalid
 * candidates score zero across every yield component so they always sort
 * below any legal placement.
 *
 * `rankBestPlacements` iterates every registered building against every
 * tile hosting an urban tile or lying within the city's work-range
 * territory, filters to legal candidates, scores them, and returns the
 * top-N sorted descending by `scoreTotal`.
 *
 * The module is pure — no mutation, no RNG, no I/O. It is intentionally
 * NOT wired into aiSystem; callers opt-in explicitly.
 */

/** Scoring result for a single (buildingId, tile) candidate. */
export interface PlacementScore {
  readonly tile: HexCoord;
  readonly buildingId: BuildingId;
  readonly scoreFood: number;
  readonly scoreProduction: number;
  readonly scoreScience: number;
  readonly scoreCulture: number;
  readonly scoreGold: number;
  /** Sum of the five per-yield components above. */
  readonly scoreTotal: number;
  /** Mirrors validateBuildingPlacement(...).valid. */
  readonly valid: boolean;
}

const ZERO_SCORE = {
  scoreFood: 0,
  scoreProduction: 0,
  scoreScience: 0,
  scoreCulture: 0,
  scoreGold: 0,
} as const;

/**
 * Project a partial YieldSet (a BuildingDef.yields value) onto the five
 * scoring components used by PlacementScore.
 */
function projectYields(partial: Partial<YieldSet>): {
  food: number;
  production: number;
  science: number;
  culture: number;
  gold: number;
} {
  return {
    food: partial.food ?? 0,
    production: partial.production ?? 0,
    science: partial.science ?? 0,
    culture: partial.culture ?? 0,
    gold: partial.gold ?? 0,
  };
}

/**
 * Score a single building + tile candidate.
 *
 * Returns an all-zero, `valid: false` score whenever
 * `validateBuildingPlacement` rejects the candidate (unknown city,
 * enemy-owned city, unknown building, out-of-territory, tile at cap, or
 * a wonder-geography mismatch). Otherwise the score is the sum of the
 * adjacency bonus (from DistrictAdjacency) and the building's base
 * yields (from state.config.buildings), restricted to the five scoring
 * components (food / production / science / culture / gold).
 *
 * Pure — same inputs always produce the same output.
 */
export function scoreBuildingPlacement(
  cityId: CityId,
  tile: HexCoord,
  buildingId: BuildingId,
  state: GameState,
): PlacementScore {
  const legality = validateBuildingPlacement(cityId, tile, buildingId, state);
  if (!legality.valid) {
    return {
      tile,
      buildingId,
      ...ZERO_SCORE,
      scoreTotal: 0,
      valid: false,
    };
  }

  // Safe: validator already confirmed both exist.
  const city = state.cities.get(cityId)!;
  const buildingDef = state.config.buildings.get(buildingId)!;

  const adjacency: YieldSet = computeAdjacencyBonus(city, tile, state);
  const combined: YieldSet = addYields(adjacency, buildingDef.yields);
  const score = projectYields(combined);

  const scoreTotal =
    score.food + score.production + score.science + score.culture + score.gold;

  return {
    tile,
    buildingId,
    scoreFood: score.food,
    scoreProduction: score.production,
    scoreScience: score.science,
    scoreCulture: score.culture,
    scoreGold: score.gold,
    scoreTotal,
    valid: true,
  };
}

/**
 * Gather every candidate tile the ranker should consider for this city.
 *
 * Candidates = union of
 *   (a) coords keyed in `city.urbanTiles` (spatial buildings already
 *       placed — may still accept one more building if under the cap), and
 *   (b) coords listed in `city.territory` (owned tiles, typically empty).
 *
 * Deduplicated by HexKey. Returns an empty list when the city is unknown
 * or has no urban/territory data.
 */
function candidateTiles(state: GameState, cityId: CityId): ReadonlyArray<HexCoord> {
  const city = state.cities.get(cityId);
  if (!city) return [];

  const seen = new Set<string>();
  const coords: HexCoord[] = [];

  if (city.urbanTiles !== undefined) {
    for (const urban of city.urbanTiles.values()) {
      const key = coordToKey(urban.coord);
      if (!seen.has(key)) {
        seen.add(key);
        coords.push(urban.coord);
      }
    }
  }

  for (const key of city.territory) {
    if (seen.has(key)) continue;
    const mapTile = state.map.tiles.get(key);
    if (mapTile === undefined) continue;
    seen.add(key);
    coords.push(mapTile.coord);
  }

  return coords;
}

/**
 * Return up to `n` top-scoring (buildingId, tile) placements for the
 * given city, sorted descending by `scoreTotal`. Only candidates that
 * pass `validateBuildingPlacement` appear in the result — illegal
 * combinations are filtered out entirely.
 *
 * A non-positive `n`, an unknown city, or a city with no candidate
 * tiles yields an empty array.
 *
 * The full candidate grid is `buildings × tiles`; each is scored
 * independently via `scoreBuildingPlacement`. The sort is stable across
 * runs because JavaScript's `Array.prototype.sort` is stable in all
 * supported engines and the iteration order of `state.config.buildings`
 * and `candidateTiles` is deterministic (Map insertion order).
 *
 * Pure — same inputs always produce the same output.
 */
export function rankBestPlacements(
  cityId: CityId,
  state: GameState,
  n: number,
): ReadonlyArray<PlacementScore> {
  if (n <= 0) return [];
  if (!state.cities.has(cityId)) return [];

  const tiles = candidateTiles(state, cityId);
  if (tiles.length === 0) return [];

  const scored: PlacementScore[] = [];
  for (const buildingId of state.config.buildings.keys()) {
    for (const tile of tiles) {
      const score = scoreBuildingPlacement(cityId, tile, buildingId, state);
      if (score.valid) {
        scored.push(score);
      }
    }
  }

  scored.sort((a, b) => b.scoreTotal - a.scoreTotal);
  return scored.slice(0, n);
}
