import type { YieldSet } from './Yields';

export interface ResourceDef {
  readonly id: string;
  readonly name: string;
  readonly type: 'bonus' | 'strategic' | 'luxury';
  readonly yieldBonus: Partial<YieldSet>;
  readonly validTerrains: ReadonlyArray<string>; // terrain IDs where this can spawn
  readonly happinessBonus: number; // luxury resources give happiness
}
