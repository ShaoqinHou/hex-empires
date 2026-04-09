import type { GameState, GameAction, UnitState } from '../types/GameState';
import { coordToKey, distance, neighbors } from '../hex/HexMath';
import type { HexCoord } from '../types/HexCoord';
import { getMovementCost } from '../hex/TerrainCost';

/**
 * MovementSystem handles unit movement actions.
 * Validates movement paths and deducts movement points.
 * Enforces Zone of Control — entering a hex adjacent to an enemy unit stops movement.
 */
export function movementSystem(state: GameState, action: GameAction): GameState {
  if (action.type !== 'MOVE_UNIT') return state;

  const unit = state.units.get(action.unitId);
  if (!unit) return state;
  if (unit.owner !== state.currentPlayerId) return state;
  if (action.path.length === 0) return state;

  // First pass: validate entire path for adjacency and passability
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

  // Check final destination isn't occupied by another unit of the same player
  // (We'll also check intermediate ZoC stop positions below)
  const finalDest = action.path[action.path.length - 1];
  const finalDestKey = coordToKey(finalDest);
  for (const [id, other] of state.units) {
    if (id !== unit.id && other.owner === unit.owner && coordToKey(other.position) === finalDestKey) {
      return state; // can't stack friendly units
    }
  }

  // Determine if unit is cavalry (ignores ZoC)
  const unitDef = state.config.units.get(unit.typeId);
  const isCavalry = unitDef?.category === 'cavalry';

  // Step-by-step movement with ZoC enforcement
  let movementSpent = 0;
  let currentPos = unit.position;
  let stoppedByZoC = false;

  for (const nextCoord of action.path) {
    const tile = state.map.tiles.get(coordToKey(nextCoord));
    const cost = getMovementCost(tile!);
    movementSpent += cost!;
    currentPos = nextCoord;

    // After moving to this hex, check ZoC (unless cavalry)
    if (!isCavalry && isInEnemyZoC(nextCoord, unit.owner, unit.id, state)) {
      stoppedByZoC = true;
      break;
    }
  }

  // If ZoC stopped us at an intermediate position, check stacking there
  if (stoppedByZoC && coordToKey(currentPos) !== finalDestKey) {
    const stopKey = coordToKey(currentPos);
    for (const [id, other] of state.units) {
      if (id !== unit.id && other.owner === unit.owner && coordToKey(other.position) === stopKey) {
        return state; // can't stack friendly units at ZoC stop position
      }
    }
  }

  // Apply movement
  const updatedUnits = new Map(state.units);
  updatedUnits.set(unit.id, {
    ...unit,
    position: currentPos,
    movementLeft: stoppedByZoC ? 0 : unit.movementLeft - movementSpent,
    fortified: false, // moving breaks fortification
  });

  return {
    ...state,
    units: updatedUnits,
    log: [...state.log, {
      turn: state.turn,
      playerId: state.currentPlayerId,
      message: `${unit.typeId} moved to (${currentPos.q}, ${currentPos.r})`,
      type: 'move',
    }],
  };
}

/**
 * Check if a hex is in the Zone of Control of any enemy non-civilian unit.
 * ZoC = the 6 hexes adjacent to each enemy military unit.
 */
function isInEnemyZoC(
  hex: HexCoord,
  unitOwner: string,
  unitId: string,
  state: GameState,
): boolean {
  const adjacentHexes = neighbors(hex);
  for (const adj of adjacentHexes) {
    const adjKey = coordToKey(adj);
    // Check if any enemy non-civilian unit is on an adjacent hex
    for (const [id, other] of state.units) {
      if (id === unitId) continue; // skip self
      if (other.owner === unitOwner) continue; // skip friendly units
      if (coordToKey(other.position) !== adjKey) continue;
      // Check if the enemy unit is non-civilian
      const otherDef = state.config.units.get(other.typeId);
      if (otherDef && otherDef.category !== 'civilian') {
        return true;
      }
    }
  }
  return false;
}

// Re-export getMovementCost from shared utility for backward compatibility
export { getMovementCost } from '../hex/TerrainCost';
