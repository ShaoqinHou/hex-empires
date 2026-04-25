/**
 * governmentSystem — pure system for Government and Social Policy actions.
 *
 * W2-03 changes (wildcard slots + ideology branch-lock + age lock):
 *  - Policy slots are flat wildcard arrays: `slottedPolicies: ReadonlyArray<PolicyId | null>`.
 *    SLOT_POLICY / UNSLOT_POLICY use `slotIndex` only (no `category`).
 *  - canAdoptGovernment checks `player.governmentLockedForAge`. On success,
 *    SET_GOVERNMENT sets `governmentLockedForAge: true`.
 *  - SELECT_IDEOLOGY sets `player.ideology` (requires `political_theory` civic).
 *  - canSlotPolicy gates on `player.policySwapWindowOpen`. SLOT_POLICY
 *    success consumes the window (sets `policySwapWindowOpen: false`).
 *
 * Import boundaries: only from `../types/` and `../data/governments/`.
 * No cross-system imports; no side effects; fully pure.
 */

import type { GameState, GameAction, PlayerState } from '../types/GameState';
import type { GameConfig } from '../types/GameConfig';
import type {
  GovernmentAction,
  GovernmentId,
  PolicyId,
} from '../types/Government';
import type { GovernmentDef } from '../data/governments/governments';
import type { PolicyDef } from '../data/governments/policies';
import { CELEBRATION_DURATION } from '../state/CelebrationConstants';

/**
 * Widened action union accepted by governmentSystem. The engine-level
 * `GameAction` includes `GovernmentAction` variants (landed in M12).
 */
export type GovernmentSystemAction = GameAction | GovernmentAction;

/**
 * Structural extension of `PlayerState` with the Government fields.
 * Used as a runtime predicate target so we can no-op gracefully when
 * those fields are absent from the schema.
 */
interface PlayerWithGovernment extends PlayerState {
  readonly governmentId: GovernmentId | null;
  readonly slottedPolicies: ReadonlyArray<PolicyId | null>;
}

// ── Helpers (exported for reuse by UI panels / tests) ──

/**
 * Runtime predicate for the optional Government fields on PlayerState.
 */
function hasGovernmentFields(
  player: PlayerState,
): player is PlayerWithGovernment {
  const p = player as Partial<PlayerWithGovernment>;
  return (
    (typeof p.governmentId === 'string' || p.governmentId === null) &&
    Array.isArray(p.slottedPolicies)
  );
}

/** Look up a Government definition by id from config. */
export function findGovernment(id: GovernmentId, config: GameConfig): GovernmentDef | undefined {
  return config.governments.get(id);
}

/** Look up a Policy definition by id from config. */
export function findPolicy(id: PolicyId, config: GameConfig): PolicyDef | undefined {
  return config.policies.get(id);
}

/**
 * Pure validator: can the player adopt the named Government?
 * - Government must exist.
 * - Player's `researchedCivics` must include the Government's unlockCivic.
 * - Player must not already be on that Government.
 * - Player must not have `governmentLockedForAge === true`.
 */
export function canAdoptGovernment(
  state: GameState,
  playerId: string,
  governmentId: GovernmentId,
): boolean {
  const player = state.players.get(playerId);
  if (!player) return false;

  // Per-age lock (W2-03 CT F-07)
  if (player.governmentLockedForAge === true) return false;

  const gov = findGovernment(governmentId, state.config);
  if (!gov) return false;

  if (!player.researchedCivics.includes(gov.unlockCivic)) return false;

  if (
    hasGovernmentFields(player) &&
    player.governmentId === governmentId
  ) {
    return false;
  }

  return true;
}

/**
 * Pure validator: can the player slot `policyId` into `slotIndex`?
 * - Player must have a government.
 * - `policySwapWindowOpen` must be true (W2-03 GP F-08).
 * - Policy must exist and be unlocked.
 * - Slot index must be within bounds (0..total-1).
 * - All slots are wildcard — no category match required.
 */
export function canSlotPolicy(
  state: GameState,
  playerId: string,
  slotIndex: number,
  policyId: PolicyId,
): boolean {
  const player = state.players.get(playerId);
  if (!player) return false;
  if (!hasGovernmentFields(player)) return false;
  if (player.governmentId === null) return false;

  // Swap window gate (W2-03 GP F-08)
  if (!player.policySwapWindowOpen) return false;

  const gov = findGovernment(player.governmentId, state.config);
  if (!gov) return false;

  const policy = findPolicy(policyId, state.config);
  if (!policy) return false;

  // Policy must be unlocked via its prerequisite civic
  if (!player.researchedCivics.includes(policy.unlockCivic)) return false;

  // Slot index bounds check (no category — all wildcard)
  const total = gov.policySlots.total;
  if (slotIndex < 0 || slotIndex >= total) return false;

  return true;
}

// ── Reducers ──

/**
 * Produce a fresh, empty flat slot array for the given Government's total
 * slot count. Slots reset on Government change.
 */
function emptySlotArray(
  government: GovernmentDef | undefined,
): ReadonlyArray<PolicyId | null> {
  if (!government) return [];
  return new Array<PolicyId | null>(government.policySlots.total).fill(null);
}

function updatePlayer(
  state: GameState,
  playerId: string,
  updated: PlayerState,
): GameState {
  const players = new Map(state.players);
  players.set(playerId, updated);
  return { ...state, players };
}

function applyAdoptGovernment(
  state: GameState,
  action: Extract<GovernmentAction, { type: 'SET_GOVERNMENT' }>,
): GameState {
  const { playerId, governmentId } = action;
  const player = state.players.get(playerId);
  if (!player) return state;

  // Graceful no-op if schema lacks Government fields.
  if (!hasGovernmentFields(player)) return state;

  if (!canAdoptGovernment(state, playerId, governmentId)) return state;

  const gov = findGovernment(governmentId, state.config);
  if (!gov) return state;

  const updated: PlayerWithGovernment = {
    ...player,
    governmentId,
    slottedPolicies: emptySlotArray(gov),
    // Lock this player's government for the rest of the age (W2-03 CT F-07)
    governmentLockedForAge: true,
  };

  return updatePlayer(state, playerId, updated);
}

function applySlotPolicy(
  state: GameState,
  action: Extract<GovernmentAction, { type: 'SLOT_POLICY' }>,
): GameState {
  const { playerId, slotIndex, policyId } = action;
  const player = state.players.get(playerId);
  if (!player) return state;
  if (!hasGovernmentFields(player)) return state;

  if (!canSlotPolicy(state, playerId, slotIndex, policyId)) {
    return state;
  }

  const gov = findGovernment(player.governmentId!, state.config);
  if (!gov) return state;

  const total = gov.policySlots.total;
  const current = player.slottedPolicies;
  const next: Array<PolicyId | null> = new Array<PolicyId | null>(total).fill(null);
  for (let i = 0; i < total; i++) {
    next[i] = current[i] ?? null;
  }
  next[slotIndex] = policyId;

  const updated: PlayerWithGovernment = {
    ...player,
    slottedPolicies: next,
    // Consume the swap window (W2-03 GP F-08)
    policySwapWindowOpen: false,
  };

  return updatePlayer(state, playerId, updated);
}

function applyUnslotPolicy(
  state: GameState,
  action: Extract<GovernmentAction, { type: 'UNSLOT_POLICY' }>,
): GameState {
  const { playerId, slotIndex } = action;
  const player = state.players.get(playerId);
  if (!player) return state;
  if (!hasGovernmentFields(player)) return state;
  if (player.governmentId === null) return state;

  const gov = findGovernment(player.governmentId, state.config);
  if (!gov) return state;

  const total = gov.policySlots.total;
  if (slotIndex < 0 || slotIndex >= total) return state;

  const current = player.slottedPolicies;
  if ((current[slotIndex] ?? null) === null) return state;

  const next: Array<PolicyId | null> = new Array<PolicyId | null>(total).fill(null);
  for (let i = 0; i < total; i++) {
    next[i] = current[i] ?? null;
  }
  next[slotIndex] = null;

  const updated: PlayerWithGovernment = {
    ...player,
    slottedPolicies: next,
  };

  return updatePlayer(state, playerId, updated);
}

function applySelectIdeology(
  state: GameState,
  action: Extract<GovernmentAction, { type: 'SELECT_IDEOLOGY' }>,
): GameState {
  const { playerId, ideology } = action;
  const player = state.players.get(playerId);
  if (!player) return state;

  // Requires political_theory civic
  if (!player.researchedCivics.includes('political_theory')) return state;

  // Once set, ideology cannot be changed
  if (player.ideology != null) return state;

  const updated: PlayerState = {
    ...player,
    ideology,
  };

  return updatePlayer(state, playerId, updated);
}

/**
 * Handle PICK_CELEBRATION_BONUS (W3-03 F-03):
 *
 * Validates that:
 * - Player exists and has a pendingCelebrationChoice
 * - The chosen bonusId is one of the two options from the government that
 *   triggered the celebration (stored in pendingCelebrationChoice.governmentId)
 *
 * On success:
 * - Sets activeCelebrationBonus = bonusId
 * - Sets celebrationTurnsLeft = CELEBRATION_DURATION['standard'] (10)
 * - Increments celebrationCount (F-01)
 * - Increments socialPolicySlots by 1 (F-04)
 * - Clears pendingCelebrationChoice
 */
function applyPickCelebrationBonus(
  state: GameState,
  action: Extract<GameAction, { type: 'PICK_CELEBRATION_BONUS' }>,
): GameState {
  const { playerId, bonusId } = action;
  const player = state.players.get(playerId);
  if (!player) return state;

  const pending = player.pendingCelebrationChoice ?? null;
  if (pending === null) return state; // no celebration pending — no-op

  // Validate bonusId against the government that triggered the celebration
  const gov = findGovernment(pending.governmentId, state.config);
  if (!gov) return state;

  const validBonusIds = gov.celebrationBonuses.map(b => b.id);
  if (!validBonusIds.includes(bonusId)) return state; // invalid choice — no-op

  const duration = CELEBRATION_DURATION['standard'] ?? 10;

  // BB1.5 (S10): cap celebrationCount at 7 — threshold effects stop after the 7th celebration
  const MAX_CELEBRATION_COUNT = 7;

  // FF2: extend the flat slottedPolicies array with one extra null slot so the
  // new bonus slot is immediately slottable. socialPolicySlots tracks the count;
  // slottedPolicies carries the actual entries. Both must stay in sync.
  // Only applicable when the player already has the Government fields (flat array model).
  const extendedSlottedPolicies: ReadonlyArray<PolicyId | null> | undefined =
    hasGovernmentFields(player)
      ? [...(player.slottedPolicies as ReadonlyArray<PolicyId | null>), null]
      : undefined;

  const updated: PlayerState = {
    ...player,
    activeCelebrationBonus: bonusId,
    celebrationTurnsLeft: duration,
    // celebrationBonus (old percent field) — keep backward compat but also set to 10
    celebrationBonus: 10,
    celebrationCount: Math.min(MAX_CELEBRATION_COUNT, player.celebrationCount + 1),
    // F-04: increment social policy slots counter
    socialPolicySlots: (player.socialPolicySlots ?? 0) + 1,
    // Clear the pending prompt
    pendingCelebrationChoice: null,
    // FF2: extend slot array if present
    ...(extendedSlottedPolicies !== undefined
      ? { slottedPolicies: extendedSlottedPolicies }
      : {}),
  };

  return updatePlayer(state, playerId, updated);
}

/**
 * governmentSystem — pure function, no mutation, no side effects.
 *
 * Returns state unchanged for any action type it does not handle and
 * for any invalid action.
 */
export function governmentSystem(
  state: GameState,
  action: GovernmentSystemAction,
): GameState {
  switch (action.type) {
    case 'SET_GOVERNMENT':
      return applyAdoptGovernment(state, action);
    case 'SLOT_POLICY':
      return applySlotPolicy(state, action);
    case 'UNSLOT_POLICY':
      return applyUnslotPolicy(state, action);
    case 'SELECT_IDEOLOGY':
      return applySelectIdeology(state, action);
    case 'PICK_CELEBRATION_BONUS':
      return applyPickCelebrationBonus(state, action);
    default:
      return state;
  }
}
