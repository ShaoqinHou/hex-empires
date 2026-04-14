import type { GameState, CityState } from '../types/GameState';
import type { HexCoord } from '../types/HexCoord';
import type { BuildingId, CityId } from '../types/Ids';
import type { UrbanTileV2 } from '../types/DistrictOverhaul';
import { coordToKey, distance } from '../hex/HexMath';
import { isWonderPlacementValid } from '../systems/wonderPlacementSystem';

/**
 * BuildingPlacementValidator (standalone pre-flight helper)
 *
 * Pure utility that stacks the core placement rules from
 * `urbanBuildingSystem` with the wonder-specific geographic rules from
 * `wonderPlacementSystem`. Intended for callers — UI pickers, AI planners,
 * a future integrated pipeline — that need a single "may I place this
 * building here?" answer without dispatching a speculative action.
 *
 * This module is NOT wired into the system pipeline and does not mutate
 * state. It duplicates the territory / tile-cap / ownership checks from
 * `urbanBuildingSystem` (the system cannot be imported because systems
 * may not import each other — see `.claude/rules/import-boundaries.md`)
 * and delegates wonder-geography questions to `isWonderPlacementValid`.
 */

const DEFAULT_WORK_RANGE = 3;

/** Result of validating a building placement candidate. */
export interface PlacementResult {
  readonly valid: boolean;
  readonly reason?: string;
}

function isTileInTerritory(city: CityState, tile: HexCoord): boolean {
  const key = coordToKey(tile);
  if (city.territory && city.territory.includes(key)) {
    return true;
  }
  // Fallback: simple work-range check when territory data is sparse.
  return distance(city.position, tile) <= DEFAULT_WORK_RANGE;
}

/**
 * Validate that a building (wonder or non-wonder) may be placed on the
 * given tile by the city's owner in the current turn.
 *
 * Checks, in order:
 *   1. City exists and is owned by `state.currentPlayerId`.
 *   2. `buildingId` exists in `state.config.buildings`.
 *   3. Tile is inside city territory (or within the fallback work range).
 *   4. Tile currently hosts fewer than 2 buildings (urban cap).
 *   5. If the building is flagged `isWonder`, the tile also satisfies the
 *      wonder's geographic rule via `isWonderPlacementValid`.
 *
 * Pure — no mutation, no side effects.
 */
export function validateBuildingPlacement(
  cityId: CityId,
  tile: HexCoord,
  buildingId: string,
  state: GameState,
): PlacementResult {
  // 1. City ownership.
  const city = state.cities.get(cityId);
  if (!city || city.owner !== state.currentPlayerId) {
    return { valid: false, reason: 'unknown or enemy city' };
  }

  // 2. Building registry lookup.
  const buildingDef = state.config.buildings.get(buildingId);
  if (!buildingDef) {
    return { valid: false, reason: 'unknown building' };
  }

  // 3. Territory.
  if (!isTileInTerritory(city, tile)) {
    return { valid: false, reason: 'tile is outside city territory' };
  }

  // 4. Urban tile cap (< 2 buildings).
  const tileKey = coordToKey(tile);
  const existingUrban: UrbanTileV2 | undefined = city.urbanTiles?.get(tileKey);
  const currentBuildings: ReadonlyArray<BuildingId> = existingUrban?.buildings ?? [];
  if (currentBuildings.length >= 2) {
    return { valid: false, reason: 'tile already hosts 2 buildings (urban cap)' };
  }

  // 5. Wonder geography.
  if (buildingDef.isWonder === true) {
    const wonderResult = isWonderPlacementValid(buildingId, tile, state);
    if (!wonderResult.valid) {
      return {
        valid: false,
        reason: wonderResult.reason ?? 'invalid wonder placement',
      };
    }
  }

  return { valid: true };
}

/**
 * Return every building id from `state.config.buildings` that, per
 * `validateBuildingPlacement`, may legally be placed at `tile` in the
 * given city right now. Ordering follows `Map` insertion order.
 */
export function listValidBuildingsForTile(
  cityId: CityId,
  tile: HexCoord,
  state: GameState,
): ReadonlyArray<BuildingId> {
  const valid: BuildingId[] = [];
  for (const id of state.config.buildings.keys()) {
    const result = validateBuildingPlacement(cityId, tile, id, state);
    if (result.valid) {
      valid.push(id);
    }
  }
  return valid;
}
