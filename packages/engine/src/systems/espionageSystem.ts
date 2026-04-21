/**
 * espionageSystem — pure system for Espionage operations (Y5, F-05).
 *
 * Handles:
 *  - INITIATE_ESPIONAGE: validate target, action def, influence → create EspionageOperation.
 *  - COUNTER_ESPIONAGE: validate op targets current player → increment counterInfluence.
 *  - END_TURN: tick all active ops — drain influence, countdown turnsRemaining,
 *    roll detection, auto-complete or auto-cancel.
 *
 * Import boundaries: only from ../types/ and ../state/.
 * No cross-system imports; no side effects; fully pure.
 */

import type { GameState, GameAction } from '../types/GameState';
import type { EspionageActionDef, EspionageOperation } from '../types/Espionage';
import { nextRandom } from '../state/SeededRng';

/** Turns an espionage operation takes to complete once initiated. */
const ESPIONAGE_OPERATION_DURATION = 4;

// ── Helpers ──

function getOps(state: GameState): ReadonlyArray<EspionageOperation> {
  return state.diplomacy.activeEspionageOps ?? [];
}

function setOps(state: GameState, ops: ReadonlyArray<EspionageOperation>): GameState {
  return {
    ...state,
    diplomacy: { ...state.diplomacy, activeEspionageOps: ops },
  };
}

/** Generate a unique runtime id for an espionage operation. */
function generateOpId(ownerId: string, targetId: string, turn: number, counter: number): string {
  return `esp-${ownerId}-${targetId}-${turn}-${counter}`;
}

/** Look up an espionage action definition from config. */
function findActionDef(state: GameState, actionId: string): EspionageActionDef | undefined {
  return state.config.espionageActions?.get(actionId);
}

// ── Reducers ──

function applyInitiateEspionage(
  state: GameState,
  action: Extract<GameAction, { type: 'INITIATE_ESPIONAGE' }>,
): GameState {
  const { targetPlayerId, actionId, influenceSpent } = action;
  const currentPlayerId = state.currentPlayerId;
  const player = state.players.get(currentPlayerId);
  if (!player) return state;

  // Target must exist
  if (!state.players.has(targetPlayerId)) return state;
  // Cannot target self
  if (targetPlayerId === currentPlayerId) return state;

  // Action def must exist in config
  const actionDef = findActionDef(state, actionId);
  if (!actionDef) return state;

  // Player must have sufficient influence
  if (player.influence < influenceSpent) return state;
  if (influenceSpent < actionDef.influenceCostPerTurn) return state;

  // Deduct initial influence
  const updatedPlayer = { ...player, influence: player.influence - influenceSpent };
  const players = new Map(state.players);
  players.set(currentPlayerId, updatedPlayer);

  // Create the operation
  const op: EspionageOperation = {
    id: generateOpId(currentPlayerId, targetPlayerId, state.turn, getOps(state).length),
    actionId,
    ownerId: currentPlayerId,
    targetPlayerId,
    startedOnTurn: state.turn,
    turnsRemaining: ESPIONAGE_OPERATION_DURATION,
    totalInfluenceSpent: influenceSpent,
    isCountered: false,
    counterInfluence: 0,
    completed: false,
    cancelled: false,
  };

  return setOps(
    { ...state, players },
    [...getOps(state), op],
  );
}

function applyCounterEspionage(
  state: GameState,
  action: Extract<GameAction, { type: 'COUNTER_ESPIONAGE' }>,
): GameState {
  const { opId, counterInfluence } = action;
  const currentPlayerId = state.currentPlayerId;
  const player = state.players.get(currentPlayerId);
  if (!player) return state;

  // Player must have sufficient influence
  if (player.influence < counterInfluence) return state;

  // Find the operation
  const ops = getOps(state);
  const opIndex = ops.findIndex(op => op.id === opId);
  if (opIndex === -1) return state;

  const op = ops[opIndex];
  // Must target the current player
  if (op.targetPlayerId !== currentPlayerId) return state;
  // Must not already be completed or cancelled
  if (op.completed || op.cancelled) return state;

  // Deduct influence from the countering player
  const updatedPlayer = { ...player, influence: player.influence - counterInfluence };
  const players = new Map(state.players);
  players.set(currentPlayerId, updatedPlayer);

  // Update the operation
  const updatedOp: EspionageOperation = {
    ...op,
    isCountered: true,
    counterInfluence: op.counterInfluence + counterInfluence,
  };

  const newOps = [...ops];
  newOps[opIndex] = updatedOp;

  return setOps({ ...state, players }, newOps);
}

/**
 * Tick all active espionage operations on END_TURN:
 * - Drain influence cost per turn from the owner.
 * - Decrement turnsRemaining.
 * - Roll detection: base chance + counter bonus.
 * - Auto-complete when turnsRemaining reaches 0.
 * - Auto-cancel when detected.
 */
function tickEspionageOps(state: GameState): GameState {
  const ops = getOps(state);
  if (ops.length === 0) return state;

  const players = new Map(state.players);
  let rng = state.rng;
  const newOps: EspionageOperation[] = [];

  for (const op of ops) {
    // Skip completed/cancelled ops — keep them for history
    if (op.completed || op.cancelled) {
      newOps.push(op);
      continue;
    }

    const owner = players.get(op.ownerId);
    const actionDef = findActionDef(state, op.actionId);

    // Drain influence from owner
    const cost = actionDef?.influenceCostPerTurn ?? 0;
    if (owner && cost > 0) {
      const deducted = Math.min(owner.influence, cost);
      players.set(op.ownerId, { ...owner, influence: owner.influence - deducted });
    }

    const turnsRemaining = op.turnsRemaining - 1;

    // Detection roll: base chance + counter influence bonus (1% per 5 counter influence)
    const detectionChance = (actionDef?.detectionChance ?? 0) + (op.counterInfluence / 500);
    const { value: roll, rng: nextRng } = nextRandom(rng);
    rng = nextRng;
    const detected = roll < detectionChance;

    if (detected) {
      // Cancelled — detected by target
      newOps.push({ ...op, turnsRemaining, cancelled: true });
    } else if (turnsRemaining <= 0) {
      // Completed successfully
      newOps.push({ ...op, turnsRemaining: 0, completed: true });
    } else {
      // Still in progress
      newOps.push({ ...op, turnsRemaining });
    }
  }

  return {
    ...setOps({ ...state, players }, newOps),
    rng,
  };
}

// ── System ──

/**
 * espionageSystem — pure function, no mutation, no side effects.
 *
 * Returns state unchanged for any action type it does not handle.
 */
export function espionageSystem(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'INITIATE_ESPIONAGE':
      return applyInitiateEspionage(state, action);
    case 'COUNTER_ESPIONAGE':
      return applyCounterEspionage(state, action);
    case 'END_TURN':
      return tickEspionageOps(state);
    default:
      return state;
  }
}
