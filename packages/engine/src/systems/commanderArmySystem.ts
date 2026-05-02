import type { GameState, GameAction, UnitState } from '../types/GameState';
import type { CommanderState } from '../types/Commander';
import { COMMANDER_BASE_STACK_CAP } from '../types/Commander';
import { coordToKey, distance, neighbors } from '../hex/HexMath';

const STACK_CAPACITY_PROMOTION_IDS: ReadonlySet<string> = new Set([
  'logistics_regiments',
]);

/**
 * Commander Army Pack / Unpack system — W4-04.
 *
 * Handles four actions:
 *   ASSEMBLE_ARMY / PACK_ARMY — pack adjacent same-owner units into snapshots
 *                                on CommanderState.
 *   DEPLOY_ARMY                 — unpack packed snapshots into adjacent tiles.
 *   UNPACK_ARMY                 — same as DEPLOY_ARMY.
 *
 * Validation rules for both pack actions:
 *   1. Commander must exist in state.commanders AND state.units.
 *   2. Each unitId must exist in state.units.
 *   3. Each unit must be owned by the same player as the commander unit.
 *   4. Each unit must be adjacent (distance ≤ 1) to the commander's position.
 *   5. Existing packed units plus new unitIds count must be ≤ cap
 *      (4 base, + promotion-driven stack expansion such as Regiments).
 *   6. No unit may already be packed into a different commander.
 *
 * Age persistence (F-08) is handled by ageSystem. This system only preserves
 * commander pack state when unrelated actions pass through.
 */
export function commanderArmySystem(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'ASSEMBLE_ARMY':
      return handlePack(state, action.commanderId, action.unitIds);
    case 'DEPLOY_ARMY':
      return handleDeploy(state, action.commanderId);
    case 'PACK_ARMY':
      return handlePack(state, action.commanderId, action.unitsToPack);
    case 'UNPACK_ARMY':
      return handleDeploy(state, action.commanderId);
    default:
      return state;
  }
}

// ── Shared pack helper for ASSEMBLE_ARMY + PACK_ARMY ──

function handlePack(
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
  const capacity = effectiveCommanderPackCapacity(state, commanderUnit, commander);

  // Validate count
  if (unitIds.length === 0) return state;
  if (unitIds.length > capacity) return state;

  const existingPackedUnits = existingPackedUnitSnapshots(state, commanderId, commander);
  if (!existingPackedUnits) return state;
  if (existingPackedUnits.length + unitIds.length > capacity) return state;

  const existingPackedUnitIds = new Set(existingPackedUnits.map((unit) => unit.id));

  // Validate each unit
  const resolvedUnits: UnitState[] = [];
  const seenUnitIds = new Set<string>();
  for (const uid of unitIds) {
    if (uid === commanderId) return state;
    if (seenUnitIds.has(uid)) return state;
    if (existingPackedUnitIds.has(uid)) return state;
    seenUnitIds.add(uid);

    const unit = state.units.get(uid);
    if (!unit) return state;
    if (unit.owner !== commanderUnit.owner) return state;
    if (distance(unit.position, commanderUnit.position) > 1) return state;
    if (unit.packedInCommanderId != null && unit.packedInCommanderId !== commanderId) return state;
    resolvedUnits.push(unit);
  }

  // Apply: remove packed units and store snapshots on commander state.
  const nextUnits = new Map(state.units);
  for (const unit of existingPackedUnits) {
    nextUnits.delete(unit.id);
  }
  for (const unit of resolvedUnits) {
    nextUnits.delete(unit.id);
  }

  const attachedUnits = [...existingPackedUnitIds, ...unitIds];
  const updatedCommander: CommanderState = {
    ...commander,
    attachedUnits,
    packedUnitStates: [...existingPackedUnits, ...resolvedUnits],
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

  const packedUnits = commander.packedUnitStates;
  if (packedUnits && packedUnits.length > 0) {
    return handlePackedUnitRestore(
      state,
      commander,
      commanderUnit,
      packedUnits,
      deployWithMovement,
    );
  }

  // Legacy fallback for old saved states that still keep units in state.units
  // with packedInCommanderId set.
  const nextUnits = new Map(state.units);
  const unitIds = commander.attachedUnits;
  const legacyUnits = unitIds.flatMap((uid) => {
    const unit = state.units.get(uid);
    return unit?.packedInCommanderId === commanderId ? [unit] : [];
  });
  const freeTiles = freeAdjacentMapTiles(
    state,
    commanderUnit,
    new Set(legacyUnits.map((unit) => unit.id)),
  );
  if (freeTiles.length < legacyUnits.length) return state;

  for (let i = 0; i < legacyUnits.length; i++) {
    const unit = legacyUnits[i];
    const targetPos = freeTiles[i];
    nextUnits.set(unit.id, {
      ...unit,
      packedInCommanderId: null,
      position: targetPos,
      movementLeft: deployWithMovement ? unit.movementLeft : 0,
    });
  }

  const nextCommanders = new Map(commanders);
  nextCommanders.set(commanderId, {
    ...commander,
    attachedUnits: [],
    packedUnitStates: [],
    packed: false,
  });

  return { ...state, units: nextUnits, commanders: nextCommanders };
}

function handlePackedUnitRestore(
  state: GameState,
  commander: CommanderState,
  commanderUnit: UnitState,
  packedUnits: ReadonlyArray<UnitState>,
  deployWithMovement: boolean,
): GameState {
  if (packedUnits.length === 0) return state;

  const freeTiles = freeAdjacentMapTiles(state, commanderUnit);

  // Need enough room for all packed units.
  if (freeTiles.length < packedUnits.length) return state;

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

  const nextCommanders = new Map(state.commanders!);
  nextCommanders.set(commander.unitId, {
    ...commander,
    attachedUnits: [],
    packedUnitStates: [],
    packed: false,
  });

  return { ...state, units: nextUnits, commanders: nextCommanders };
}

function existingPackedUnitSnapshots(
  state: GameState,
  commanderId: string,
  commander: CommanderState,
): ReadonlyArray<UnitState> | null {
  if (!commander.packed) return [];
  const packedUnitStates = commander.packedUnitStates;
  if (packedUnitStates && packedUnitStates.length > 0) return packedUnitStates;
  if (commander.attachedUnits.length === 0) return [];

  const legacyPackedUnits: UnitState[] = [];
  const seenUnitIds = new Set<string>();
  for (const unitId of commander.attachedUnits) {
    if (seenUnitIds.has(unitId)) return null;
    seenUnitIds.add(unitId);

    const unit = state.units.get(unitId);
    if (!unit || unit.packedInCommanderId !== commanderId) return null;
    legacyPackedUnits.push(unit);
  }

  return legacyPackedUnits;
}

function effectiveCommanderPackCapacity(
  state: GameState,
  commanderUnit: UnitState,
  commander: CommanderState,
): number {
  let capacity = COMMANDER_BASE_STACK_CAP;
  const promotionIds = commanderPromotionIds(commanderUnit, commander);

  for (const promotionId of promotionIds) {
    const promotion = state.config.commanderPromotions?.get(promotionId);
    if (
      STACK_CAPACITY_PROMOTION_IDS.has(promotionId) &&
      promotion?.aura.type === 'AURA_EXPAND_STACK'
    ) {
      capacity += promotion.aura.delta;
    }
  }

  return capacity;
}

function freeAdjacentMapTiles(
  state: GameState,
  commanderUnit: UnitState,
  ignoredUnitIds: ReadonlySet<string> = new Set(),
) {
  const occupiedKeys = new Set<string>();
  for (const [, u] of state.units) {
    if (ignoredUnitIds.has(u.id)) continue;
    occupiedKeys.add(coordToKey(u.position));
  }

  return neighbors(commanderUnit.position).filter((tile) => {
    const key = coordToKey(tile);
    return state.map.tiles.has(key) && !occupiedKeys.has(key);
  });
}

function commanderDeploysWithMovement(
  state: GameState,
  commanderUnit: UnitState,
  commander: CommanderState,
): boolean {
  const promotionIds = commanderPromotionIds(commanderUnit, commander);

  for (const promotionId of promotionIds) {
    const promotion = state.config.commanderPromotions?.get(promotionId);
    if (promotion?.aura.type === 'AURA_DEPLOY_WITH_MOVEMENT') return true;
  }

  return false;
}

function commanderPromotionIds(
  commanderUnit: UnitState,
  commander: CommanderState,
): ReadonlySet<string> {
  return new Set([
    ...commander.promotions,
    ...commanderUnit.promotions,
  ]);
}
