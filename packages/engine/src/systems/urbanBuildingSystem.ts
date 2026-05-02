import type { GameState, GameAction } from '../types';
import type { HexCoord } from '../types/HexCoord';
import type { CityState, Age } from '../types/GameState';
import type { BuildingId, CityId } from '../types/Ids';
import type {
  UrbanTileV2,
  QuarterV2,
  QuarterKindV2,
  PlaceUrbanBuildingActionV2,
} from '../types/DistrictOverhaul';
import { coordToKey, distance } from '../hex/HexMath';
import { validateBuildingPlacement } from '../state/BuildingPlacementValidator';

/**
 * Accepted action input for this system. Until Cycle F splices
 * `PlaceUrbanBuildingActionV2` into the main `GameAction` union, we accept
 * either form here so the system is drop-in-compatible with both the current
 * engine pipeline (which will no-op on the V2 action) and an eventual pipeline
 * that dispatches V2 actions directly.
 */
export type UrbanBuildingAction = GameAction | PlaceUrbanBuildingActionV2;

/**
 * Urban Building System (Districts Overhaul — Cycle C)
 *
 * Standalone pure system responsible for spatial building placement on urban
 * tiles. Handles the `PLACE_URBAN_BUILDING` action. NOT yet wired into the
 * main `GameEngine` pipeline — this is an isolated drop-in that will be
 * integrated in Cycle F when the V2 spatial model becomes source of truth.
 *
 * Validation rules:
 *  - The city must exist and be owned by the current player.
 *  - The target tile must lie within the city's territory (falls back to a
 *    simple `distance(tile, city.position) <= 3` work-range check when
 *    territory data is not present).
 *  - The tile must currently host fewer than 2 buildings (urban cap).
 *  - The `buildingId` must resolve to a valid entry in `state.config.buildings`.
 *
 * Effects on success:
 *  - Appends `buildingId` to the target tile's `UrbanTileV2.buildings` array,
 *    creating a new `UrbanTileV2` record if none existed.
 *  - If the tile now hosts exactly 2 buildings that share the same `age`,
 *    a `QuarterV2` with `kind: 'pure_age'` is pushed onto `city.quarters`.
 *  - Any existing `QuarterV2` for the same coord is replaced (idempotency).
 *
 * The system is a no-op for any action other than `PLACE_URBAN_BUILDING` and
 * returns the original state reference unchanged in that case.
 */

const DEFAULT_WORK_RANGE = 3;

function isTileInTerritory(city: CityState, tile: HexCoord): boolean {
  const key = coordToKey(tile);
  if (city.territory && city.territory.includes(key)) {
    return true;
  }
  // Fallback: a simple work-range check when territory data is sparse.
  return distance(city.position, tile) <= DEFAULT_WORK_RANGE;
}

export function computeQuarter(
  cityId: CityId,
  coord: HexCoord,
  buildings: ReadonlyArray<BuildingId>,
  state: GameState,
  cityOwnerPlayerId: string,
): QuarterV2 | null {
  if (buildings.length !== 2) {
    return null;
  }
  const [firstId, secondId] = buildings;
  const first = state.config.buildings.get(firstId);
  const second = state.config.buildings.get(secondId);
  if (!first || !second) {
    return null;
  }

  // (1) Unique-quarter: civ-unique building pair matching the named Quarter catalog.
  //     Civ-lock: the city owner's civilizationId must match the QuarterDef.civId.
  const ownerPlayer = state.players.get(cityOwnerPlayerId);
  const ownerCivId = ownerPlayer?.civilizationId ?? '';
  if (state.config.quarters) {
    for (const quarterDef of state.config.quarters.values()) {
      const [req1, req2] = quarterDef.requiredBuildings;
      if (
        ((firstId === req1 && secondId === req2) || (firstId === req2 && secondId === req1)) &&
        quarterDef.civId === ownerCivId
      ) {
        return {
          cityId,
          coord,
          age: 'ageless',
          kind: 'unique_quarter',
          buildingIds: buildings,
          quarterId: quarterDef.id,
        };
      }
    }
  }

  // (2) Ageless-pair: both buildings carry isAgeless === true.
  if (first.isAgeless && second.isAgeless) {
    return {
      cityId,
      coord,
      age: 'ageless',
      kind: 'ageless_pair',
      buildingIds: buildings,
      quarterId: null,
    };
  }

  // (3) Pure-age: both buildings share the same age (neither is ageless).
  if (first.age === second.age && !first.isAgeless && !second.isAgeless) {
    return {
      cityId,
      coord,
      age: first.age as Age,
      kind: 'pure_age',
      buildingIds: buildings,
      quarterId: null,
    };
  }

  // Mixed-age non-ageless non-unique: no Quarter formed.
  return null;
}

export function urbanBuildingSystem(state: GameState, action: UrbanBuildingAction): GameState {
  if (action.type !== 'PLACE_URBAN_BUILDING') {
    return state;
  }

  const { cityId, tile, buildingId } = action;

  // 1. City must exist and be owned by current player.
  const city = state.cities.get(cityId);
  if (!city) {
    return state;
  }
  if (city.owner !== state.currentPlayerId) {
    return state;
  }

  // 2. Building must exist in the registry.
  if (!state.config.buildings.has(buildingId)) {
    return state;
  }

  // 3. Tile must be in city territory (or within work range fallback).
  if (!isTileInTerritory(city, tile)) {
    return state;
  }

  // 4. Tile must host < 2 buildings (urban cap).
  const tileKey = coordToKey(tile);
  const existingUrban: UrbanTileV2 | undefined = city.urbanTiles?.get(tileKey);
  const currentBuildings: ReadonlyArray<BuildingId> = existingUrban?.buildings ?? [];
  if (currentBuildings.length >= 2) {
    return state;
  }

  // 5. Final gate: delegate to the M14 BuildingPlacementValidator which
  //    re-asserts ownership/territory/tile-cap and additionally applies the
  //    wonder-specific geographic predicates from M13 (Pyramids→desert,
  //    Stonehenge→adjacent stone, etc.). The duplicate checks are accepted
  //    as defense-in-depth — this system stays drop-in-safe even if callers
  //    bypass the pre-flight validator.
  const placementResult = validateBuildingPlacement(cityId, tile, buildingId, state);
  if (!placementResult.valid) {
    return state;
  }

  // ── All validations passed — build immutable next-state. ──

  const nextBuildings: ReadonlyArray<BuildingId> = [...currentBuildings, buildingId];

  const nextUrbanTile: UrbanTileV2 = {
    cityId,
    coord: tile,
    buildings: nextBuildings,
    specialistCount: existingUrban?.specialistCount ?? 0,
    specialistCapPerTile: existingUrban?.specialistCapPerTile ?? 1,
    walled: nextBuildings.includes('walls' as BuildingId),
  };

  const nextUrbanTiles = new Map<string, UrbanTileV2>(city.urbanTiles ?? new Map());
  nextUrbanTiles.set(tileKey, nextUrbanTile);

  // Quarter derivation: only when tile has exactly 2 buildings.
  const currentQuarters: ReadonlyArray<QuarterV2> = city.quarters ?? [];
  const priorQuartersFiltered = currentQuarters.filter(
    (q) => coordToKey(q.coord) !== tileKey,
  );
  const newQuarter = computeQuarter(cityId, tile, nextBuildings, state, city.owner);
  // Record pure_age, unique_quarter, and ageless_pair quarters.
  // Mixed-age non-ageless non-unique placements return null → quarters unchanged.
  const nextQuarters: ReadonlyArray<QuarterV2> =
    newQuarter !== null
      ? [...priorQuartersFiltered, newQuarter]
      : priorQuartersFiltered;

  const nextCity: CityState = {
    ...city,
    urbanTiles: nextUrbanTiles,
    quarters: nextQuarters,
  };

  const nextCities = new Map(state.cities);
  nextCities.set(cityId, nextCity);

  return {
    ...state,
    cities: nextCities,
  };
}
