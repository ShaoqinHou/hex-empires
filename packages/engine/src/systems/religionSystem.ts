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
 *    faith, then deducts faith and emits a log event. Actual pantheon
 *    ownership tracking (per-player `pantheonId`) will land in cycle D
 *    once `PlayerState` / `ReligionState` are attached to `GameState`.
 *  - All other actions — including the other `ReligionAction` variants
 *    (FOUND_RELIGION, SPREAD_RELIGION, …) — are pass-through no-ops in
 *    this cycle.
 *
 * Graceful no-op behaviour: if `PlayerState` does not expose `faith`
 * (i.e. the schema has been trimmed in some future refactor), the
 * system returns state unchanged rather than throwing. This keeps the
 * scaffolding forward-compatible.
 *
 * Import boundaries:
 *  - Imports only from `../types/`, `../data/religion/` (same precedent
 *    as `crisisSystem`, `improvementSystem`, …), and nothing from other
 *    systems.
 */

import type { GameState, GameAction, GameEvent, PlayerState } from '../types/GameState';
import type { PlayerId } from '../types/Ids';
import type { ReligionAction, PantheonId, PantheonDef } from '../types/Religion';
import { ALL_PANTHEONS } from '../data/religion/pantheons';

/**
 * Widened action type accepted by religionSystem. The pipeline's
 * canonical `GameAction` does not yet include `ReligionAction`; cycle D
 * will unify them. For now religionSystem accepts either so callers
 * (and tests) may dispatch `ReligionAction` shapes directly without the
 * system stripping types.
 */
export type ReligionSystemAction = GameAction | ReligionAction;

/** Look up a pantheon by id from the M9 catalog. */
function findPantheon(pantheonId: PantheonId): PantheonDef | undefined {
  return ALL_PANTHEONS.find((p) => p.id === pantheonId);
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

  const pantheon = findPantheon(pantheonId);
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
 */
export function religionSystem(state: GameState, action: ReligionSystemAction): GameState {
  if (action.type !== 'ADOPT_PANTHEON') return state;

  const { playerId, pantheonId } = action;
  const player = state.players.get(playerId);
  if (!player) return state;
  if (!playerHasFaithField(player)) return state;

  const pantheon = findPantheon(pantheonId);
  if (!pantheon) return state;
  if (player.faith < pantheon.faithCost) return state;

  const updatedPlayer: PlayerState = {
    ...player,
    faith: player.faith - pantheon.faithCost,
  };

  const updatedPlayers = new Map(state.players);
  updatedPlayers.set(playerId, updatedPlayer);

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
  };
}
