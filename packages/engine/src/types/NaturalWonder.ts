import type { EffectDef } from './GameState';
import type { YieldSet } from './Yields';

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
  /**
   * F-08: Static per-tile yield bonus granted to any city territory containing this
   * natural wonder tile. Added on top of the base terrain yields.
   * Optional so existing NaturalWonderDef definitions compile unchanged.
   */
  readonly yields?: Partial<YieldSet>;
}
