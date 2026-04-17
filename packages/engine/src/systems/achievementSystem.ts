/**
 * AchievementSystem — evaluates unlock conditions at end of turn.
 * Players accumulate achievements over the course of a game; this
 * system walks state.config.achievements, checks each condition against
 * the current state, and records any newly-satisfied ones on the player.
 */

import type { GameState, GameAction } from '../types/GameState';
import type { PlayerId } from '../types/Ids';
import type { AchievementId, AchievementCondition } from '../data/achievements';

const AGE_ORDER = ['antiquity', 'exploration', 'modern'] as const;

/**
 * Mapping of player → their unlocked achievements. Kept on the game
 * state as a side-band map so the PlayerState interface doesn't have
 * to widen for UI-only tracking.
 */
export type AchievementsByPlayer = ReadonlyMap<PlayerId, ReadonlyArray<AchievementId>>;

export function getAchievementsForPlayer(
  state: GameState,
  playerId: PlayerId,
): ReadonlyArray<AchievementId> {
  const map = (state as unknown as { achievements?: AchievementsByPlayer }).achievements;
  return map?.get(playerId) ?? [];
}

export function achievementSystem(state: GameState, action: GameAction): GameState {
  if (action.type !== 'END_TURN') return state;

  const playerId = state.currentPlayerId;
  const player = state.players.get(playerId);
  if (!player) return state;

  const existing = getAchievementsForPlayer(state, playerId);
  const existingSet = new Set(existing);

  const newlyUnlocked: AchievementId[] = [];
  for (const ach of state.config.achievements.values()) {
    if (existingSet.has(ach.id)) continue;
    if (conditionSatisfied(state, player, ach.condition)) {
      newlyUnlocked.push(ach.id);
    }
  }

  if (newlyUnlocked.length === 0) return state;

  const nextAchievements = new Map(
    (state as unknown as { achievements?: Map<PlayerId, ReadonlyArray<AchievementId>> }).achievements ?? [],
  );
  nextAchievements.set(playerId, [...existing, ...newlyUnlocked]);

  return {
    ...state,
    achievements: nextAchievements,
  } as unknown as GameState;
}

function conditionSatisfied(
  state: GameState,
  player: ReturnType<GameState['players']['get']>,
  condition: AchievementCondition,
): boolean {
  if (!player) return false;
  switch (condition.type) {
    case 'cities_at_least': {
      const owned = [...state.cities.values()].filter(c => c.owner === player.id).length;
      return owned >= condition.count;
    }
    case 'techs_researched_at_least':
      // Source of truth for researched-tech count lives in research state.
      return player.researchedTechs.length >= condition.count;
    case 'buildings_built_at_least': {
      const built = [...state.cities.values()]
        .filter(c => c.owner === player.id)
        .reduce((sum, c) => sum + c.buildings.length, 0);
      return built >= condition.count;
    }
    case 'age_at_least': {
      const current = AGE_ORDER.indexOf(state.age.currentAge);
      const target = AGE_ORDER.indexOf(condition.age);
      return target >= 0 && current >= target;
    }
    case 'combat_wins_at_least':
      // Combat stats not yet tracked per-player; stub to false until wired.
      return false;
  }
}
