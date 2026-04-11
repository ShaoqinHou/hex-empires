/**
 * District System
 *
 * Handles district construction, placement, and management.
 * Districts are specialized zones that contain buildings and provide adjacency bonuses.
 */

import type { GameState, GameAction } from '../types/GameState';
import type { DistrictSlot, DistrictDef } from '../types/District';
import { coordToKey } from '../hex/HexMath';

/**
 * Generate deterministic district ID from state
 */
function nextDistrictId(state: GameState, cityId: string): string {
  return `district_${state.districts.size + 1}_${cityId}_t${state.turn}`;
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
 * DistrictSystem processes district-related actions.
 * Handles PLACE_DISTRICT and UPGRADE_DISTRICT actions.
 */
export function districtSystem(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'PLACE_DISTRICT':
      return handlePlaceDistrict(state, action.cityId, action.districtId, action.tile);
    case 'UPGRADE_DISTRICT':
      return handleUpgradeDistrict(state, action.districtId);
    default:
      return state;
  }
}

/**
 * Handle district placement
 */
function handlePlaceDistrict(
  state: GameState,
  cityId: string,
  districtId: string,
  tile: any,
): GameState {
  const city = state.cities.get(cityId);
  if (!city) return createInvalidResult(state, 'City not found', 'production');
  if (city.owner !== state.currentPlayerId) return createInvalidResult(state, 'Not your city', 'production');

  // Get district definition
  const districtDef = state.config.districts.get(districtId);
  if (!districtDef) return createInvalidResult(state, 'District definition not found', 'production');

  // Check if city already has this district type
  const cityDistricts = city.districts.map(did => state.districts.get(did)).filter((d): d is DistrictSlot => d !== undefined);
  const hasSameType = cityDistricts.some(d => d.type === districtDef.type);
  if (hasSameType && districtDef.type !== 'city_center') {
    return createInvalidResult(state, 'City already has this district type', 'production');
  }

  // Check if player has researched required tech
  const player = state.players.get(state.currentPlayerId);
  if (!player) return createInvalidResult(state, 'Player not found', 'production');

  if (districtDef.requiredTech && !player.researchedTechs.includes(districtDef.requiredTech)) {
    return createInvalidResult(state, `Required tech: ${districtDef.requiredTech}`, 'production');
  }

  // Check if player has researched required civic
  if (districtDef.requiredCivic && !player.researchedCivics.includes(districtDef.requiredCivic)) {
    return createInvalidResult(state, `Required civic: ${districtDef.requiredCivic}`, 'production');
  }

  // Check if city has enough population
  const usedPopulation = cityDistricts.reduce((sum, d) => {
    const def = state.config.districts.get(d.type);
    return sum + (def?.populationCost || 0);
  }, 0);

  if (usedPopulation + districtDef.populationCost > city.population) {
    return createInvalidResult(state, `Not enough population (need ${districtDef.populationCost}, have ${city.population - usedPopulation})`, 'production');
  }

  // Check if tile is within city territory
  const tileKey = coordToKey(tile);
  if (!city.territory.includes(tileKey)) {
    return createInvalidResult(state, 'Tile must be within city territory', 'production');
  }

  // Check if tile already has a district
  const existingDistrict = [...state.districts.values()].find(d => {
    const dTileKey = coordToKey(d.position);
    return dTileKey === tileKey;
  });
  if (existingDistrict) {
    return createInvalidResult(state, 'Tile already has a district', 'production');
  }

  // Check placement constraints
  const constraintError = validatePlacementConstraints(districtDef, tile, city, state);
  if (constraintError) {
    return createInvalidResult(state, constraintError, 'production');
  }

  // Create the district slot
  const newDistrict: DistrictSlot = {
    id: nextDistrictId(state, cityId),
    type: districtDef.type,
    position: tile,
    cityId: cityId,
    level: 1,
    buildings: [],
    adjacencyBonus: calculateAdjacencyBonus(districtDef, tile, state),
  };

  // Update state
  const updatedDistricts = new Map(state.districts);
  updatedDistricts.set(newDistrict.id, newDistrict);

  const updatedCities = new Map(state.cities);
  updatedCities.set(cityId, {
    ...city,
    districts: [...city.districts, newDistrict.id],
  });

  const newLog = [...state.log, {
    turn: state.turn,
    playerId: city.owner,
    message: `${city.name} constructed ${districtDef.name}`,
    type: 'production' as const,
  }];

  return {
    ...state,
    districts: updatedDistricts,
    cities: updatedCities,
    log: newLog,
    lastValidation: null,
  };
}

/**
 * Handle district upgrade
 */
function handleUpgradeDistrict(
  state: GameState,
  districtId: string,
): GameState {
  const district = state.districts.get(districtId);
  if (!district) return createInvalidResult(state, 'District not found', 'production');

  const city = state.cities.get(district.cityId);
  if (!city) return createInvalidResult(state, 'City not found', 'production');
  if (city.owner !== state.currentPlayerId) return createInvalidResult(state, 'Not your district', 'production');

  const districtDef = state.config.districts.get(district.type);
  if (!districtDef) return createInvalidResult(state, 'District definition not found', 'production');

  // Check if district is already at max level
  if (district.level >= districtDef.maxLevel) {
    return createInvalidResult(state, 'District is already at max level', 'production');
  }

  // Check if city has enough population to support higher level
  if (city.population < district.level + 1) {
    return createInvalidResult(state, `Need population ${district.level + 1} to upgrade district`, 'production');
  }

  // Upgrade the district
  const updatedDistricts = new Map(state.districts);
  updatedDistricts.set(districtId, {
    ...district,
    level: district.level + 1,
  });

  const newLog = [...state.log, {
    turn: state.turn,
    playerId: city.owner,
    message: `${city.name}'s ${districtDef.name} upgraded to level ${district.level + 1}`,
    type: 'production' as const,
  }];

  return {
    ...state,
    districts: updatedDistricts,
    log: newLog,
    lastValidation: null,
  };
}

/**
 * Validate placement constraints
 */
function validatePlacementConstraints(
  districtDef: DistrictDef,
  tile: any,
  city: any,
  state: GameState,
): string | null {
  const constraint = districtDef.placementConstraint;
  if (!constraint) return null;

  const tileKey = coordToKey(tile);
  const mapTile = state.map.tiles.get(tileKey);
  if (!mapTile) return 'Tile not found on map';

  // Check if must be on coast
  if (constraint.mustBeOnCoast) {
    const isCoast = [...neighbors(tile)].some(n => {
      const nTile = state.map.tiles.get(coordToKey(n));
      return nTile?.terrain === 'coast' || nTile?.terrain === 'ocean';
    });
    if (!isCoast) {
      return 'District must be placed adjacent to water';
    }
  }

  // Check distance constraints
  const distFromCity = distance(tile, city.position);
  if (constraint.minDistanceFromCity !== undefined && distFromCity < constraint.minDistanceFromCity) {
    return `District must be at least ${constraint.minDistanceFromCity} tiles from city center`;
  }
  if (constraint.maxDistanceFromCity !== undefined && distFromCity > constraint.maxDistanceFromCity) {
    return `District must be no more than ${constraint.maxDistanceFromCity} tiles from city center`;
  }

  // Check if must be adjacent to specific district types
  if (constraint.mustBeAdjacentToDistrictType && constraint.mustBeAdjacentToDistrictType.length > 0) {
    const adjacentTiles = neighbors(tile);
    const hasAdjacentDistrict = adjacentTiles.some(n => {
      const nTileKey = coordToKey(n);
      const adjacentDistrict = [...state.districts.values()].find(d => {
        const dTileKey = coordToKey(d.position);
        return dTileKey === nTileKey && d.cityId === city.id;
      });
      if (!adjacentDistrict) return false;
      return constraint.mustBeAdjacentToDistrictType!.includes(adjacentDistrict.type);
    });

    if (!hasAdjacentDistrict) {
      return `District must be adjacent to ${constraint.mustBeAdjacentToDistrictType.join(' or ')}`;
    }
  }

  return null;
}

/**
 * Calculate adjacency bonus for a district
 */
function calculateAdjacencyBonus(
  districtDef: DistrictDef,
  position: any,
  state: GameState,
): number {
  const adjacentTiles = neighbors(position);
  let bonus = 0;

  for (const adj of adjacentTiles) {
    const tileKey = coordToKey(adj);
    const tile = state.map.tiles.get(tileKey);
    if (!tile) continue;

    // Check for adjacent districts
    const adjacentDistrict = [...state.districts.values()].find(d => {
      const dTileKey = coordToKey(d.position);
      return dTileKey === tileKey;
    });
    if (adjacentDistrict) {
      bonus += 1;
    }

    // Check for terrain features (mountains, woods, etc.)
    // This is a simplified version - the full implementation would check
    // district-specific adjacency rules
  }

  return bonus;
}

// Import helper functions
import { neighbors, distance } from '../hex/HexMath';
