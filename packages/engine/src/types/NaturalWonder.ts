import type { EffectDef } from './GameState';
import type { YieldSet, YieldType } from './Yields';

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
   * JJ4 / F-08: Static per-tile yield bonus granted to any city territory
   * containing this natural wonder tile. Added on top of the base terrain yields.
   * Optional so existing NaturalWonderDef definitions compile unchanged.
   */
  readonly yields?: Partial<YieldSet>;
  /**
   * JJ4: Combat-strength defense bonus for units on this tile.
   * Optional; defaults to 0 (no defense bonus).
   */
  readonly defenseBonus?: number;
  /**
   * JJ4: When true this tile is impassable — units may not enter or pass
   * through it. Optional; defaults to false.
   */
  readonly impassable?: boolean;
  /**
   * JJ4: Yield bonus applied to each neighboring tile in city territory.
   * Represents the wonder's "aura" effect radiating to surrounding land.
   * Optional; only wonders with notable area effects set this field.
   */
  readonly adjacencyEffect?: { readonly yield: YieldType; readonly value: number };
}
