/**
 * religionSystem — standalone pure system for religion actions.
 *
 * This is cycle C of the Religion & Pantheons mechanic: a pure
 * `(state, action) => state` function that is NOT yet wired into the
 * `GameEngine` pipeline. Wiring happens in cycle D.
 *
 * Scope for this cycle:
 *  - `ADOPT_PANTHEON` (the "found pantheon" action in the design doc):
 *    validates that the pantheon exists and that the player has enough
 *    faith, then deducts faith and emits a log event.
 *  - `FOUND_RELIGION` (cycle E): validates pantheon prerequisite, 200
 *    faith cost, founder/follower belief catalog membership, per-belief
 *    uniqueness across players, and holy-city ownership. Writes a
 *    `ReligionRecord` to `state.religion.religions`, lazily initializing
 *    the optional slot on first use (pre-religion saves migrate as
 *    `undefined` → fresh empty slot on first successful action).
 *  - All other actions — SPREAD_RELIGION, ENHANCE_RELIGION, etc. — are
 *    pass-through no-ops in this cycle.
 *
 * Graceful no-op behaviour: if `PlayerState` does not expose `faith`
 * (i.e. the schema has been trimmed in some future refactor), the
 * system returns state unchanged rather than throwing. This keeps the
 * scaffolding forward-compatible.
 *
 * Import boundaries:
 *  - Imports only from `../types/` and nothing from other systems.
 *  - Belief content is accessed through `state.config.founderBeliefs` and
 *    `state.config.followerBeliefs` — no direct data barrel imports.
 */

import type { GameState, GameAction, GameEvent, PlayerState } from '../types/GameState';
import type { PlayerId } from '../types/Ids';
import type {
  ReligionAction,
  PantheonId,
  PantheonDef,
  ReligionRecord,
  ReligionSlotState,
} from '../types/Religion';

/**
 * Faith cost to found a religion. Mirrors RELIGION_FOUND_FAITH_COST in
 * types/Religion.ts; inlined here to keep systems/ from importing design
 * constants through long chains. Rulebook §18.
 */
const FOUND_RELIGION_FAITH_COST = 200 as const;

/**
 * Widened action type accepted by religionSystem. The pipeline's
 * canonical `GameAction` does not yet include `ReligionAction`; cycle D
 * will unify them. For now religionSystem accepts either so callers
 * (and tests) may dispatch `ReligionAction` shapes directly without the
 * system stripping types.
 */
export type ReligionSystemAction = GameAction | ReligionAction;

/** Look up a pantheon by id from state.config. */
function findPantheon(state: GameState, pantheonId: PantheonId): PantheonDef | undefined {
  return state.config.pantheons.get(pantheonId);
}

/**
 * Pure validator: returns `true` if the player can adopt the named
 * pantheon. Does NOT mutate. Kept as a named helper so later cycles
 * (and UI panels) can reuse it for button enable/disable logic.
 */
export function canAdoptPantheon(
  state: GameState,
  playerId: PlayerId,
  pantheonId: PantheonId,
): boolean {
  const player = state.players.get(playerId);
  if (!player) return false;

  // Graceful no-op: if the schema ever loses the `faith` field, we
  // cannot evaluate cost — disallow adoption.
  if (!playerHasFaithField(player)) return false;

  const pantheon = findPantheon(state, pantheonId);
  if (!pantheon) return false;

  return player.faith >= pantheon.faithCost;
}

/**
 * Runtime predicate for the optional `faith` field. Uses a structural
 * check rather than a type cast to stay strict-TS friendly.
 */
function playerHasFaithField(player: PlayerState): player is PlayerState & { readonly faith: number } {
  return typeof (player as { faith?: unknown }).faith === 'number';
}

/**
 * religionSystem — pure function, no mutation, no side effects.
 *
 * Returns state unchanged for any action type it does not handle.
 * Returns state unchanged for invalid `ADOPT_PANTHEON` (unknown
 * pantheon, missing player, insufficient faith).
 *
 * Handles `FOUND_RELIGION` with full validation (pantheon prerequisite,
 * faith cost, belief catalog membership, cross-player belief
 * uniqueness, holy city ownership). Lazily initializes
 * `state.religion` on first successful dispatch (optional slot, so
 * pre-religion saves round-trip as `undefined`).
 */
export function religionSystem(state: GameState, action: ReligionSystemAction): GameState {
  if (action.type === 'ADOPT_PANTHEON') return handleAdoptPantheon(state, action);
  if (action.type === 'FOUND_RELIGION') return handleFoundReligion(state, action);
  return state;
}

// ── ADOPT_PANTHEON ──────────────────────────────────────────────────

function handleAdoptPantheon(
  state: GameState,
  action: Extract<ReligionAction, { type: 'ADOPT_PANTHEON' }>,
): GameState {
  const { playerId, pantheonId } = action;
  const player = state.players.get(playerId);
  if (!player) return state;
  if (!playerHasFaithField(player)) return state;

  const pantheon = findPantheon(state, pantheonId);
  if (!pantheon) return state;
  if (player.faith < pantheon.faithCost) return state;

  // Per-civ uniqueness: a player may hold at most one pantheon. If this
  // player already claimed one (written to PlayerState.pantheonId by a
  // prior ADOPT_PANTHEON), reject silently.
  if (player.pantheonId) return state;

  // Global uniqueness: first-come-first-served across players. Check
  // both the religion slot's `pantheonClaims` map (authoritative) AND a
  // linear scan of `state.players` for any player whose `pantheonId`
  // already matches this one (defense in depth against desynced state).
  const existingClaims = state.religion?.pantheonClaims;
  if (existingClaims?.has(pantheonId)) return state;
  for (const [otherId, otherPlayer] of state.players) {
    if (otherId === playerId) continue;
    if (otherPlayer.pantheonId === pantheonId) return state;
  }

  const updatedPlayer: PlayerState = {
    ...player,
    faith: player.faith - pantheon.faithCost,
    pantheonId,
  };

  const updatedPlayers = new Map(state.players);
  updatedPlayers.set(playerId, updatedPlayer);

  // Lazy-init the religion slot if absent; otherwise preserve existing
  // religions array and extend pantheonClaims immutably.
  const prevSlot = state.religion;
  const prevClaims = prevSlot?.pantheonClaims;
  const nextClaims: ReadonlyMap<string, string> = prevClaims
    ? new Map([...prevClaims, [pantheonId, playerId]])
    : new Map([[pantheonId, playerId]]);

  const updatedReligionSlot: ReligionSlotState = {
    religions: prevSlot?.religions ?? [],
    pantheonClaims: nextClaims,
  };

  const event: GameEvent = {
    turn: state.turn,
    playerId,
    message: `${player.name} adopted the pantheon of ${pantheon.name}.`,
    type: 'legacy',
  };

  return {
    ...state,
    players: updatedPlayers,
    log: [...state.log, event],
    religion: updatedReligionSlot,
  };
}

// ── FOUND_RELIGION ──────────────────────────────────────────────────

/**
 * The existing `FOUND_RELIGION` action shape (in Religion.ts, from an
 * earlier cycle) names its fields `cityId`, `founderBelief`,
 * `followerBelief`. Cycle D's handler keeps that spelling — renaming
 * would break prior tests and consumers — but the validation semantics
 * match the ReligionRecord vocabulary (holyCityId, founderBeliefId,
 * followerBeliefId).
 */
function handleFoundReligion(
  state: GameState,
  action: Extract<ReligionAction, { type: 'FOUND_RELIGION' }>,
): GameState {
  const { playerId, cityId, religionName, founderBelief, followerBelief } = action;

  // Player must exist and carry a faith field.
  const player = state.players.get(playerId);
  if (!player) return state;
  if (!playerHasFaithField(player)) return state;

  // Pantheon prerequisite: `pantheonId` is an optional PlayerState field
  // written by ADOPT_PANTHEON. Some historical test states set neither,
  // which is legitimate — FOUND_RELIGION simply fails in that case.
  if (!player.pantheonId) return state;

  // Faith cost (rulebook §18, fallback 200 when unspecified).
  if (player.faith < FOUND_RELIGION_FAITH_COST) return state;

  // Belief existence — both belief IDs must be in their respective
  // catalogues.
  if (!state.config.founderBeliefs.has(founderBelief)) return state;
  if (!state.config.followerBeliefs.has(followerBelief)) return state;

  // Holy city must exist and be owned by the founding player.
  const city = state.cities.get(cityId);
  if (!city) return state;
  if (city.owner !== playerId) return state;

  // Uniqueness — one civ per belief across the whole game. Consult the
  // religion slot if present; absent slot means no prior claims.
  const existingReligions: ReadonlyArray<ReligionRecord> =
    state.religion?.religions ?? [];

  const founderTaken = existingReligions.some(
    (r) => r.founderBeliefId === founderBelief,
  );
  if (founderTaken) return state;

  const followerTaken = existingReligions.some(
    (r) => r.followerBeliefId === followerBelief,
  );
  if (followerTaken) return state;

  // Apply: deduct faith, append religion record, log. Lazily initialize
  // the religion slot on first use — pre-religion saves carry
  // `state.religion === undefined` and need no migration.
  const updatedPlayer: PlayerState = {
    ...player,
    faith: player.faith - FOUND_RELIGION_FAITH_COST,
  };
  const updatedPlayers = new Map(state.players);
  updatedPlayers.set(playerId, updatedPlayer);

  const newRecord: ReligionRecord = {
    id: `religion.${playerId}.${founderBelief}`,
    name: religionName,
    founderPlayerId: playerId,
    founderBeliefId: founderBelief,
    followerBeliefId: followerBelief,
    holyCityId: cityId,
    foundedOnTurn: state.turn,
  };

  const updatedReligionSlot: ReligionSlotState = {
    ...(state.religion ?? { religions: [] }),
    religions: [...existingReligions, newRecord],
  };

  const event: GameEvent = {
    turn: state.turn,
    playerId,
    message: `${player.name} founded ${religionName} in ${city.name}.`,
    type: 'legacy',
  };

  return {
    ...state,
    players: updatedPlayers,
    log: [...state.log, event],
    religion: updatedReligionSlot,
  };
}
