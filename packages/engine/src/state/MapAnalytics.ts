import type { GameState, HexMap, HexTile } from '../types/GameState';

/**
 * Pure analytics helpers for map-level terrain, feature, and resource stats.
 *
 * All functions are side-effect free and read from an immutable GameState.
 * This module is intentionally NOT re-exported from the engine barrel — callers
 * that need these utilities import them directly by path.
 */

/**
 * Terrain ids that represent water (non-land) tiles. Used by `landRatio` and
 * `passableLandTiles` to distinguish land from water.
 *
 * W4-02: Added 'navigable_river' (F-02 water tile) and 'deep_ocean' (F-05).
 */
const WATER_TERRAINS: ReadonlySet<string> = new Set<string>(['ocean', 'coast', 'reef', 'navigable_river', 'deep_ocean']);

/**
 * Return a read-only view of the map's tiles. Separate helper so callers that
 * only need the tile collection don't depend on the full `HexMap` shape.
 */
function tilesOf(map: HexMap): ReadonlyMap<string, HexTile> {
  return map.tiles;
}

/**
 * Count tiles grouped by their `terrain` id.
 *
 * Returns an empty map when the grid has no tiles. Terrain ids are copied
 * verbatim from `HexTile.terrain`; no normalisation is performed.
 */
export function terrainDistribution(state: GameState): ReadonlyMap<string, number> {
  const counts = new Map<string, number>();
  for (const tile of tilesOf(state.map).values()) {
    counts.set(tile.terrain, (counts.get(tile.terrain) ?? 0) + 1);
  }
  return counts;
}

/**
 * Count tiles grouped by their `feature` id, excluding tiles whose feature is
 * `null`. A tile with no feature is omitted entirely — it is not recorded as
 * an empty-string key or a `null` key.
 */
export function featureDistribution(state: GameState): ReadonlyMap<string, number> {
  const counts = new Map<string, number>();
  for (const tile of tilesOf(state.map).values()) {
    const feature = tile.feature;
    if (feature === null) continue;
    counts.set(feature, (counts.get(feature) ?? 0) + 1);
  }
  return counts;
}

/**
 * Fraction of tiles whose terrain is NOT in the water set
 * (`ocean`, `coast`, `reef`) over the total tile count.
 *
 * Returns 0 for an empty map so callers don't have to guard against NaN.
 */
export function landRatio(state: GameState): number {
  const tiles = tilesOf(state.map);
  if (tiles.size === 0) return 0;
  let land = 0;
  for (const tile of tiles.values()) {
    if (!WATER_TERRAINS.has(tile.terrain)) land += 1;
  }
  return land / tiles.size;
}

/**
 * Count tiles that have at least one river edge.
 *
 * `HexTile.river` is a `ReadonlyArray<number>` of edge indices (0–5); a tile
 * is considered to have a river when that array is non-empty.
 */
export function riverTileCount(state: GameState): number {
  let count = 0;
  for (const tile of tilesOf(state.map).values()) {
    if (tile.river.length > 0) count += 1;
  }
  return count;
}

/**
 * Count tiles grouped by their `resource` id, excluding tiles whose resource
 * is `null`. Mirrors `featureDistribution` — tiles with no resource are not
 * represented in the returned map.
 */
export function resourceCount(state: GameState): ReadonlyMap<string, number> {
  const counts = new Map<string, number>();
  for (const tile of tilesOf(state.map).values()) {
    const resource = tile.resource;
    if (resource === null) continue;
    counts.set(resource, (counts.get(resource) ?? 0) + 1);
  }
  return counts;
}

/**
 * Count tiles that are land (terrain not in the water set) AND not
 * `mountains`. Useful for estimating the portion of the map that units can
 * actually traverse on foot.
 */
export function passableLandTiles(state: GameState): number {
  let count = 0;
  for (const tile of tilesOf(state.map).values()) {
    if (WATER_TERRAINS.has(tile.terrain)) continue;
    if (tile.feature === 'mountains') continue;
    count += 1;
  }
  return count;
}
