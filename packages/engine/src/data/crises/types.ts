import type { EffectDef } from '../../types/GameState';

export type CrisisTriggerCondition =
  | 'turn_reached'
  | 'tech_researched'
  | 'war_declared'
  | 'city_founded'
  | 'compound'
  | 'age_progress';

/**
 * Compound trigger — all sub-conditions must be satisfied simultaneously.
 *
 * Supported sub-condition keys:
 *   minTurn            — state.turn >= value
 *   minCityPopulation  — at least one player city has population >= value
 *   minResearchedTechs — player.researchedTechs.length >= value
 */
export interface CompoundTriggerCondition {
  readonly minTurn?: number;
  readonly minCityPopulation?: number;
  readonly minResearchedTechs?: number;
}

/** Age era this crisis belongs to — used for per-age crisis pool selection. */
export type CrisisAge = 'antiquity' | 'exploration' | 'modern';

/** Broad thematic type — used for pool filtering and seeded RNG selection. */
export type CrisisType = 'plague' | 'revolt' | 'invasion' | 'revolution' | 'wars_of_religion';

export interface CrisisEventDef {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly triggerCondition: CrisisTriggerCondition;
  readonly triggerValue: string | number; // turn number, tech id, or threshold (0-1 for age_progress)
  /** Only used when triggerCondition === 'compound'. */
  readonly compoundTrigger?: CompoundTriggerCondition;
  /**
   * Age era this crisis belongs to. Used to build per-age pools so that
   * ageSystem can seed one crisis per age via seeded RNG.
   */
  readonly age?: CrisisAge;
  /**
   * Broad thematic type. Used by pool selection and UI filtering.
   */
  readonly crisisType?: CrisisType;
  readonly choices: ReadonlyArray<{
    readonly id: string;
    readonly text: string;
    readonly effects: ReadonlyArray<{ readonly type: string; readonly target: string; readonly yield?: string; readonly value: number; readonly probability?: number }>;
  }>;
}
