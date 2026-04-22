/**
 * Foundation Challenges — cross-game milestones that award Foundation XP.
 *
 * These are evaluated by legendsSystem against game state each END_TURN.
 * Once completed, they are recorded in AccountState.completedChallenges
 * and cannot be re-earned.
 */

import type { AchievementCondition } from '../achievements';

export type ChallengeCategoryFoundation =
  | 'tutorial'
  | 'wonder'
  | 'milestone'
  | 'civ_victory'
  | 'exploration'
  | 'domination'
  | 'diplomacy'
  | 'economy'
  | 'culture';

export interface FoundationChallengeDef {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly category: ChallengeCategoryFoundation;
  /** Foundation XP awarded on first completion. */
  readonly xp: number;
  /** Which in-game condition unlocks this challenge. */
  readonly condition: AchievementCondition;
  /** Optional memento unlocked on completion. */
  readonly mementoReward?: string;
}

export const ALL_FOUNDATION_CHALLENGES: ReadonlyArray<FoundationChallengeDef> = [
  {
    id: 'FIRST_CITY_FOUNDED',
    name: 'First City Founded',
    description: 'Found your first city in any game.',
    category: 'tutorial',
    xp: 50,
    condition: { type: 'cities_at_least', count: 1 },
  },
  {
    id: 'FIRST_TECH_RESEARCHED',
    name: 'First Technology',
    description: 'Research your first technology.',
    category: 'tutorial',
    xp: 50,
    condition: { type: 'techs_researched_at_least', count: 1 },
    mementoReward: 'rosetta-stone',
  },
  {
    id: 'FIRST_WONDER_BUILT',
    name: 'Wonder Builder',
    description: 'Complete your first World Wonder.',
    category: 'wonder',
    xp: 200,
    condition: { type: 'buildings_built_at_least', count: 1 },
  },
  {
    id: 'COMPLETE_ANTIQUITY',
    name: 'Age Complete: Antiquity',
    description: 'Advance to the Exploration Age.',
    category: 'milestone',
    xp: 500,
    condition: { type: 'age_at_least', age: 'exploration' },
    mementoReward: 'napoleon-hat',
  },
  {
    id: 'COMPLETE_EXPLORATION',
    name: 'Age Complete: Exploration',
    description: 'Advance to the Modern Age.',
    category: 'milestone',
    xp: 500,
    condition: { type: 'age_at_least', age: 'modern' },
    mementoReward: 'holy-grail',
  },
  {
    id: 'FIRST_DOMINATION_VICTORY',
    name: 'Conqueror',
    description: 'Win your first Domination Victory.',
    category: 'civ_victory',
    xp: 1000,
    condition: { type: 'cities_at_least', count: 5 },
    mementoReward: 'marco-polo-journal',
  },
  {
    id: 'FIRST_SCIENCE_VICTORY',
    name: 'Scientist',
    description: 'Win your first Science Victory.',
    category: 'civ_victory',
    xp: 1000,
    condition: { type: 'techs_researched_at_least', count: 15 },
    mementoReward: 'declaration-of-independence',
  },
  {
    id: 'FIRST_CULTURE_VICTORY',
    name: 'Culturalist',
    description: 'Win your first Culture Victory.',
    category: 'civ_victory',
    xp: 1000,
    condition: { type: 'buildings_built_at_least', count: 20 },
  },
  {
    id: 'EMPIRE_BUILDER',
    name: 'Empire Builder',
    description: 'Control 10 cities in a single game.',
    category: 'exploration',
    xp: 300,
    condition: { type: 'cities_at_least', count: 10 },
  },
  {
    id: 'TECH_MASTERY',
    name: 'Tech Mastery',
    description: 'Research 20 technologies in a single game.',
    category: 'exploration',
    xp: 400,
    condition: { type: 'techs_researched_at_least', count: 20 },
  },
  {
    id: 'ARCHITECT',
    name: 'Master Architect',
    description: 'Build 25 buildings across your empire.',
    category: 'wonder',
    xp: 300,
    condition: { type: 'buildings_built_at_least', count: 25 },
  },
  {
    id: 'FIRST_COMBAT_VICTORY',
    name: 'First Blood',
    description: 'Win your first combat.',
    category: 'domination',
    xp: 100,
    condition: { type: 'combat_wins_at_least', count: 1 },
  },
  {
    id: 'VETERAN_GENERAL',
    name: 'Veteran General',
    description: 'Win 10 combats in a single game.',
    category: 'domination',
    xp: 250,
    condition: { type: 'combat_wins_at_least', count: 10 },
  },
  {
    id: 'CITY_COLLECTOR',
    name: 'City Collector',
    description: 'Found 7 cities in a single game.',
    category: 'economy',
    xp: 250,
    condition: { type: 'cities_at_least', count: 7 },
  },
  {
    id: 'SCIENCE_RACE',
    name: 'Science Race',
    description: 'Research 10 technologies in a single game.',
    category: 'culture',
    xp: 200,
    condition: { type: 'techs_researched_at_least', count: 10 },
  },
  {
    id: 'GOLDEN_AGE_EARNER',
    name: 'Golden Age Earner',
    description: 'Accumulate 500 gold across a single game.',
    category: 'economy',
    xp: 250,
    condition: { type: 'cities_at_least', count: 3 },
  },
  {
    id: 'RAPID_EXPANSION',
    name: 'Rapid Expansion',
    description: 'Found 5 cities before the Exploration Age.',
    category: 'exploration',
    xp: 300,
    condition: { type: 'cities_at_least', count: 5 },
  },
  {
    id: 'WARMONGER',
    name: 'Warmonger',
    description: 'Win 20 combats in a single game.',
    category: 'domination',
    xp: 350,
    condition: { type: 'combat_wins_at_least', count: 20 },
  },
  {
    id: 'MASTERFUL_BUILDER',
    name: 'Masterful Builder',
    description: 'Build 30 buildings across your empire.',
    category: 'wonder',
    xp: 350,
    condition: { type: 'buildings_built_at_least', count: 30 },
  },
  {
    id: 'ENLIGHTENMENT',
    name: 'Enlightenment',
    description: 'Research 25 technologies in a single game.',
    category: 'culture',
    xp: 400,
    condition: { type: 'techs_researched_at_least', count: 25 },
  },
  {
    id: 'CIVILIZATION_MAX',
    name: 'Civilization Max',
    description: 'Control 15 cities in a single game.',
    category: 'exploration',
    xp: 500,
    condition: { type: 'cities_at_least', count: 15 },
  },
  {
    id: 'UNSTOPPABLE_FORCE',
    name: 'Unstoppable Force',
    description: 'Win 30 combats in a single game.',
    category: 'domination',
    xp: 500,
    condition: { type: 'combat_wins_at_least', count: 30 },
  },
  {
    id: 'MODERNITY_ACHIEVED',
    name: 'Modernity Achieved',
    description: 'Reach the Modern Age and research 10 technologies.',
    category: 'milestone',
    xp: 500,
    condition: { type: 'age_at_least', age: 'modern' },
  },
  {
    id: 'GRAND_CONSTRUCTOR',
    name: 'Grand Constructor',
    description: 'Build 40 buildings in a single game.',
    category: 'wonder',
    xp: 500,
    condition: { type: 'buildings_built_at_least', count: 40 },
  },
  {
    id: 'ULTIMATE_SCHOLAR',
    name: 'Ultimate Scholar',
    description: 'Research 30 technologies in a single game.',
    category: 'culture',
    xp: 600,
    condition: { type: 'techs_researched_at_least', count: 30 },
  },
];
