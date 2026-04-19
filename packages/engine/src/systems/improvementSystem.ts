import type { GameState, GameAction, PlayerState } from '../types/GameState';
import type { ImprovementDef } from '../types/Improvement';
import { coordToKey } from '../hex/HexMath';
import { deriveImprovementType } from '../state/ImprovementRules';

/**
 * ImprovementSystem handles tile improvement construction.
 *
 * Two action paths:
 *  - BUILD_IMPROVEMENT: legacy Builder-unit path (kept for backwards
 *    compatibility with existing tests; Builder was retired in W1-C so this
 *    handler has no live caller in the main game, but tests still cover it).
 *  - PLACE_IMPROVEMENT (W2-01): Civ VII flagship — player picks the tile,
 *    game derives the improvement type from terrain + resource via
 *    `deriveImprovementType`. Clears the corresponding pendingGrowthChoice.
 */
export function improvementSystem(state: GameState, action: GameAction): GameState {
  if (action.type === 'PLACE_IMPROVEMENT') {
    return handlePlaceImprovement(state, action.cityId, action.tile);
  }
  if (action.type !== 'BUILD_IMPROVEMENT') {
    return state;
  }

  const { unitId, tile, improvementId } = action;

  // Validate the action
  const unit = state.units.get(unitId);
  if (!unit) return state;

  const improvement = state.config.improvements.get(improvementId);
  if (!improvement) return state;

  const tileKey = coordToKey(tile);
  const currentTile = state.map.tiles.get(tileKey);
  if (!currentTile) return state;

  // Check if unit has build_improvement ability
  const unitDef = state.config.units.get(unit.typeId);
  if (!unitDef?.abilities.includes('build_improvement')) {
    return state;
  }

  // Check if unit is on the target tile
  const unitPosKey = coordToKey(unit.position);
  if (unitPosKey !== tileKey) {
    return state; // Builder must be on the tile to build
  }

  // Check if improvement already exists
  if (currentTile.improvement) {
    return state; // Tile already has an improvement
  }

  // Check prerequisites
  if (!meetsPrerequisites(currentTile, improvement, state)) {
    return state;
  }

  // Update the tile with the improvement
  const updatedTile = { ...currentTile, improvement: improvementId };
  const updatedTiles = new Map(state.map.tiles);
  updatedTiles.set(tileKey, updatedTile);

  // Consume the builder unit (improvements cost builder charges)
  const updatedUnits = new Map(state.units);
  updatedUnits.delete(unitId);

  return {
    ...state,
    map: { ...state.map, tiles: updatedTiles },
    units: updatedUnits,
    log: [...state.log, {
      turn: state.turn,
      playerId: state.currentPlayerId,
      message: `Built ${improvement.name} at (${tile.q}, ${tile.r})`,
      type: 'production',
    }],
  };
}

/**
 * Handle PLACE_IMPROVEMENT (W2-01 flagship).
 * Player picks the tile; game derives the improvement type.
 * Clears the pendingGrowthChoice for the named city.
 */
function handlePlaceImprovement(
  state: GameState,
  cityId: string,
  tile: { readonly q: number; readonly r: number },
): GameState {
  const city = state.cities.get(cityId);
  if (!city) return state;
  if (city.owner !== state.currentPlayerId) return state;

  const tileKey = coordToKey(tile);
  const currentTile = state.map.tiles.get(tileKey);
  if (!currentTile) return state;

  // Tile already improved — no-op
  if (currentTile.improvement) return state;

  // Game derives the improvement type (player does NOT specify it)
  const improvementId = deriveImprovementType(currentTile, state);
  if (!improvementId) return state;

  // Apply improvement to tile
  const updatedTile = { ...currentTile, improvement: improvementId };
  const updatedTiles = new Map(state.map.tiles);
  updatedTiles.set(tileKey, updatedTile);

  // Clear the pending growth choice for this city
  const player = state.players.get(state.currentPlayerId);
  if (!player) return state;
  const newPending = (player.pendingGrowthChoices ?? []).filter(
    c => c.cityId !== cityId,
  );
  const updatedPlayer: PlayerState = { ...player, pendingGrowthChoices: newPending };
  const updatedPlayers = new Map(state.players);
  updatedPlayers.set(state.currentPlayerId, updatedPlayer);

  const improvementDef = state.config.improvements.get(improvementId);
  const improvementName = improvementDef?.name ?? improvementId;

  return {
    ...state,
    map: { ...state.map, tiles: updatedTiles },
    players: updatedPlayers,
    log: [...state.log, {
      turn: state.turn,
      playerId: state.currentPlayerId,
      message: `${city.name}: placed ${improvementName} at (${tile.q}, ${tile.r})`,
      type: 'production',
    }],
  };
}

function meetsPrerequisites(
  tile: { readonly terrain: string; readonly feature: string | null; readonly resource: string | null },
  improvement: ImprovementDef,
  state: GameState
): boolean {
  // Check tech prerequisite
  if (improvement.requiredTech) {
    const player = state.players.get(state.currentPlayerId);
    if (!player || !player.researchedTechs.includes(improvement.requiredTech)) {
      return false;
    }
  }

  // Check terrain prerequisite
  if (improvement.prerequisites.terrain) {
    if (!improvement.prerequisites.terrain.includes(tile.terrain)) {
      return false;
    }
  }

  // Check feature prerequisite
  if (improvement.prerequisites.feature) {
    if (!tile.feature || !improvement.prerequisites.feature.includes(tile.feature)) {
      return false;
    }
  }

  // Check resource prerequisite
  if (improvement.prerequisites.resource) {
    if (!tile.resource || !improvement.prerequisites.resource.includes(tile.resource)) {
      return false;
    }
  }

  return true;
}
