import type { YieldSet } from './Yields';

export interface BuildingDef {
  readonly id: string;
  readonly name: string;
  readonly age: 'antiquity' | 'exploration' | 'modern';
  readonly cost: number;          // production cost
  readonly maintenance: number;   // gold per turn
  readonly yields: Partial<YieldSet>;
  readonly effects: ReadonlyArray<string>; // effect descriptions
  readonly requiredTech: string | null;
  readonly growthRateBonus?: number; // 0-1 fraction; reduces growth threshold (e.g. 0.1 = -10% threshold)
  /** Building category for maintenance cost grouping */
  readonly category?: 'warehouse' | 'science' | 'culture' | 'gold' | 'happiness' | 'military' | 'food' | 'wonder';
  /** Happiness maintenance cost per turn (default 0). Science/culture/military buildings cost 2-4 by age. */
  readonly happinessCost?: number;
  /** Whether this is a world wonder (only one can be built per game) */
  readonly isWonder?: boolean;
  /** Great person points generated per turn */
  readonly greatPersonPoints?: { type: string; amount: number };
}
