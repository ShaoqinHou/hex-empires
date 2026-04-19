import type { EffectDef } from './GameState';

export interface TechnologyDef {
  readonly id: string;
  readonly name: string;
  readonly age: 'antiquity' | 'exploration' | 'modern';
  readonly cost: number; // science points needed
  readonly prerequisites: ReadonlyArray<string>;
  readonly unlocks: ReadonlyArray<string>; // unit/building IDs unlocked
  readonly description: string;
  readonly treePosition: { readonly row: number; readonly col: number }; // for UI layout
  /** Per-tech thematic mastery bonus (replaces generic +1 science for this tech). */
  readonly masteryEffect?: EffectDef;
  /** Number of codices awarded when this tech is mastered (0-2). */
  readonly masteryCodexCount?: number;
}
