import type { EffectDef } from './GameState';

/**
 * TraditionDef — a persistent cross-age civic tradition (Civic-tree second
 * layer). Traditions are unlocked by completing a specific civic and persist
 * across age transitions; they accumulate into the player's adopted set via
 * PlayerState.traditions.
 *
 * F-05 / F-06: This file establishes the architectural skeleton. Full
 * tree-placement, mastery integration, and selection UI are deferred to
 * later phases.
 */
export interface TraditionDef {
  /** Unique identifier, kebab-case (e.g. 'tradition-bronze-craftsmanship') */
  readonly id: string;
  readonly name: string;
  readonly description: string;
  /** Age in which this tradition can be unlocked */
  readonly age: 'antiquity' | 'exploration' | 'modern';
  /**
   * The civic ID whose completion makes this tradition available to adopt.
   * E.g. 'craftsmanship' unlocks 'tradition-bronze-craftsmanship'.
   */
  readonly unlockCivic: string;
  /**
   * Ongoing empire-wide effects while this tradition is adopted.
   * Optional — some traditions grant narrative/UI benefits without numeric
   * yields.
   */
  readonly effect?: ReadonlyArray<EffectDef>;
}
