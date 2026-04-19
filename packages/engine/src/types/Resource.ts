import type { YieldSet } from './Yields';
import type { Age } from './GameState';

/**
 * Per-age bonus row for a resource.
 * Civ VII: resources have different effects depending on the current age.
 */
export interface ResourceBonusRow {
  /** Flat yield bonuses granted per turn when the resource is assigned to a city */
  readonly yields?: Partial<YieldSet>;
  /** Happiness bonus granted per turn (city resources) */
  readonly happiness?: number;
  /**
   * Combat strength modifier applied when the owning player's units of
   * matching category fight (empire resources only, F-03).
   * `versusCategory` further restricts to attacks against a specific category.
   */
  readonly combatMod?: {
    readonly unitCategory: string;
    readonly value: number;
    readonly versusCategory?: string;
  };
}

/**
 * Resource type taxonomy aligned with Civ VII (§13.3):
 * - bonus: tile yield improvement, no special effects
 * - city: assigned to settlements for happiness/yields
 * - empire: empire-wide bonus, often combat strength modifiers
 * - treasureFleet: rare resources from Exploration age treasure fleets
 * - factory: resources powering Factory Town specialization
 */
export type ResourceType = 'bonus' | 'city' | 'empire' | 'treasureFleet' | 'factory';

export interface ResourceDef {
  readonly id: string;
  readonly name: string;
  readonly type: ResourceType;
  /** Base tile yield bonus when a city works this tile (applies always, regardless of assignment) */
  readonly yieldBonus: Partial<YieldSet>;
  readonly validTerrains: ReadonlyArray<string>; // terrain IDs where this can spawn
  /** Base happiness bonus (used by legacy code; per-age row overrides via bonusTable) */
  readonly happinessBonus: number;
  /**
   * Per-age bonus table (F-02). When a resource is assigned to a city OR owned
   * by a player (empire resources), the row for the current age is applied.
   * Absent rows = no special bonus for that age.
   */
  readonly bonusTable?: Partial<Record<Age, ResourceBonusRow>>;
}
