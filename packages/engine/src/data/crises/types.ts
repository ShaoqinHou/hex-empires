import type { EffectDef } from '../../types/GameState';

export type CrisisTriggerCondition = 'turn_reached' | 'tech_researched' | 'war_declared' | 'city_founded' | 'compound';

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

export interface CrisisEventDef {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly triggerCondition: CrisisTriggerCondition;
  readonly triggerValue: string | number; // turn number, tech id, etc.
  /** Only used when triggerCondition === 'compound'. */
  readonly compoundTrigger?: CompoundTriggerCondition;
  readonly choices: ReadonlyArray<{
    readonly id: string;
    readonly text: string;
    readonly effects: ReadonlyArray<{ readonly type: string; readonly target: string; readonly yield?: string; readonly value: number; readonly probability?: number }>;
  }>;
}
