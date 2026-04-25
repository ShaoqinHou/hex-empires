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
  /**
   * True if this is a repeatable Future Tech entry.
   * Future Tech grants +10 age progress on completion and can be
   * researched again indefinitely (never added to researchedTechs).
   */
  readonly isFutureTech?: boolean;
  /**
   * Y2.3: Persistent yield effects applied while this tech is researched.
   * MODIFY_YIELD effects are processed by YieldCalculator for all cities.
   * Optional so existing TechnologyDef construction keeps compiling unchanged.
   */
  readonly effects?: ReadonlyArray<EffectDef>;
}
