/**
 * treatySystem — pure system for Treaty proposals (Y5, F-06).
 *
 * Handles:
 *  - PROPOSE_TREATY: validate treaty def, target, influence → create ActiveTreaty (pending).
 *  - ACCEPT_TREATY: validate pending treaty targets current player → set active.
 *  - REJECT_TREATY: validate pending treaty targets current player → set rejected.
 *  - END_TURN: tick active treaties — decrement turnsRemaining, expire when 0.
 *
 * Import boundaries: only from ../types/.
 * No cross-system imports; no side effects; fully pure.
 */

import type { GameState, GameAction } from '../types/GameState';
import type { ActiveTreaty, TreatyDef } from '../types/Treaty';

// ── Helpers ──

function getTreaties(state: GameState): ReadonlyArray<ActiveTreaty> {
  return state.diplomacy.activeTreaties ?? [];
}

function setTreaties(state: GameState, treaties: ReadonlyArray<ActiveTreaty>): GameState {
  return {
    ...state,
    diplomacy: { ...state.diplomacy, activeTreaties: treaties },
  };
}

/** Generate a unique runtime id for a treaty instance. */
function generateTreatyInstanceId(proposerId: string, targetId: string, treatyId: string, turn: number): string {
  return `treaty-${proposerId}-${targetId}-${treatyId}-${turn}`;
}

/** Look up a treaty definition from config. */
function findTreatyDef(state: GameState, treatyId: string): TreatyDef | undefined {
  return state.config.treaties?.get(treatyId);
}

// ── Reducers ──

function applyProposeTreaty(
  state: GameState,
  action: Extract<GameAction, { type: 'PROPOSE_TREATY' }>,
): GameState {
  const { targetPlayerId, treatyId, influenceSpent } = action;
  const currentPlayerId = state.currentPlayerId;
  const player = state.players.get(currentPlayerId);
  if (!player) return state;

  // Target must exist
  if (!state.players.has(targetPlayerId)) return state;
  // Cannot propose to self
  if (targetPlayerId === currentPlayerId) return state;

  // Treaty def must exist in config
  const treatyDef = findTreatyDef(state, treatyId);
  if (!treatyDef) return state;

  // Player must have sufficient influence
  if (player.influence < influenceSpent) return state;
  if (influenceSpent < treatyDef.influenceCost) return state;

  // Deduct influence
  const updatedPlayer = { ...player, influence: player.influence - influenceSpent };
  const players = new Map(state.players);
  players.set(currentPlayerId, updatedPlayer);

  // Create the treaty instance
  const treaty: ActiveTreaty = {
    id: generateTreatyInstanceId(currentPlayerId, targetPlayerId, treatyId, state.turn),
    treatyId,
    proposerId: currentPlayerId,
    targetId: targetPlayerId,
    status: 'pending',
    proposedOnTurn: state.turn,
    activeSinceTurn: null,
    turnsRemaining: null,
  };

  return setTreaties(
    { ...state, players },
    [...getTreaties(state), treaty],
  );
}

function applyAcceptTreaty(
  state: GameState,
  action: Extract<GameAction, { type: 'ACCEPT_TREATY' }>,
): GameState {
  const { treatyId } = action;
  const currentPlayerId = state.currentPlayerId;

  // Find the pending treaty by its runtime id
  const treaties = getTreaties(state);
  const index = treaties.findIndex(t => t.id === treatyId);
  if (index === -1) return state;

  const treaty = treaties[index];

  // Must be pending
  if (treaty.status !== 'pending') return state;
  // Must target the current player (the acceptor is the target)
  if (treaty.targetId !== currentPlayerId) return state;

  // Look up treaty def for duration
  const treatyDef = findTreatyDef(state, treaty.treatyId);
  const duration = treatyDef?.durationTurns ?? 0;

  // Update to active
  const updated: ActiveTreaty = {
    ...treaty,
    status: 'active',
    activeSinceTurn: state.turn,
    turnsRemaining: duration > 0 ? duration : null,
  };

  const newTreaties = [...treaties];
  newTreaties[index] = updated;

  return setTreaties(state, newTreaties);
}

function applyRejectTreaty(
  state: GameState,
  action: Extract<GameAction, { type: 'REJECT_TREATY' }>,
): GameState {
  const { treatyId } = action;
  const currentPlayerId = state.currentPlayerId;

  const treaties = getTreaties(state);
  const index = treaties.findIndex(t => t.id === treatyId);
  if (index === -1) return state;

  const treaty = treaties[index];

  // Must be pending
  if (treaty.status !== 'pending') return state;
  // Must target the current player
  if (treaty.targetId !== currentPlayerId) return state;

  // Update to rejected
  const updated: ActiveTreaty = { ...treaty, status: 'rejected' };

  const newTreaties = [...treaties];
  newTreaties[index] = updated;

  return setTreaties(state, newTreaties);
}

/**
 * Tick all active treaties on END_TURN:
 * - Decrement turnsRemaining for active treaties.
 * - Expire when turnsRemaining reaches 0 (duration > 0 only).
 */
function tickTreaties(state: GameState): GameState {
  const treaties = getTreaties(state);
  if (treaties.length === 0) return state;

  const newTreaties = treaties.map(t => {
    if (t.status !== 'active') return t;
    if (t.turnsRemaining === null) return t; // permanent treaty

    const remaining = t.turnsRemaining - 1;
    if (remaining <= 0) {
      return { ...t, turnsRemaining: 0, status: 'expired' as const };
    }
    return { ...t, turnsRemaining: remaining };
  });

  return setTreaties(state, newTreaties);
}

// ── System ──

/**
 * treatySystem — pure function, no mutation, no side effects.
 *
 * Returns state unchanged for any action type it does not handle.
 */
export function treatySystem(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'PROPOSE_TREATY':
      return applyProposeTreaty(state, action);
    case 'ACCEPT_TREATY':
      return applyAcceptTreaty(state, action);
    case 'REJECT_TREATY':
      return applyRejectTreaty(state, action);
    case 'END_TURN':
      return tickTreaties(state);
    default:
      return state;
  }
}
