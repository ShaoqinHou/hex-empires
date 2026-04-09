import type { EffectDef } from '../../types/GameState';

export type CrisisTriggerCondition = 'turn_reached' | 'tech_researched' | 'war_declared' | 'city_founded';

export interface CrisisEventDef {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly triggerCondition: CrisisTriggerCondition;
  readonly triggerValue: string | number; // turn number, tech id, etc.
  readonly choices: ReadonlyArray<{
    readonly id: string;
    readonly text: string;
    readonly effects: ReadonlyArray<{ readonly type: string; readonly target: string; readonly yield?: string; readonly value: number }>;
  }>;
}
