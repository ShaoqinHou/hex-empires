/**
 * Governor System
 *
 * Governors are specialized leaders that can be assigned to cities to provide
 * unique bonuses and unlock powerful abilities. They level up through experience
 * gained from city actions.
 */

import type { GovernorId, CityId } from './Ids';

/**
 * Governor titles that can be earned
 */
export type GovernorTitle =
  | 'administrator'    // Basic governance
  | 'magistrate'       // Advanced governance
  | 'prefect'          // Expert governance
  | 'consul'           // Master governance
  | 'viceroy';         // Legendary governance

/**
 * Governor specialization
 */
export type GovernorSpecialization =
  | 'economic'         // Gold and trade bonuses
  | 'military'         // Production and combat bonuses
  | 'scientific'       // Science and research bonuses
  | 'cultural'         // Culture and tourism bonuses
  | 'religious'        // Faith and religious bonuses
  | 'diplomatic';      // Influence and relation bonuses

/**
 * Governor ability
 */
export interface GovernorAbility {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly requiredLevel: number;
  readonly effect: {
    readonly type: 'yield_bonus' | 'production_bonus' | 'combat_bonus' | 'growth_bonus' | 'happiness_bonus' | 'special';
    readonly value?: number;
    readonly yieldType?: 'food' | 'production' | 'gold' | 'science' | 'culture' | 'faith';
  };
}

/**
 * Governor state - represents a recruited governor
 */
export interface Governor {
  readonly id: GovernorId;
  readonly name: string;
  readonly title: GovernorTitle;
  readonly specialization: GovernorSpecialization;
  readonly level: number;
  readonly experience: number;
  readonly experienceToNextLevel: number;
  readonly assignedCity: CityId | null;  // City where governor is assigned (null if none)
  readonly abilities: ReadonlyArray<GovernorAbility>;
  readonly promotions: ReadonlyArray<string>; // IDs of unlocked abilities
}

/**
 * Governor definition - data for a governor type
 */
export interface GovernorDef {
  readonly id: string;
  readonly name: string;
  readonly title: GovernorTitle;
  readonly specialization: GovernorSpecialization;
  readonly baseAbilities: ReadonlyArray<GovernorAbility>;
  readonly unlockableAbilities: ReadonlyArray<GovernorAbility>;
  readonly maxLevel: number;
  readonly baseExperience: number;
}

/**
 * Experience gain sources
 */
export interface GovernorExperienceSource {
  readonly type: 'founding' | 'building' | 'district' | 'wonder' | 'victory' | 'trade';
  readonly amount: number;
  readonly description: string;
}

/**
 * Calculate experience needed for a given level
 * Formula: base * (level ^ 1.5)
 */
export function getExperienceForLevel(level: number, base: number): number {
  return Math.floor(base * Math.pow(level, 1.5));
}

/**
 * Calculate total experience earned by a governor
 */
export function getTotalExperience(governor: Governor): number {
  let total = 0;
  for (let i = 1; i < governor.level; i++) {
    total += getExperienceForLevel(i, 100); // Base 100 experience per level
  }
  return total + governor.experience;
}

/**
 * Check if governor can level up
 */
export function canLevelUp(governor: Governor): boolean {
  if (governor.level >= 7) return false; // Max level
  return governor.experience >= governor.experienceToNextLevel;
}

/**
 * Get available abilities for a governor at their current level
 */
export function getAvailableAbilities(governor: Governor): ReadonlyArray<GovernorAbility> {
  const allAbilities = [...governor.abilities];
  const def = getGovernorDef(governor);
  if (def) {
    for (const ability of def.unlockableAbilities) {
      if (ability.requiredLevel <= governor.level && !governor.promotions.includes(ability.id)) {
        allAbilities.push(ability);
      }
    }
  }
  return allAbilities;
}

/**
 * Get governor definition from ID (placeholder - would be populated from data)
 */
function getGovernorDef(governor: Governor): GovernorDef | null {
  // This would normally query a registry
  return null;
}

/**
 * Experience rewards for various actions
 */
export const GOVERNOR_EXPERIENCE_REWARDS: ReadonlyArray<GovernorExperienceSource> = [
  { type: 'founding', amount: 10, description: 'City founded' },
  { type: 'building', amount: 5, description: 'Building completed' },
  { type: 'district', amount: 10, description: 'District constructed' },
  { type: 'wonder', amount: 20, description: 'Wonder completed' },
  { type: 'victory', amount: 15, description: 'Combat victory' },
  { type: 'trade', amount: 5, description: 'Trade route established' },
];
