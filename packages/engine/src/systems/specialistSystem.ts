import type { GameState, GameAction } from '../types/GameState';

/**
 * SpecialistSystem handles citizen specialist assignment.
 *
 * Each specialist:
 *  - Produces +2 science and +2 culture per turn
 *  - Reduces city happiness by 1 (tracked in calculateCityHappiness via CityState.specialists)
 *
 * Constraint: at least 1 population must work tiles, so
 * specialists cannot exceed (population - 1).
 */
export function specialistSystem(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'ASSIGN_SPECIALIST':
      return handleAssign(state, action.cityId);
    case 'UNASSIGN_SPECIALIST':
      return handleUnassign(state, action.cityId);
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
