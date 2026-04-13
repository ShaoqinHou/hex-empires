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
    readonly yieldType?: 'food' | 'production' | 'gold' | 'science' | 'culture' | 'faith' | 'influence';
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

