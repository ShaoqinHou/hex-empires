import type { EffectDef } from './GameState';

export type NaturalWonderType = 'fresh-water' | 'volcano' | 'promotion' | 'scenic' | 'resource-bonus';

export interface NaturalWonderDef {
  readonly id: string;
  readonly name: string;
  readonly type: NaturalWonderType;
  /** Number of map tiles this wonder occupies (1 or 2) */
  readonly tileCount: 1 | 2;
  /** Bonus applied to the first civilization to settle adjacent to this wonder */
  readonly firstSettleBonus: EffectDef;
  /** Descriptive text for the wonder */
  readonly description: string;
}
