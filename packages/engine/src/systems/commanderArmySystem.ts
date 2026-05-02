import type { GameState, GameAction, UnitState } from '../types/GameState';
import type { CommanderState } from '../types/Commander';
import { COMMANDER_BASE_STACK_CAP } from '../types/Commander';
import { distance, neighbors } from '../hex/HexMath';

/** Max units that can be packed via PACK_ARMY (X4.1 — remove-from-map semantics) */
const PACK_ARMY_CAP = 6 as const;

/**
 * Commander Army Pack / Unpack system — W4-04.
 *
 * Handles two actions:
 *   ASSEMBLE_ARMY — commander gathers up to COMMANDER_BASE_STACK_CAP adjacent
 *                   same-owner units into a stack. Sets `packedInCommanderId`
 *                   on each unit and marks `commander.packed = true`.
 *   DEPLOY_ARMY   — commander disperses its army. Clears `packedInCommanderId`
 *                   on every attached unit and marks `commander.packed = false`.
 *
 * Validation rules for ASSEMBLE_ARMY:
 *   1. Commander must exist in state.commanders AND state.units.
 *   2. Each unitId must exist in state.units.
 *   3. Each unit must be owned by the same player as the commander unit.
 *   4. Each unit must be adjacent (distance ≤ 1) to the commander's position.
 *   5. Total unitIds count must be ≤ COMMANDER_BASE_STACK_CAP (4).
 *   6. No unit may already be packed into a different commander.
 *
 * Age persistence (F-08):
 *   This system does NOT handle TRANSITION_AGE — ageSystem does not clear
 *   state.commanders, so commander state persists across age transitions by
 *   default. No special handling is needed here.
 */


export function commanderArmySystem(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'ASSEMBLE_ARMY':
      return handleAssemble(state, action.commanderId, action.unitIds);
    case 'DEPLOY_ARMY':
      return handleDeploy(state, action.commanderId);
    case 'PACK_ARMY':
      return handlePackArmy(state, action.commanderId, action.unitsToPack);
    case 'UNPACK_ARMY':
      return handleUnpackArmy(state, action.commanderId);
    default:
      return state;
  }
}

// ── ASSEMBLE_ARMY ──

function handleAssemble(
  state: GameState,
  commanderId: string,
  unitIds: ReadonlyArray<string>,
): GameState {
  const commanders = state.commanders;
  if (!commanders) return state;

  const commander = commanders.get(commanderId);
  if (!commander) return state;

  const commanderUnit = state.units.get(commanderId);
  if (!commanderUnit) return state;

  // Validate count
  if (unitIds.length === 0) return state;
  if (unitIds.length > COMMANDER_BASE_STACK_CAP) return state;

  // Validate each unit
  const resolvedUnits: UnitState[] = [];
  for (const uid of unitIds) {
    const unit = state.units.get(uid);
    if (!unit) return state;
    // Must be same owner
    if (unit.owner !== commanderUnit.owner) return state;
    // Must be adjacent (distance ≤ 1) to commander
    if (distance(unit.position, commanderUnit.position) > 1) return state;
    // Must not already be packed in a *different* commander
    if (unit.packedInCommanderId != null && unit.packedInCommanderId !== commanderId) return state;
    resolvedUnits.push(unit);
  }

  // Apply: set packedInCommanderId on each unit
  const nextUnits = new Map(state.units);
  for (const unit of resolvedUnits) {
    nextUnits.set(unit.id, { ...unit, packedInCommanderId: commanderId });
  }

  // Update commander state: record attachedUnits and set packed=true
  const updatedCommander: CommanderState = {
    ...commander,
    attachedUnits: unitIds,
    packed: true,
  };
  const nextCommanders = new Map(commanders);
  nextCommanders.set(commanderId, updatedCommander);

  return { ...state, units: nextUnits, commanders: nextCommanders };
}

// ── DEPLOY_ARMY ──

function handleDeploy(state: GameState, commanderId: string): GameState {
  const commanders = state.commanders;
  if (!commanders) return state;

  const commander = commanders.get(commanderId);
  if (!commander) return state;

  if (!commander.packed) return state;

  const commanderUnit = state.units.get(commanderId);
  if (!commanderUnit) return state;
  const deployWithMovement = commanderDeploysWithMovement(state, commanderUnit, commander);

  // Determine adjacent tiles for placement
  const adjacentTiles = neighbors(commanderUnit.position);

  // Clear packedInCommanderId on all attached units and reposition them
  // to adjacent tiles around the commander's current position.
  const nextUnits = new Map(state.units);
  const unitIds = commander.attachedUnits;
  for (let i = 0; i < unitIds.length; i++) {
    const uid = unitIds[i];
    const unit = nextUnits.get(uid);
    if (unit && unit.packedInCommanderId === commanderId) {
      const targetPos = adjacentTiles[i % adjacentTiles.length];
      nextUnits.set(uid, {
        ...unit,
        packedInCommanderId: null,
        position: targetPos,
        movementLeft: deployWithMovement ? unit.movementLeft : 0,
      });
    }
  }

  // Update commander state: clear attachedUnits and set packed=false
  const updatedCommander: CommanderState = {
    ...commander,
    attachedUnits: [],
    packed: false,
  };
  const nextCommanders = new Map(commanders);
  nextCommanders.set(commanderId, updatedCommander);

  return { ...state, units: nextUnits, commanders: nextCommanders };
}

// ── PACK_ARMY (X4.1) ──
// Removes packed units entirely from state.units; stores full UnitState snapshots
// in CommanderState.packedUnitStates so UNPACK_ARMY can restore them.

function handlePackArmy(
  state: GameState,
  commanderId: string,
  unitsToPack: ReadonlyArray<string>,
): GameState {
  const commanders = state.commanders;
  if (!commanders) return state;

  const commander = commanders.get(commanderId);
  if (!commander) return state;

  const commanderUnit = state.units.get(commanderId);
  if (!commanderUnit) return state;

  // Validate count (cap is 6 for PACK_ARMY)
  if (unitsToPack.length === 0) return state;
  if (unitsToPack.length > PACK_ARMY_CAP) return state;

  // Validate each unit
  const resolvedUnits: UnitState[] = [];
  for (const uid of unitsToPack) {
    const unit = state.units.get(uid);
    if (!unit) return state;
    // Must be same owner
    if (unit.owner !== commanderUnit.owner) return state;
    // Must be adjacent (distance ≤ 1) to commander
    if (distance(unit.position, commanderUnit.position) > 1) return state;
    // Must not already be packed in a different commander
    if (unit.packedInCommanderId != null && unit.packedInCommanderId !== commanderId) return state;
    resolvedUnits.push(unit);
  }

  // Apply: remove units from state.units, store snapshots in commander
  const nextUnits = new Map(state.units);
  for (const unit of resolvedUnits) {
    nextUnits.delete(unit.id);
  }

  const updatedCommander: CommanderState = {
    ...commander,
    attachedUnits: unitsToPack,
    packedUnitStates: resolvedUnits,
    packed: true,
  };
  const nextCommanders = new Map(commanders);
  nextCommanders.set(commanderId, updatedCommander);

  return { ...state, units: nextUnits, commanders: nextCommanders };
}

// ── UNPACK_ARMY (X4.1) ──
// Restores packed unit snapshots from CommanderState.packedUnitStates back into
// state.units. Units are repositioned to adjacent tiles around the commander.
// Fails if there is no room (all adjacent tiles are occupied).

function handleUnpackArmy(state: GameState, commanderId: string): GameState {
  const commanders = state.commanders;
  if (!commanders) return state;

  const commander = commanders.get(commanderId);
  if (!commander) return state;
  if (!commander.packed) return state;

  const commanderUnit = state.units.get(commanderId);
  if (!commanderUnit) return state;
  const deployWithMovement = commanderDeploysWithMovement(state, commanderUnit, commander);

  const packedUnits = commander.packedUnitStates ?? [];
  if (packedUnits.length === 0) return state;

  // Determine available placement tiles: adjacent to commander (not commander's own tile)
  const adjacentTiles = neighbors(commanderUnit.position);
  const occupiedKeys = new Set<string>();
  for (const [, u] of state.units) {
    occupiedKeys.add(`${u.position.q},${u.position.r}`);
  }

  const freeTiles = adjacentTiles.filter((tile) => {
    const key = `${tile.q},${tile.r}`;
    return !occupiedKeys.has(key);
  });

  // Need enough room for all packed units
  if (freeTiles.length < packedUnits.length) return state;

  // Apply: restore units to state.units at adjacent free positions
  const nextUnits = new Map(state.units);
  for (let i = 0; i < packedUnits.length; i++) {
    const unit = packedUnits[i];
    const targetPos = freeTiles[i];
    nextUnits.set(unit.id, {
      ...unit,
      position: targetPos,
      packedInCommanderId: null,
      movementLeft: deployWithMovement ? unit.movementLeft : 0,
    });
  }

  const updatedCommander: CommanderState = {
    ...commander,
    attachedUnits: [],
    packedUnitStates: [],
    packed: false,
  };
  const nextCommanders = new Map(commanders);
  nextCommanders.set(commanderId, updatedCommander);

  return { ...state, units: nextUnits, commanders: nextCommanders };
}

function commanderDeploysWithMovement(
  state: GameState,
  commanderUnit: UnitState,
  commander: CommanderState,
): boolean {
  const promotionIds = new Set([
    ...commander.promotions,
    ...commanderUnit.promotions,
  ]);

  for (const promotionId of promotionIds) {
    const promotion = state.config.commanderPromotions?.get(promotionId);
    if (promotion?.aura.type === 'AURA_DEPLOY_WITH_MOVEMENT') return true;
  }

  return false;
}
