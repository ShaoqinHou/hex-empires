/**
 * District System
 *
 * Handles district construction, placement, and management.
 * Districts are specialized zones that contain buildings and provide adjacency bonuses.
 */

import type { GameState, GameAction } from '../types/GameState';

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
 * Handles UPGRADE_DISTRICT actions. District placement is handled by
 * productionSystem (queued via SET_PRODUCTION/END_TURN pipeline).
 */
export function districtSystem(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'UPGRADE_DISTRICT':
      return handleUpgradeDistrict(state, action.districtId);
    default:
      return state;
  }
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


