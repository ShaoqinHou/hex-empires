import type { GameState, GameAction, CityState, UnitState } from '../types/GameState';
import { coordToKey } from '../hex/HexMath';
import { calculateCityYields } from '../state/YieldCalculator';

/** Generate deterministic unit ID from state */
function nextUnitId(state: GameState, cityId: string): string {
  return `unit_${state.units.size + 1}_${cityId}_t${state.turn}`;
}

/**
 * ProductionSystem processes production queues on END_TURN.
 * Also handles SET_PRODUCTION and PURCHASE_ITEM actions.
 * Towns cannot produce via production queue — they must use PURCHASE_ITEM.
 */
export function productionSystem(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'SET_PRODUCTION':
      return handleSetProduction(state, action.cityId, action.itemId, action.itemType);
    case 'PURCHASE_ITEM':
      return handlePurchaseItem(state, action.cityId, action.itemId, action.itemType);
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
  // Towns cannot use production queue — they must purchase with gold
  if (city.settlementType === 'town') return state;

  const updatedCities = new Map(state.cities);
  updatedCities.set(cityId, {
    ...city,
    productionQueue: [{ type: itemType, id: itemId }],
    productionProgress: 0,
  });

  return { ...state, cities: updatedCities };
}

function handlePurchaseItem(
  state: GameState,
  cityId: string,
  itemId: string,
  itemType: 'unit' | 'building',
): GameState {
  const city = state.cities.get(cityId);
  if (!city) return state;
  if (city.owner !== state.currentPlayerId) return state;

  const goldCost = getGoldCost(state, itemId);
  const player = state.players.get(state.currentPlayerId);
  if (!player || player.gold < goldCost) return state;

  const updatedPlayers = new Map(state.players);
  updatedPlayers.set(player.id, { ...player, gold: player.gold - goldCost });

  const updatedCities = new Map(state.cities);
  const updatedUnits = new Map(state.units);
  const newLog = [...state.log];

  if (itemType === 'unit') {
    const unitId = nextUnitId(state, cityId);
    const newUnit: UnitState = {
      id: unitId,
      typeId: itemId,
      owner: city.owner,
      position: city.position,
      movementLeft: 0,
      health: 100,
      experience: 0,
      promotions: [],
      fortified: false,
    };
    updatedUnits.set(unitId, newUnit);
    newLog.push({
      turn: state.turn,
      playerId: city.owner,
      message: `${city.name} purchased ${itemId}`,
      type: 'production',
    });
  } else if (itemType === 'building') {
    if (city.buildings.includes(itemId)) return state; // already built
    const wallsBonus = itemId === 'walls' ? 100 : 0;
    updatedCities.set(cityId, {
      ...city,
      buildings: [...city.buildings, itemId],
      defenseHP: city.defenseHP + wallsBonus,
    });
    newLog.push({
      turn: state.turn,
      playerId: city.owner,
      message: `${city.name} purchased ${itemId}`,
      type: 'production',
    });
  }

  return {
    ...state,
    players: updatedPlayers,
    cities: updatedCities,
    units: updatedUnits,
    log: newLog,
  };
}

function processProduction(state: GameState): GameState {
  const updatedCities = new Map(state.cities);
  const updatedUnits = new Map(state.units);
  const newLog = [...state.log];
  let changed = false;

  for (const [cityId, city] of state.cities) {
    if (city.owner !== state.currentPlayerId) continue;
    if (city.settlementType === 'town') continue; // Towns cannot produce via queue
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
        const wallsBonus = currentItem.id === 'walls' ? 100 : 0;
        // Production overflow carries to next project (Civ VII rule)
        updatedCities.set(cityId, {
          ...city,
          buildings: [...city.buildings, currentItem.id],
          productionQueue: city.productionQueue.slice(1),
          productionProgress: newProgress - cost,
          defenseHP: city.defenseHP + wallsBonus,
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

      // Production overflow carries to next project (Civ VII rule)
      updatedCities.set(cityId, {
        ...city,
        productionQueue: city.productionQueue.slice(1),
        productionProgress: newProgress - cost,
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

/** Gold cost for purchasing items (2x production cost) */
/** Gold purchase cost = 4x production cost (Civ VII standard) */
function getGoldCost(state: GameState, itemId: string): number {
  return getProductionCost(state, itemId) * 4;
}
