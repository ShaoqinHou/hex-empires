/**
 * legendsSystem — cross-session meta-progression evaluator.
 *
 * Runs on END_TURN (after all other systems). Evaluates Foundation Challenges
 * and Leader Challenges against the current game state. Returns a delta that
 * the web layer merges into the persisted AccountState.
 *
 * This system is PURE: it takes (state, account, activeChallenges) and returns
 * { state, accountDelta }. It never persists anything directly — the web layer
 * owns localStorage/cloud persistence.
 *
 * Wire-up: legendsSystem is NOT part of DEFAULT_SYSTEMS (it returns a different
 * shape). The GameEngine exposes it as a separate call:
 *   const { state: next, accountDelta } = applyLegends(state, account);
 * The web layer then merges accountDelta into its stored AccountState.
 */

import type { GameState, GameAction } from '../types/GameState';
import type { AccountState, AccountStateDelta } from '../types/AccountState';
import type { AchievementCondition } from '../data/achievements';
import type { FoundationChallengeDef } from '../data/foundation-challenges';
import type { LeaderChallengeDef } from '../data/leader-challenges';
import type { MementoDef } from '../types/Memento';

/** Result produced by legendsSystem */
export interface LegendsResult {
  readonly state: GameState;
  readonly accountDelta: AccountStateDelta;
}

/**
 * Evaluate an AchievementCondition against the human player's current game state.
 * Returns true if the condition is met.
 */
function evaluateCondition(state: GameState, playerId: string, condition: AchievementCondition): boolean {
  const player = state.players.get(playerId);
  if (!player) return false;

  switch (condition.type) {
    case 'cities_at_least': {
      const playerCities = [...state.cities.values()].filter(c => c.owner === playerId);
      return playerCities.length >= condition.count;
    }
    case 'techs_researched_at_least': {
      return player.researchedTechs.length >= condition.count;
    }
    case 'buildings_built_at_least': {
      const totalBuildings = [...state.cities.values()]
        .filter(c => c.owner === playerId)
        .reduce((sum, c) => sum + c.buildings.length, 0);
      return totalBuildings >= condition.count;
    }
    case 'combat_wins_at_least': {
      return (player.totalKills ?? 0) >= condition.count;
    }
    case 'age_at_least': {
      const ageOrder: ReadonlyArray<string> = ['antiquity', 'exploration', 'modern'];
      return ageOrder.indexOf(state.age.currentAge) >= ageOrder.indexOf(condition.age);
    }
    default:
      return false;
  }
}

/**
 * Find which mementos are newly unlocked by completing a given set of challenges.
 */
function findNewlyUnlockedMementos(
  completedChallengeIds: ReadonlyArray<string>,
  alreadyUnlocked: ReadonlyArray<string>,
  mementos: ReadonlyMap<string, MementoDef>,
): ReadonlyArray<string> {
  const newlyUnlocked: string[] = [];
  for (const memento of mementos.values()) {
    if (alreadyUnlocked.includes(memento.id)) continue;
    if (!memento.unlockCondition) continue;
    if (memento.unlockCondition.type === 'challenge') {
      if (completedChallengeIds.includes(memento.unlockCondition.challengeId)) {
        newlyUnlocked.push(memento.id);
      }
    }
  }
  return newlyUnlocked;
}

/**
 * Core legends evaluation. Called by the web layer on END_TURN.
 * @param state - current (post-pipeline) game state
 * @param account - the player's current AccountState
 * @param humanPlayerId - the human player ID to evaluate against
 */
export function evaluateLegends(
  state: GameState,
  account: AccountState,
  humanPlayerId: string,
): LegendsResult {
  const player = state.players.get(humanPlayerId);
  if (!player) {
    return {
      state,
      accountDelta: {
        foundationXPGained: 0,
        leaderXPGained: new Map(),
        newlyCompletedChallenges: [],
        newlyUnlockedMementos: [],
      },
    };
  }

  let foundationXPGained = 0;
  const leaderXPGained = new Map<string, number>();
  const newlyCompletedChallenges: string[] = [];

  // Use config-seam collections; fall back to empty if not populated (pre-W3-06 configs).
  const foundationChallenges = state.config.foundationChallenges ?? new Map<string, FoundationChallengeDef>();
  const leaderChallenges = state.config.leaderChallenges ?? new Map<string, LeaderChallengeDef>();
  const mementos = state.config.mementos ?? new Map<string, MementoDef>();

  // ── Foundation Challenges ──
  for (const challenge of foundationChallenges.values()) {
    if (account.completedChallenges.includes(challenge.id)) continue;
    if (evaluateCondition(state, humanPlayerId, challenge.condition)) {
      newlyCompletedChallenges.push(challenge.id);
      foundationXPGained += challenge.xp;
    }
  }

  // ── Leader Challenges (only those matching the player's current leader) ──
  const playerLeaderId = player.leaderId;
  for (const challenge of leaderChallenges.values()) {
    if (challenge.leaderId !== playerLeaderId) continue;
    if (account.completedChallenges.includes(challenge.id)) continue;
    if (evaluateCondition(state, humanPlayerId, challenge.condition)) {
      newlyCompletedChallenges.push(challenge.id);
      const existing = leaderXPGained.get(playerLeaderId) ?? 0;
      leaderXPGained.set(playerLeaderId, existing + challenge.xp);
    }
  }

  // ── Determine newly unlocked mementos ──
  const allCompletedAfterDelta = [
    ...account.completedChallenges,
    ...newlyCompletedChallenges,
  ];
  const newlyUnlockedMementos = findNewlyUnlockedMementos(
    allCompletedAfterDelta,
    account.unlockedMementos,
    mementos,
  );

  const accountDelta: AccountStateDelta = {
    foundationXPGained,
    leaderXPGained,
    newlyCompletedChallenges,
    newlyUnlockedMementos,
  };

  return { state, accountDelta };
}

/**
 * legendsSystem — pipeline-compatible wrapper.
 * Returns state unchanged; accountDelta is returned separately via evaluateLegends.
 * This exists so the system can be registered if needed but the actual work
 * is done via evaluateLegends called from the web layer on END_TURN.
 */
export function legendsSystem(state: GameState, action: GameAction): GameState {
  if (action.type !== 'END_TURN') return state;
  // The pipeline itself just passes state through.
  // The web layer calls evaluateLegends separately with the current AccountState.
  return state;
}

/** Type-safe re-export for convenience */
export type { FoundationChallengeDef };
export type { LeaderChallengeDef };
