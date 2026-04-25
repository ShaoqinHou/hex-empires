import type { EffectDef } from './GameState';

export interface CivicDef {
  readonly id: string;
  readonly name: string;
  readonly age: 'antiquity' | 'exploration' | 'modern';
  readonly cost: number; // culture points needed
  readonly prerequisites: ReadonlyArray<string>;
  readonly unlocks: ReadonlyArray<string>; // buildings/abilities unlocked
  readonly description: string;
  readonly treePosition: { readonly row: number; readonly col: number };
  /** If set, this civic is only available to the specified civilization. Undefined = universal. */
  readonly civId?: string;
  /**
   * If set, this civic belongs to an ideology branch and is only available
   * after the player selects that ideology via SELECT_IDEOLOGY. Civics from
   * the other two branches are locked out once an ideology is chosen.
   * Only used in the Modern age (W2-03 CT F-08).
   */
  readonly ideologyBranch?: 'democracy' | 'fascism' | 'communism';
  /**
   * F-09: Per-civic mastery unlock effects. When a player masters this civic
   * (re-researches it at 80% cost), these effects are applied instead of the
   * generic +1 culture/turn. Undefined falls back to MODIFY_YIELD/culture/+1.
   */
  readonly masteryUnlocks?: ReadonlyArray<EffectDef>;
  /**
   * Y2.1: On-completion effects applied when this civic is researched.
   * GRANT_POLICY_SLOT effects increment the player's policySlotCounts.
   * Optional so existing CivicDef construction keeps compiling unchanged.
   */
  readonly effects?: ReadonlyArray<EffectDef>;
  /**
   * EE1: If set, completing this civic appends the named tradition ID to the
   * player's traditions list (no duplicates). The tradition's effects are then
   * applied via getActiveEffects() in EffectUtils.
   * Optional so existing CivicDef construction compiles unchanged.
   */
  readonly unlocksTradition?: string;
}
