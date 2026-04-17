/**
 * Achievement definitions — player milestones earned during a game.
 * Unlocks are computed by `achievementSystem` after each END_TURN.
 */

import type { Age } from '../../types/GameState';

export type AchievementId =
  | 'first_city'
  | 'first_combat_victory'
  | 'scholar'
  | 'architect'
  | 'age_explorer'
  | 'age_modernist';

export interface AchievementDef {
  readonly id: AchievementId;
  readonly name: string;
  readonly description: string;
  readonly icon: string;
  /**
   * Condition payload — shape depends on `type` discriminator.
   * Read by `achievementSystem` when evaluating unlock eligibility.
   */
  readonly condition: any;
}

export const ALL_ACHIEVEMENTS: ReadonlyArray<AchievementDef> = [
  {
    id: 'first_city',
    name: 'Founder',
    description: 'Found your first city.',
    icon: '🏛️',
    condition: { type: 'cities_at_least', count: 1 },
  },
  {
    id: 'first_combat_victory',
    name: 'Warrior',
    description: 'Win your first combat encounter.',
    icon: '⚔️',
    condition: { type: 'combat_wins_at_least', count: 1 },
  },
  {
    id: 'scholar',
    name: 'Scholar',
    description: 'Research five technologies.',
    icon: '📚',
    condition: { type: 'techs_researched_at_least', count: 5 },
  },
  {
    id: 'architect',
    name: 'Architect',
    description: 'Build ten buildings across your empire.',
    icon: '🏗️',
    condition: { type: 'buildings_built_at_least', count: 10 },
  },
  {
    id: 'age_explorer',
    name: 'Time Traveler',
    description: 'Reach the Exploration Age.',
    icon: '⏳',
    condition: { type: 'age_at_least', age: 'exploration' as Age },
  },
  {
    id: 'age_modernist',
    name: 'Futurist',
    description: 'Reach the Modern Age.',
    icon: '🚀',
    condition: { type: 'age_at_least', age: 'modern' as Age },
  },
];
