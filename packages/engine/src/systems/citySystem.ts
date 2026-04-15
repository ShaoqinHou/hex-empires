import type { GameState, GameAction, CityState, HexTile, SettlementType } from '../types/GameState';
import type { HexCoord } from '../types/HexCoord';
import { coordToKey, range, distance } from '../hex/HexMath';

/** Generate deterministic city ID from state */
function nextCityId(state: GameState): string {
  return `city_${state.cities.size + 1}_t${state.turn}`;
}

/** Check whether the current player already owns a city (capital) */
function playerHasCity(state: GameState, playerId: string): boolean {
  for (const city of state.cities.values()) {
    if (city.owner === playerId) return true;
  }
  return false;
}

/**
 * CitySystem handles city founding, tile purchasing, and settlement upgrades.
 */
export function citySystem(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'FOUND_CITY':
      return handleFoundCity(state, action.unitId, action.name);
    case 'PURCHASE_TILE':
      return handlePurchaseTile(state, action.cityId, action.tile);
    case 'UPGRADE_SETTLEMENT':
      return handleUpgradeSettlement(state, action.cityId);
    default:
      return state;
  }
}

function handleFoundCity(state: GameState, unitId: string, cityName: string): GameState {
  const unit = state.units.get(unitId);
  if (!unit) return state;
  if (unit.owner !== state.currentPlayerId) return state;
  // Only units with 'found_city' ability can found cities
  const unitDef = state.config.units.get(unit.typeId);
  if (!unitDef || !unitDef.abilities.includes('found_city')) return state;

  const pos = unit.position;
  const posKey = coordToKey(pos);

  // Can't found on water or impassable terrain
  const tile = state.map.tiles.get(posKey);
  if (!tile) return state;
  const terrainDef = state.config.terrains.get(tile.terrain);
  if (!terrainDef || terrainDef.isWater) return state;
  if (tile.feature) {
    const featureDef = state.config.features.get(tile.feature);
    if (featureDef?.blocksMovement) return state;
  }

  // Can't found too close to another city (minimum 4 hexes apart, Civ VII 3-tile buffer)
  for (const city of state.cities.values()) {
    if (distance(pos, city.position) < 4) return state; // too close
  }

  // Create territory — all hexes within radius 1
  const territory: string[] = [];
  for (const hex of range(pos, 1)) {
    const hexKey = coordToKey(hex);
    if (state.map.tiles.has(hexKey)) {
      // Check not already claimed by another city
      let claimed = false;
      for (const city of state.cities.values()) {
        if (city.territory.includes(hexKey)) {
          claimed = true;
          break;
        }
      }
      if (!claimed) territory.push(hexKey);
    }
  }

  const cityId = nextCityId(state);
  const isFirstCity = !playerHasCity(state, unit.owner);
  const settlementType: SettlementType = isFirstCity ? 'city' : 'town';

  // Create city_center district automatically
  const districtId = `district_city_center_${cityId}`;
  const newDistrict = {
    id: districtId,
    type: 'city_center' as const,
    position: pos,
    cityId: cityId,
    level: 1,
    buildings: isFirstCity ? ['palace'] : [],
    adjacencyBonus: 0,
  };

  const newCity: CityState = {
    id: cityId,
    name: cityName,
    owner: unit.owner,
    position: pos,
    population: 1,
    food: 0,
    productionQueue: [],
    productionProgress: 0,
    buildings: isFirstCity ? ['palace'] : [], // Capital gets Palace auto-built
    territory,
    settlementType,
    happiness: isFirstCity ? 15 : (settlementType === 'city' ? 10 : 5), // Palace adds +5 happiness
    isCapital: isFirstCity,
    defenseHP: 100, // base defense; walls add +100 when built
    specialization: null,
    specialists: 0,
    districts: [districtId], // Start with city center district
  };

  // Remove settler unit
  const updatedUnits = new Map(state.units);
  updatedUnits.delete(unitId);

  // Add city
  const updatedCities = new Map(state.cities);
  updatedCities.set(cityId, newCity);

  // Add district
  const updatedDistricts = new Map(state.districts);
  updatedDistricts.set(districtId, newDistrict);

  // Palace is auto-built in the capital and auto-placed on the city-center
  // tile — it should never enter the normal PLACE_BUILDING placement flow.
  // Marking tile.building = 'palace' here makes the UI treat it as already
  // placed, so the "NEEDS PLACEMENT" flag never fires for the Palace.
  let updatedMap = state.map;
  if (isFirstCity) {
    const centerTile = state.map.tiles.get(posKey);
    if (centerTile && !centerTile.building) {
      const nextTiles = new Map(state.map.tiles);
      nextTiles.set(posKey, { ...centerTile, building: 'palace' });
      updatedMap = { ...state.map, tiles: nextTiles };
    }
  }

  return {
    ...state,
    units: updatedUnits,
    cities: updatedCities,
    districts: updatedDistricts,
    map: updatedMap,
    log: [...state.log, {
      turn: state.turn,
      playerId: state.currentPlayerId,
      message: `${cityName} founded at (${pos.q}, ${pos.r})`,
      type: 'city',
    }],
  };
}

function handleUpgradeSettlement(state: GameState, cityId: string): GameState {
  const city = state.cities.get(cityId);
  if (!city) return state;
  if (city.owner !== state.currentPlayerId) return state;
  if (city.settlementType !== 'town') return state;

  const upgradeCost = 100;
  const player = state.players.get(state.currentPlayerId);
  if (!player || player.gold < upgradeCost) return state;

  const updatedPlayers = new Map(state.players);
  updatedPlayers.set(player.id, { ...player, gold: player.gold - upgradeCost });

  const updatedCities = new Map(state.cities);
  updatedCities.set(cityId, {
    ...city,
    settlementType: 'city',
    happiness: 10,
  });

  return {
    ...state,
    players: updatedPlayers,
    cities: updatedCities,
    log: [...state.log, {
      turn: state.turn,
      playerId: state.currentPlayerId,
      message: `${city.name} upgraded to a City`,
      type: 'city',
    }],
  };
}

function handlePurchaseTile(state: GameState, cityId: string, tileCoord: HexCoord): GameState {
  const city = state.cities.get(cityId);
  if (!city) return state;
  if (city.owner !== state.currentPlayerId) return state;

  const tileKey = coordToKey(tileCoord);
  if (!state.map.tiles.has(tileKey)) return state;
  if (city.territory.includes(tileKey)) return state; // already owned

  // Must be adjacent to existing territory
  const isAdjacent = city.territory.some(existingKey => {
    const existing = state.map.tiles.get(existingKey);
    if (!existing) return false;
    for (const hex of range(existing.coord, 1)) {
      if (coordToKey(hex) === tileKey) return true;
    }
    return false;
  });
  if (!isAdjacent) return state;

  // Check not claimed by another city
  for (const otherCity of state.cities.values()) {
    if (otherCity.id !== cityId && otherCity.territory.includes(tileKey)) {
      return state;
    }
  }

  // Cost: 50 gold base
  const cost = 50;
  const player = state.players.get(state.currentPlayerId);
  if (!player || player.gold < cost) return state;

  const updatedPlayers = new Map(state.players);
  updatedPlayers.set(player.id, { ...player, gold: player.gold - cost });

  const updatedCities = new Map(state.cities);
  updatedCities.set(cityId, {
    ...city,
    territory: [...city.territory, tileKey],
  });

  return {
    ...state,
    players: updatedPlayers,
    cities: updatedCities,
  };
}
