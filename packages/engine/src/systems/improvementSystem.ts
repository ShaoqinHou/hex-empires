import type { GameState, GameAction } from '../types/GameState';
import type { ImprovementDef } from '../types/Improvement';
import { coordToKey } from '../hex/HexMath';

/**
 * ImprovementSystem handles tile improvement construction
 * Builder units can construct improvements on tiles
 */
export function improvementSystem(state: GameState, action: GameAction): GameState {
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
