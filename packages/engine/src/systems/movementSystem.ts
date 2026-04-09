import type { GameState, GameAction } from '../types/GameState';
import { coordToKey, distance } from '../hex/HexMath';
import { getMovementCost } from '../hex/TerrainCost';

/**
 * MovementSystem handles unit movement actions.
 * Validates movement paths and deducts movement points.
 */
export function movementSystem(state: GameState, action: GameAction): GameState {
  if (action.type !== 'MOVE_UNIT') return state;

  const unit = state.units.get(action.unitId);
  if (!unit) return state;
  if (unit.owner !== state.currentPlayerId) return state;
  if (action.path.length === 0) return state;

  // Validate and calculate total movement cost
  let totalCost = 0;
  let prevCoord = unit.position;

  for (const nextCoord of action.path) {
    // Each step must be adjacent
    if (distance(prevCoord, nextCoord) !== 1) return state;

    // Check target tile exists and is passable
    const tile = state.map.tiles.get(coordToKey(nextCoord));
    if (!tile) return state;

    const cost = getMovementCost(tile);
    if (cost === null) return state; // impassable

    totalCost += cost;
    prevCoord = nextCoord;
  }

  // Check unit has enough movement
  if (totalCost > unit.movementLeft) return state;

  // Check destination isn't occupied by another unit of the same player
  const destination = action.path[action.path.length - 1];
  const destKey = coordToKey(destination);
  for (const [id, other] of state.units) {
    if (id !== unit.id && other.owner === unit.owner && coordToKey(other.position) === destKey) {
      return state; // can't stack friendly units
    }
  }

  // Apply movement
  const updatedUnits = new Map(state.units);
  updatedUnits.set(unit.id, {
    ...unit,
    position: destination,
    movementLeft: unit.movementLeft - totalCost,
    fortified: false, // moving breaks fortification
  });

  return {
    ...state,
    units: updatedUnits,
    log: [...state.log, {
      turn: state.turn,
      playerId: state.currentPlayerId,
      message: `${unit.typeId} moved to (${destination.q}, ${destination.r})`,
      type: 'move',
    }],
  };
}

// Re-export getMovementCost from shared utility for backward compatibility
export { getMovementCost } from '../hex/TerrainCost';
