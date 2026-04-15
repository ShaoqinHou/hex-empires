/**
 * governmentSystem — standalone pure system for Government and Social
 * Policy actions (cycle C of the Government mechanic).
 *
 * This system is NOT yet wired into the `GameEngine` pipeline. Wiring,
 * type unification with `GameAction`, and any required `PlayerState`
 * schema extension land in cycle D. The file exists now so UI panels
 * and tests can consume the logic in isolation.
 *
 * Scope:
 *  - `ADOPT_GOVERNMENT` — set the player's current government. Validates
 *    that the target government exists in `ALL_GOVERNMENTS`, that the
 *    player has researched the required `unlockCivic`, and that the
 *    player is not already on that government. On success resets filled
 *    policy slots (switching governments re-exposes a fresh slate of
 *    slots; individual slot shapes may differ).
 *  - `SLOT_POLICY` — place a Policy into a category slot. Validates that
 *    the player currently has a Government, that the Policy exists and
 *    is unlocked (its `unlockCivic` is researched), that the Policy's
 *    category matches the slot's category (wildcard slots accept any),
 *    and that the slot index is within the Government's declared slot
 *    count for that category.
 *  - `UNSLOT_POLICY` — clear a category slot at an index.
 *
 * Graceful no-op: the current `PlayerState` schema does NOT yet expose
 * `governmentId` or `slottedPolicies`. When those fields are missing,
 * the system returns state unchanged rather than throwing. This mirrors
 * the M10 `religionSystem` pattern. Tests exercise the happy path by
 * extending `PlayerState` at the test-scope via `createTestPlayer`
 * overrides, which the helper passes through `...overrides`.
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
  PolicyCategory,
} from '../types/Government';
import type { GovernmentDef } from '../data/governments/governments';
import type { PolicyDef } from '../data/governments/policies';

/**
 * Widened action union accepted by governmentSystem. The engine-level
 * `GameAction` does not yet include `GovernmentAction`; cycle D will
 * unify them. For now governmentSystem accepts either so callers and
 * tests can dispatch the Government-scoped shapes directly.
 */
export type GovernmentSystemAction = GameAction | GovernmentAction;

/**
 * Structural extension of `PlayerState` with the Government fields that
 * cycle D will inline. Used as a runtime predicate target so we can no-op
 * gracefully when those fields are absent from the schema.
 */
interface PlayerWithGovernment extends PlayerState {
  readonly governmentId: GovernmentId | null;
  readonly slottedPolicies: ReadonlyMap<
    PolicyCategory,
    ReadonlyArray<PolicyId | null>
  >;
}

// ── Helpers (exported for reuse by UI panels / tests) ──

/**
 * Runtime predicate for the optional Government fields on PlayerState.
 * Uses a structural check (not a type cast) to stay strict-TS friendly.
 */
function hasGovernmentFields(
  player: PlayerState,
): player is PlayerWithGovernment {
  const p = player as Partial<PlayerWithGovernment>;
  return (
    (typeof p.governmentId === 'string' || p.governmentId === null) &&
    p.slottedPolicies instanceof Map
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
 */
export function canAdoptGovernment(
  state: GameState,
  playerId: string,
  governmentId: GovernmentId,
): boolean {
  const player = state.players.get(playerId);
  if (!player) return false;

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
 * Pure validator: can the player slot `policyId` into the given
 * `(category, slotIndex)` slot of their current Government?
 */
export function canSlotPolicy(
  state: GameState,
  playerId: string,
  category: PolicyCategory,
  slotIndex: number,
  policyId: PolicyId,
): boolean {
  const player = state.players.get(playerId);
  if (!player) return false;
  if (!hasGovernmentFields(player)) return false;
  if (player.governmentId === null) return false;

  const gov = findGovernment(player.governmentId, state.config);
  if (!gov) return false;

  const policy = findPolicy(policyId, state.config);
  if (!policy) return false;

  // Policy must be unlocked.
  if (!player.researchedCivics.includes(policy.unlockCivic)) return false;

  // Category match — wildcard slots accept any policy.
  if (category !== 'wildcard' && policy.category !== category) {
    return false;
  }

  // Slot index must be within the Government's slot count for this
  // category.
  const slotCount = gov.policySlots[category];
  if (slotIndex < 0 || slotIndex >= slotCount) return false;

  return true;
}

// ── Reducers ──

/**
 * Produce a fresh, empty `slottedPolicies` map shaped to the given
 * Government's slot counts. Filled slots reset on Government change per
 * the design doc.
 */
function emptySlotMap(
  government: GovernmentDef | undefined,
): ReadonlyMap<PolicyCategory, ReadonlyArray<PolicyId | null>> {
  if (!government) {
    return new Map();
  }
  const map = new Map<PolicyCategory, ReadonlyArray<PolicyId | null>>();
  (['military', 'economic', 'diplomatic', 'wildcard'] as const).forEach(
    (cat) => {
      const count = government.policySlots[cat];
      map.set(cat, new Array<PolicyId | null>(count).fill(null));
    },
  );
  return map;
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
    slottedPolicies: emptySlotMap(gov),
  };

  return updatePlayer(state, playerId, updated);
}

function applySlotPolicy(
  state: GameState,
  action: Extract<GovernmentAction, { type: 'SLOT_POLICY' }>,
): GameState {
  const { playerId, category, slotIndex, policyId } = action;
  const player = state.players.get(playerId);
  if (!player) return state;
  if (!hasGovernmentFields(player)) return state;

  if (!canSlotPolicy(state, playerId, category, slotIndex, policyId)) {
    return state;
  }

  const currentCategory =
    player.slottedPolicies.get(category) ?? [];
  const nextCategory: Array<PolicyId | null> = [...currentCategory];
  // Normalise length to Government's slot count if the map was sparse.
  const gov = findGovernment(player.governmentId!, state.config);
  if (!gov) return state;
  const expectedLen = gov.policySlots[category];
  while (nextCategory.length < expectedLen) nextCategory.push(null);
  nextCategory[slotIndex] = policyId;

  const nextSlotted = new Map(player.slottedPolicies);
  nextSlotted.set(category, nextCategory);

  const updated: PlayerWithGovernment = {
    ...player,
    slottedPolicies: nextSlotted,
  };

  return updatePlayer(state, playerId, updated);
}

function applyUnslotPolicy(
  state: GameState,
  action: Extract<GovernmentAction, { type: 'UNSLOT_POLICY' }>,
): GameState {
  const { playerId, category, slotIndex } = action;
  const player = state.players.get(playerId);
  if (!player) return state;
  if (!hasGovernmentFields(player)) return state;
  if (player.governmentId === null) return state;

  const gov = findGovernment(player.governmentId, state.config);
  if (!gov) return state;

  const slotCount = gov.policySlots[category];
  if (slotIndex < 0 || slotIndex >= slotCount) return state;

  const currentCategory = player.slottedPolicies.get(category) ?? [];
  const nextCategory: Array<PolicyId | null> = [...currentCategory];
  while (nextCategory.length < slotCount) nextCategory.push(null);

  // Only modify state if there was actually a policy in the slot.
  if (nextCategory[slotIndex] === null) return state;

  nextCategory[slotIndex] = null;

  const nextSlotted = new Map(player.slottedPolicies);
  nextSlotted.set(category, nextCategory);

  const updated: PlayerWithGovernment = {
    ...player,
    slottedPolicies: nextSlotted,
  };

  return updatePlayer(state, playerId, updated);
}

/**
 * governmentSystem — pure function, no mutation, no side effects.
 *
 * Returns state unchanged for any action type it does not handle and
 * for any invalid action (unknown government/policy, missing civic,
 * wrong-category slot, out-of-range index, missing player, or schema
 * without Government fields).
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
    default:
      return state;
  }
}
