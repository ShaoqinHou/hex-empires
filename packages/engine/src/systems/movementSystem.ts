import type { GameState, GameAction, UnitState } from '../types/GameState';
import { coordToKey, distance, neighbors } from '../hex/HexMath';
import type { HexCoord } from '../types/HexCoord';
import { getMovementCost } from '../hex/TerrainCost';
import { enqueueDiscoveryEvent } from '../state/narrativeEventUtils';

/**
 * MovementSystem handles unit movement actions.
 * Validates movement paths and deducts movement points.
 * Enforces Zone of Control — entering a hex adjacent to an enemy unit stops movement.
 * Also handles SKIP_UNIT (expend all movement) and DELETE_UNIT (disband unit).
 */
export function movementSystem(state: GameState, action: GameAction): GameState {
  if (action.type === 'SKIP_UNIT') {
    const unit = state.units.get(action.unitId);
    if (!unit || unit.owner !== state.currentPlayerId) return state;
    const updatedUnits = new Map(state.units);
    updatedUnits.set(unit.id, { ...unit, movementLeft: 0 });
    return { ...state, units: updatedUnits, lastValidation: null };
  }

  if (action.type === 'DELETE_UNIT') {
    const unit = state.units.get(action.unitId);
    if (!unit || unit.owner !== state.currentPlayerId) return state;
    const updatedUnits = new Map(state.units);
    updatedUnits.delete(action.unitId);
    return {
      ...state,
      units: updatedUnits,
      log: [...state.log, {
        turn: state.turn,
        playerId: state.currentPlayerId,
        message: `${unit.typeId} was disbanded`,
        type: 'move' as const,
      }],
      lastValidation: null,
    };
  }

  if (action.type === 'UPGRADE_UNIT') {
    const unit = state.units.get(action.unitId);
    if (!unit || unit.owner !== state.currentPlayerId) {
      return createInvalidResult(state, 'Unit not found or not yours', 'movement');
    }
    const currentDef = state.config.units.get(unit.typeId);
    if (!currentDef || !currentDef.upgradesTo) {
      return createInvalidResult(state, 'This unit has no upgrade path', 'movement');
    }
    const targetDef = state.config.units.get(currentDef.upgradesTo);
    if (!targetDef) {
      return createInvalidResult(state, `Upgrade target '${currentDef.upgradesTo}' not found`, 'movement');
    }
    // Check required tech
    const player = state.players.get(state.currentPlayerId);
    if (!player) return state;
    if (targetDef.requiredTech && !player.researchedTechs.includes(targetDef.requiredTech)) {
      return createInvalidResult(state, `Requires tech: ${targetDef.requiredTech}`, 'movement');
    }
    // Cost: 2x the target unit's production cost in gold
    const upgradeCost = targetDef.cost * 2;
    if (player.gold < upgradeCost) {
      return createInvalidResult(state, `Not enough gold (need ${upgradeCost}, have ${Math.floor(player.gold)})`, 'movement');
    }
    // Deduct gold and upgrade the unit
    const updatedPlayers = new Map(state.players);
    updatedPlayers.set(player.id, { ...player, gold: player.gold - upgradeCost });
    const updatedUnits = new Map(state.units);
    updatedUnits.set(unit.id, {
      ...unit,
      typeId: currentDef.upgradesTo,
      movementLeft: 0, // upgrading consumes the whole turn
      fortified: false,
    });
    return {
      ...state,
      players: updatedPlayers,
      units: updatedUnits,
      log: [...state.log, {
        turn: state.turn,
        playerId: state.currentPlayerId,
        message: `${currentDef.name} upgraded to ${targetDef.name} for ${upgradeCost}g`,
        type: 'move' as const,
      }],
      lastValidation: null,
    };
  }

  if (action.type !== 'MOVE_UNIT') return state;

  const unit = state.units.get(action.unitId);
  if (!unit) return createInvalidResult(state, 'Unit not found', 'movement');
  if (unit.owner !== state.currentPlayerId) return createInvalidResult(state, 'Not your turn or unit', 'movement');
  if (action.path.length === 0) return createInvalidResult(state, 'Empty movement path', 'movement');
  if (unit.movementLeft <= 0) return createInvalidResult(state, 'Unit has no movement left', 'movement');

  // First pass: validate entire path for adjacency and passability
  let totalCost = 0;
  let prevCoord = unit.position;

  for (const nextCoord of action.path) {
    // Each step must be adjacent
    if (distance(prevCoord, nextCoord) !== 1) {
      return createInvalidResult(state, 'Movement path must be adjacent hexes', 'movement');
    }

    // Check target tile exists and is passable
    const tile = state.map.tiles.get(coordToKey(nextCoord));
    if (!tile) return createInvalidResult(state, 'Target tile does not exist', 'movement');

    const cost = getMovementCost(tile);
    if (cost === null) return createInvalidResult(state, 'Terrain is impassable', 'movement');

    totalCost += cost;
    prevCoord = nextCoord;
  }

  // Check unit has enough movement
  if (totalCost > unit.movementLeft) {
    return createInvalidResult(state, 'Not enough movement points', 'movement');
  }

  // Civ VII stacking rule: 1 military + 1 civilian/religious per tile.
  // Reject only if moving unit and occupant share the same class.
  const movingClass = getStackClass(unit, state);
  const finalDest = action.path[action.path.length - 1];
  const finalDestKey = coordToKey(finalDest);
  for (const [id, other] of state.units) {
    if (id === unit.id) continue;
    if (coordToKey(other.position) !== finalDestKey) continue;
    if (other.owner !== unit.owner) continue;
    const otherClass = getStackClass(other, state);
    if (otherClass === movingClass) {
      return createInvalidResult(
        state,
        movingClass === 'military'
          ? 'Cannot stack two military units on the same tile'
          : 'Cannot stack two civilian units on the same tile',
        'movement',
      );
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

  // If ZoC stopped us at an intermediate position, check stacking and enemy occupation there
  if (stoppedByZoC && coordToKey(currentPos) !== finalDestKey) {
    const stopKey = coordToKey(currentPos);
    for (const [id, other] of state.units) {
      if (id === unit.id) continue;
      if (coordToKey(other.position) !== stopKey) continue;
      if (other.owner === unit.owner) {
        // Same class-based stacking rule applies at ZoC stop positions
        const otherClass = getStackClass(other, state);
        if (otherClass === movingClass) {
          return createInvalidResult(state, 'Cannot stack at Zone of Control stop position', 'movement');
        }
      } else {
        return createInvalidResult(state, 'Cannot move into a tile occupied by an enemy', 'movement');
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

  let nextState: GameState = {
    ...state,
    units: updatedUnits,
    log: [...state.log, {
      turn: state.turn,
      playerId: state.currentPlayerId,
      message: `${unit.typeId} moved to (${currentPos.q}, ${currentPos.r})`,
      type: 'move',
    }],
    lastValidation: null, // Clear validation after successful action
  };

  // F-06: Discovery tile trigger — if the destination tile has a discoveryId,
  // look up the DiscoveryDef and enqueue its narrativeEventId.
  // The tile's discoveryId is NOT cleared here (read-only map); the UI marks
  // it explored via a separate mechanism. Discovery events dedup via firedNarrativeEvents.
  const destTile = state.map.tiles.get(coordToKey(currentPos));
  if (destTile?.discoveryId && nextState.config.discoveries) {
    const discoveryDef = nextState.config.discoveries.get(destTile.discoveryId);
    if (discoveryDef) {
      nextState = enqueueDiscoveryEvent(nextState, discoveryDef.narrativeEventId);
    }
  }

  return nextState;
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
 * Classify a unit for stacking purposes.
 * Civ VII rule: one military + one civilian/religious unit per tile.
 * Unknown/missing unit defs default to 'military' to preserve the safer rule.
 */
function getStackClass(unit: UnitState, state: GameState): 'military' | 'civilian' {
  const def = state.config.units.get(unit.typeId);
  if (!def) return 'military';
  return def.category === 'civilian' || def.category === 'religious' ? 'civilian' : 'military';
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
