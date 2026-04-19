import type { GameState, GameAction, PlayerState } from '../types/GameState';

/**
 * SpecialistSystem handles citizen specialist assignment.
 *
 * Each specialist:
 *  - Produces +2 science and +2 culture per turn
 *  - Reduces city happiness by 1 (tracked in calculateCityHappiness via CityState.specialists)
 *
 * Constraint: at least 1 population must work tiles, so
 * specialists cannot exceed (population - 1).
 *
 * W2-01 addition: ASSIGN_SPECIALIST_FROM_GROWTH resolves a pending growth
 * choice by assigning a specialist instead of placing an improvement.
 * Same city-level constraint applies; also clears the pendingGrowthChoice.
 */
export function specialistSystem(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'ASSIGN_SPECIALIST':
      return handleAssign(state, action.cityId);
    case 'UNASSIGN_SPECIALIST':
      return handleUnassign(state, action.cityId);
    case 'ASSIGN_SPECIALIST_FROM_GROWTH':
      return handleAssignFromGrowth(state, action.cityId);
    default:
      return state;
  }
}

function handleAssign(state: GameState, cityId: string): GameState {
  const city = state.cities.get(cityId);
  if (!city) return state;
  if (city.owner !== state.currentPlayerId) return state;

  // At least 1 pop must work tiles: max specialists = population - 1
  if (city.specialists >= city.population - 1) return state;

  const updatedCities = new Map(state.cities);
  updatedCities.set(cityId, { ...city, specialists: city.specialists + 1 });

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

function handleUnassign(state: GameState, cityId: string): GameState {
  const city = state.cities.get(cityId);
  if (!city) return state;
  if (city.owner !== state.currentPlayerId) return state;

  // Can't go below 0 specialists
  if (city.specialists <= 0) return state;

  const updatedCities = new Map(state.cities);
  updatedCities.set(cityId, { ...city, specialists: city.specialists - 1 });

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
 * Increments city.specialists (city-level; per-tile spatial model in W3-02).
 * Clears the pendingGrowthChoice for this city from the player's queue.
 * Applies the same cap as handleAssign: specialists cannot exceed population - 1.
 */
function handleAssignFromGrowth(state: GameState, cityId: string): GameState {
  const city = state.cities.get(cityId);
  if (!city) return state;
  if (city.owner !== state.currentPlayerId) return state;

  // At least 1 pop must work tiles: max specialists = population - 1
  if (city.specialists >= city.population - 1) return state;

  const updatedCities = new Map(state.cities);
  updatedCities.set(cityId, { ...city, specialists: city.specialists + 1 });

  // Clear the pending growth choice for this city
  const player = state.players.get(state.currentPlayerId);
  if (!player) return { ...state, cities: updatedCities };
  const newPending = (player.pendingGrowthChoices ?? []).filter(
    c => c.cityId !== cityId,
  );
  const updatedPlayer: PlayerState = { ...player, pendingGrowthChoices: newPending };
  const updatedPlayers = new Map(state.players);
  updatedPlayers.set(state.currentPlayerId, updatedPlayer);

  return {
    ...state,
    cities: updatedCities,
    players: updatedPlayers,
    log: [...state.log, {
      turn: state.turn,
      playerId: state.currentPlayerId,
      message: `${city.name}: growth resolved via specialist assignment (${city.specialists + 1} total)`,
      type: 'city',
    }],
  };
}
