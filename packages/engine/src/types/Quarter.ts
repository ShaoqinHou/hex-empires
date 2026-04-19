import type { EffectDef } from './GameState';

/**
 * A named Quarter definition — civ-unique building-pair bonuses.
 *
 * When two civ-unique buildings from the same civilization occupy the same
 * urban tile, the system detects a `unique_quarter` and applies the
 * `bonusEffect` to that tile's yield output.
 *
 * The 6 canonical entries live in `data/quarters/` and are registered into
 * `GameConfig.quarters` by `GameConfigFactory`.
 */
export interface QuarterDef {
  readonly id: string;
  readonly name: string;
  /** CivilizationId that owns this quarter (civ-lock: only fires for this civ). */
  readonly civId: string;
  /** Exactly 2 building ids that form this quarter (order-independent). */
  readonly requiredBuildings: readonly [string, string];
  /** Bonus effect applied to the tile's yield when the quarter is active. */
  readonly bonusEffect: EffectDef;
}
