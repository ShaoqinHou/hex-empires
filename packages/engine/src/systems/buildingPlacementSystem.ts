import type { GameState, GameAction, HexCoord, CityId, BuildingId, ValidationResult } from '../types';
import { coordToKey } from '../hex/HexMath';

/**
 * Building Placement System
 *
 * Handles placing buildings on specific tiles within city territory.
 * This is a key Civ 7 mechanic where buildings must be placed on tiles,
 * not just added to a city's building list.
 *
 * Validation rules:
 * - City must exist and belong to current player
 * - Building must be a valid building type
 * - Tile must be within city's territory
 * - Tile must not already have a building
 * - Some buildings have placement restrictions (distance from city center, terrain requirements, etc.)
 */

function validateBuildingPlacement(
  state: GameState,
  cityId: CityId,
  buildingId: BuildingId,
  tile: HexCoord
): ValidationResult {
  // Check city exists and belongs to current player
  const city = state.cities.get(cityId);
  if (!city) {
    return { valid: false, reason: 'City not found', category: 'general' };
  }

  if (city.owner !== state.currentPlayerId) {
    return { valid: false, reason: 'Cannot place buildings in foreign cities', category: 'general' };
  }

  // Check building is valid
  const building = state.config.buildings.get(buildingId);
  if (!building) {
    return { valid: false, reason: 'Invalid building type', category: 'general' };
  }

  // Check tile is in city territory
  const tileKey = coordToKey(tile);
  if (!city.territory.includes(tileKey)) {
    return { valid: false, reason: 'Tile must be within city territory', category: 'general' };
  }

  // Get the actual tile
  const actualTile = state.map.tiles.get(tileKey);
  if (!actualTile) {
    return { valid: false, reason: 'Tile not found on map', category: 'general' };
  }

  // Check tile doesn't already have a building
  if (actualTile.building) {
    return { valid: false, reason: 'Tile already has a building', category: 'general' };
  }

  // Check building is in the city's building list (has been produced)
  if (!city.buildings.includes(buildingId)) {
    return { valid: false, reason: 'Building has not been constructed yet', category: 'production' };
  }

  // Specific placement restrictions for certain building categories
  // Military buildings: can be placed anywhere in territory
  // Science buildings: prefer tiles near city center (within 2 tiles)
  // Gold buildings: prefer tiles with resources or near trade routes
  // Culture buildings: prefer tiles with high appeal (forests, mountains nearby)
  // These are soft restrictions - we'll warn but not prevent placement

  // For now, all the above validations pass
  return { valid: true };
}

export function buildingPlacementSystem(state: GameState, action: GameAction): GameState {
  if (action.type !== 'PLACE_BUILDING') {
    return state;
  }

  const { cityId, buildingId, tile } = action;

  // Validate the placement
  const validation = validateBuildingPlacement(state, cityId, buildingId, tile);
  if (!validation.valid) {
    return {
      ...state,
      lastValidation: validation,
    };
  }

  // Get the city and building info
  const city = state.cities.get(cityId)!;
  const building = state.config.buildings.get(buildingId)!;

  // Update the tile with the building
  const tileKey = coordToKey(tile);
  const updatedTile = {
    ...state.map.tiles.get(tileKey)!,
    building: buildingId,
  };

  const updatedTiles = new Map(state.map.tiles);
  updatedTiles.set(tileKey, updatedTile);

  return {
    ...state,
    map: {
      ...state.map,
      tiles: updatedTiles,
    },
    log: [...state.log, {
      turn: state.turn,
      playerId: state.currentPlayerId,
      message: `Placed ${building.name} in ${city.name}`,
      type: 'production' as const,
    }],
    lastValidation: { valid: true },
  };
}
