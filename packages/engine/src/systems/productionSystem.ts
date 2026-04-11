import type { GameState, GameAction, CityState, UnitState } from '../types/GameState';
import { coordToKey } from '../hex/HexMath';
import { calculateCityYields } from '../state/YieldCalculator';

/** Generate deterministic unit ID from state */
function nextUnitId(state: GameState, cityId: string): string {
  return `unit_${state.units.size + 1}_${cityId}_t${state.turn}`;
}

/**
 * Helper function to create an invalid result with validation reason
 */
function createInvalidResult(
  state: GameState,
  reason: string,
  category: 'movement' | 'combat' | 'production' | 'general',
): GameState {
  return {
    ...state,
    lastValidation: { valid: false, reason, category },
    log: state.log, // Keep log unchanged
  };
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
  if (!city) return createInvalidResult(state, 'City not found', 'production');
  if (city.owner !== state.currentPlayerId) return createInvalidResult(state, 'Not your city', 'production');
  // Towns cannot use production queue — they must purchase with gold
  if (city.settlementType === 'town') return createInvalidResult(state, 'Towns cannot produce - must purchase with gold', 'production');

  // If producing a unit that requires a strategic resource, verify the player
  // has access to it (any city's territory must contain that resource).
  if (itemType === 'unit') {
    const unitDef = state.config.units.get(itemId);
    if (unitDef?.requiredResource) {
      const hasResource = playerHasResource(state, state.currentPlayerId, unitDef.requiredResource);
      if (!hasResource) return createInvalidResult(state, `Requires resource: ${unitDef.requiredResource}`, 'production');
    }
  }

  // Check if building is already built
  if (itemType === 'building' && city.buildings.includes(itemId)) {
    return createInvalidResult(state, 'Building already constructed', 'production');
  }

  const updatedCities = new Map(state.cities);
  updatedCities.set(cityId, {
    ...city,
    productionQueue: [{ type: itemType, id: itemId }],
    // Keep existing progress when switching production (no waste)
    productionProgress: city.productionProgress,
  });

  return { ...state, cities: updatedCities, lastValidation: null };
}

/**
 * Returns true if the player controls at least one tile with the given resource
 * across all of their cities' territories.
 */
function playerHasResource(state: GameState, playerId: string, resourceId: string): boolean {
  for (const city of state.cities.values()) {
    if (city.owner !== playerId) continue;
    for (const tileKey of city.territory) {
      const tile = state.map.tiles.get(tileKey);
      if (tile?.resource === resourceId) return true;
    }
  }
  return false;
}

function handlePurchaseItem(
  state: GameState,
  cityId: string,
  itemId: string,
  itemType: 'unit' | 'building',
): GameState {
  const city = state.cities.get(cityId);
  if (!city) return createInvalidResult(state, 'City not found', 'production');
  if (city.owner !== state.currentPlayerId) return createInvalidResult(state, 'Not your city', 'production');

  // Check if building is already built
  if (itemType === 'building' && city.buildings.includes(itemId)) {
    return createInvalidResult(state, 'Building already constructed', 'production');
  }

  let goldCost = getGoldCost(state, itemId);
  // Market: 10% discount on all unit gold purchases
  if (city.buildings.includes('market') && itemType === 'unit') {
    goldCost = Math.floor(goldCost * 0.9);
  }
  const player = state.players.get(state.currentPlayerId);
  if (!player || player.gold < goldCost) return createInvalidResult(state, `Not enough gold (need ${goldCost})`, 'production');

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
    lastValidation: null,
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
    let productionPerTurn = yields.production;

    // Barracks: +10% production toward military land units
    if (city.buildings.includes('barracks') && currentItem.type === 'unit') {
      const unitDef = state.config.units.get(currentItem.id);
      if (unitDef) {
        const militaryCategories: ReadonlyArray<string> = ['melee', 'ranged', 'cavalry', 'siege'];
        if (militaryCategories.includes(unitDef.category)) {
          productionPerTurn = Math.floor(productionPerTurn * 1.1);
        }
      }
    }

    // Workshop: +10% production toward all buildings
    if (city.buildings.includes('workshop') && currentItem.type === 'building') {
      productionPerTurn = Math.floor(productionPerTurn * 1.1);
    }

    // Celebration bonus: +celebrationBonus% production toward everything
    const player = state.players.get(city.owner);
    if (player && player.celebrationBonus > 0) {
      productionPerTurn = Math.floor(productionPerTurn * (100 + player.celebrationBonus) / 100);
    }

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
    lastValidation: null,
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
