import type { GameState, GameAction, CityState, PlayerState, SpecialistType } from '../types/GameState';
import type { HexKey } from '../types/HexCoord';
import { removeOnePendingGrowthChoice } from '../state/PendingGrowthChoices';

/**
 * SpecialistSystem handles citizen specialist assignment.
 *
 * Each specialist:
 *  - Produces +2 science and +2 culture per turn
 *  - Reduces city happiness by 1 (tracked in calculateCityHappiness via CityState.specialists)
 *  - Costs 2 extra food per turn (via YieldCalculator food deduction)
 *
 * Constraint: at least 1 population must work tiles, so
 * specialists cannot exceed (population - 1).
 *
 * W3-02: per-tile spatial model. ASSIGN_SPECIALIST now accepts an optional
 * `tileId`. When provided, the specialist is pinned to that urban tile and
 * `specialistsByTile` is updated. Per-tile cap is enforced against
 * `urbanTiles[tileId].specialistCapPerTile` (default 1).
 * Total headcount cap is still: city.specialists < city.population - 1.
 *
 * W2-01 addition: ASSIGN_SPECIALIST_FROM_GROWTH resolves a pending growth
 * choice by assigning a specialist instead of placing an improvement.
 * Same city-level constraint applies; also clears the pendingGrowthChoice.
 */
export function specialistSystem(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'ASSIGN_SPECIALIST':
      return handleAssign(state, action.cityId, action.tileId, action.specialistType);
    case 'UNASSIGN_SPECIALIST':
      return handleUnassign(state, action.cityId, action.tileId, action.specialistType);
    case 'ASSIGN_SPECIALIST_FROM_GROWTH':
      return handleAssignFromGrowth(state, action.cityId);
    default:
      return state;
  }
}

/**
 * Check whether a specialist can be assigned to a city (and optionally a specific tile).
 *
 * Cap rules (W3-02):
 *  1. Total headcount: city.specialists < city.population - 1
 *  2. Per-tile cap (when tileId is provided): tile.specialistCount < tile.specialistCapPerTile
 */
export function canAssignSpecialist(
  city: CityState,
  tileId?: string,
): boolean {
  // Total headcount cap
  if (city.specialists >= city.population - 1) return false;

  // Per-tile cap when a tileId is specified
  if (tileId !== undefined) {
    const urbanTile = city.urbanTiles?.get(tileId as HexKey);
    if (urbanTile !== undefined) {
      const tileCap = urbanTile.specialistCapPerTile ?? 1;
      const tileCount = urbanTile.specialistCount ?? 0;
      if (tileCount >= tileCap) return false;
    }
  }

  return true;
}

function handleAssign(
  state: GameState,
  cityId: string,
  tileId?: string,
  specialistType?: SpecialistType,
): GameState {
  const city = state.cities.get(cityId);
  if (!city) return state;
  if (city.owner !== state.currentPlayerId) return state;

  if (!canAssignSpecialist(city, tileId)) return state;

  // F-07: Update specialistsByType when specialistType is provided
  const newSpecialistsByType: ReadonlyMap<SpecialistType, number> | undefined = specialistType !== undefined
    ? (() => {
        const next = new Map(city.specialistsByType ?? new Map<SpecialistType, number>());
        next.set(specialistType, (next.get(specialistType) ?? 0) + 1);
        return next;
      })()
    : city.specialistsByType;

  // Update specialistsByTile when tileId is provided
  let newSpecialistsByTile = city.specialistsByTile;
  if (tileId !== undefined) {
    const current = city.specialistsByTile?.get(tileId) ?? 0;
    const next = new Map(city.specialistsByTile ?? new Map());
    next.set(tileId, current + 1);
    newSpecialistsByTile = next;

    // Also update UrbanTileV2.specialistCount if spatial data exists
    const urbanTile = city.urbanTiles?.get(tileId as HexKey);
    if (urbanTile !== undefined) {
      const nextUrbanTiles = new Map(city.urbanTiles!);
      nextUrbanTiles.set(tileId as HexKey, {
        ...urbanTile,
        specialistCount: urbanTile.specialistCount + 1,
      });
      const updatedCity: CityState = {
        ...city,
        specialists: city.specialists + 1,
        specialistsByTile: newSpecialistsByTile,
        specialistsByType: newSpecialistsByType,
        urbanTiles: nextUrbanTiles,
      };
      const updatedCities = new Map(state.cities);
      updatedCities.set(cityId, updatedCity);
      return {
        ...state,
        cities: updatedCities,
        log: [...state.log, {
          turn: state.turn,
          playerId: state.currentPlayerId,
          message: `${city.name}: specialist assigned to tile ${tileId} (${city.specialists + 1} total)`,
          type: 'city',
        }],
      };
    }
  }

  // City-level-only path (no urbanTile to update, or no tileId supplied)
  const updatedCity: CityState = {
    ...city,
    specialists: city.specialists + 1,
    specialistsByTile: newSpecialistsByTile,
    specialistsByType: newSpecialistsByType,
  };
  const updatedCities = new Map(state.cities);
  updatedCities.set(cityId, updatedCity);

  return {
    ...state,
    cities: updatedCities,
    log: [...state.log, {
      turn: state.turn,
      playerId: state.currentPlayerId,
      message: `${city.name}: specialist assigned (${city.specialists + 1} total)`,
      type: 'city',
    }],
  };
}

function handleUnassign(
  state: GameState,
  cityId: string,
  tileId?: string,
  specialistType?: SpecialistType,
): GameState {
  const city = state.cities.get(cityId);
  if (!city) return state;
  if (city.owner !== state.currentPlayerId) return state;

  // Can't go below 0 specialists
  if (city.specialists <= 0) return state;

  // F-07: Update specialistsByType when specialistType is provided
  const newSpecialistsByType: ReadonlyMap<SpecialistType, number> | undefined = specialistType !== undefined
    ? (() => {
        const next = new Map(city.specialistsByType ?? new Map<SpecialistType, number>());
        const current = next.get(specialistType) ?? 0;
        if (current <= 1) {
          next.delete(specialistType);
        } else {
          next.set(specialistType, current - 1);
        }
        return next;
      })()
    : city.specialistsByType;

  // Update specialistsByTile when tileId is provided
  let newSpecialistsByTile = city.specialistsByTile;
  if (tileId !== undefined) {
    // Use urbanTile.specialistCount as authoritative source for tile-level count;
    // fall back to specialistsByTile when urbanTile data is absent.
    const tileUrban = city.urbanTiles?.get(tileId as HexKey);
    const currentOnTile = tileUrban?.specialistCount ?? city.specialistsByTile?.get(tileId) ?? 0;
    if (currentOnTile <= 0) return state; // nothing to unassign on this tile

    // Update specialistsByTile map
    const tileMapCount = city.specialistsByTile?.get(tileId) ?? currentOnTile;
    const next = new Map(city.specialistsByTile ?? new Map());
    if (tileMapCount - 1 === 0) {
      next.delete(tileId);
    } else {
      next.set(tileId, tileMapCount - 1);
    }
    newSpecialistsByTile = next;

    // Also update UrbanTileV2.specialistCount if spatial data exists
    if (tileUrban !== undefined) {
      const nextUrbanTiles = new Map(city.urbanTiles!);
      nextUrbanTiles.set(tileId as HexKey, {
        ...tileUrban,
        specialistCount: Math.max(0, tileUrban.specialistCount - 1),
      });
      const updatedCity: CityState = {
        ...city,
        specialists: city.specialists - 1,
        specialistsByTile: newSpecialistsByTile,
        specialistsByType: newSpecialistsByType,
        urbanTiles: nextUrbanTiles,
      };
      const updatedCities = new Map(state.cities);
      updatedCities.set(cityId, updatedCity);
      return {
        ...state,
        cities: updatedCities,
        log: [...state.log, {
          turn: state.turn,
          playerId: state.currentPlayerId,
          message: `${city.name}: specialist unassigned from tile ${tileId} (${city.specialists - 1} total)`,
          type: 'city',
        }],
      };
    }
  }

  // City-level-only path
  const updatedCity: CityState = {
    ...city,
    specialists: city.specialists - 1,
    specialistsByTile: newSpecialistsByTile,
    specialistsByType: newSpecialistsByType,
  };
  const updatedCities = new Map(state.cities);
  updatedCities.set(cityId, updatedCity);

  return {
    ...state,
    cities: updatedCities,
    log: [...state.log, {
      turn: state.turn,
      playerId: state.currentPlayerId,
      message: `${city.name}: specialist unassigned (${city.specialists - 1} total)`,
      type: 'city',
    }],
  };
}

/**
 * Resolve a pending growth choice by assigning a specialist (W2-01).
 * City-level only (no per-tile routing from growth choice).
 * Increments city.specialists and clears the pendingGrowthChoice for this city.
 * Applies the same total cap: specialists cannot exceed population - 1.
 */
function handleAssignFromGrowth(state: GameState, cityId: string): GameState {
  const city = state.cities.get(cityId);
  if (!city) return state;
  if (city.owner !== state.currentPlayerId) return state;

  const player = state.players.get(state.currentPlayerId);
  if (!player) return state;
  const hasPending = (player.pendingGrowthChoices ?? []).some(
    c => c.cityId === cityId,
  );
  if (!hasPending) return state;

  // Growth specialists are a city-only resolution path.
  if (city.settlementType === 'town') return state;
  // At least 1 pop must work tiles: max specialists = population - 1
  if (!canAssignSpecialist(city)) return state;

  const updatedCities = new Map(state.cities);
  updatedCities.set(cityId, { ...city, specialists: city.specialists + 1 });

  // Clear the pending growth choice for this city
  const newPending = removeOnePendingGrowthChoice(player.pendingGrowthChoices, cityId);
  const updatedPlayer: PlayerState = { ...player, pendingGrowthChoices: newPending };
  const updatedPlayers = new Map(state.players);
  updatedPlayers.set(state.currentPlayerId, updatedPlayer);

  return {
    ...state,
    cities: updatedCities,
    players: updatedPlayers,
    lastValidation: null,
    log: [...state.log, {
      turn: state.turn,
      playerId: state.currentPlayerId,
      message: `${city.name}: growth resolved via specialist assignment (${city.specialists + 1} total)`,
      type: 'city',
    }],
  };
}
