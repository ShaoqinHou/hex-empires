import type { GameState, GameAction, CityState, UnitState } from '../types/GameState';
import { coordToKey } from '../hex/HexMath';
import { calculateCityYields } from '../state/YieldCalculator';

/** Generate deterministic unit ID from state */
function nextUnitId(state: GameState, cityId: string): string {
  return `unit_${state.units.size + 1}_${cityId}_t${state.turn}`;
}

/**
 * ProductionSystem processes production queues on END_TURN.
 * Also handles SET_PRODUCTION actions.
 */
export function productionSystem(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'SET_PRODUCTION':
      return handleSetProduction(state, action.cityId, action.itemId, action.itemType);
    case 'END_TURN':
      return processProduction(state);
    default:
      return state;
  }
}

function handleSetProduction(
  state: GameState,
  cityId: string,
  itemId: string,
  itemType: 'unit' | 'building' | 'wonder',
): GameState {
  const city = state.cities.get(cityId);
  if (!city) return state;
  if (city.owner !== state.currentPlayerId) return state;

  const updatedCities = new Map(state.cities);
  updatedCities.set(cityId, {
    ...city,
    productionQueue: [{ type: itemType, id: itemId }],
    productionProgress: 0,
  });

  return { ...state, cities: updatedCities };
}

function processProduction(state: GameState): GameState {
  const updatedCities = new Map(state.cities);
  const updatedUnits = new Map(state.units);
  const newLog = [...state.log];
  let changed = false;

  for (const [cityId, city] of state.cities) {
    if (city.owner !== state.currentPlayerId) continue;
    if (city.productionQueue.length === 0) continue;

    const currentItem = city.productionQueue[0];
    const yields = calculateCityYields(city, state);
    const productionPerTurn = yields.production;
    const newProgress = city.productionProgress + productionPerTurn;
    const cost = getProductionCost(state, currentItem.id);

    if (newProgress >= cost) {
      // Production complete
      if (currentItem.type === 'unit') {
        const unitId = nextUnitId(state, cityId);
        const newUnit: UnitState = {
          id: unitId,
          typeId: currentItem.id,
          owner: city.owner,
          position: city.position,
          movementLeft: 0, // refreshed next turn
          health: 100,
          experience: 0,
          promotions: [],
          fortified: false,
        };
        updatedUnits.set(unitId, newUnit);

        newLog.push({
          turn: state.turn,
          playerId: city.owner,
          message: `${city.name} produced ${currentItem.id}`,
          type: 'production',
        });
      } else if (currentItem.type === 'building') {
        // Add building to city
        updatedCities.set(cityId, {
          ...city,
          buildings: [...city.buildings, currentItem.id],
          productionQueue: city.productionQueue.slice(1),
          productionProgress: 0,
        });
        changed = true;

        newLog.push({
          turn: state.turn,
          playerId: city.owner,
          message: `${city.name} built ${currentItem.id}`,
          type: 'production',
        });
        continue;
      }

      updatedCities.set(cityId, {
        ...city,
        productionQueue: city.productionQueue.slice(1),
        productionProgress: 0,
      });
      changed = true;
    } else {
      updatedCities.set(cityId, {
        ...city,
        productionProgress: newProgress,
      });
      changed = true;
    }
  }

  if (!changed && updatedUnits.size === state.units.size) return state;

  return {
    ...state,
    cities: updatedCities,
    units: updatedUnits,
    log: newLog,
  };
}

/** Production cost for items — driven by state.config.units and state.config.buildings */
function getProductionCost(state: GameState, itemId: string): number {
  return state.config.units.get(itemId)?.cost
    ?? state.config.buildings.get(itemId)?.cost
    ?? 100;
}
