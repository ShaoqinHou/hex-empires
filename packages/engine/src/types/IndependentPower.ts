import type { Age } from './GameState';

/**
 * Definition for an Independent Power (city-state / mercantile republic /
 * military outpost). Stored in GameConfig.independentPowers.
 *
 * Each IndependentPowerDef is static content: the per-game runtime state
 * lives in GameState.independentPowers as IndependentPowerState.
 */
export interface IndependentPowerDef {
  readonly id: string;
  readonly name: string;
  readonly type: 'militaristic' | 'cultural' | 'scientific' | 'economic' | 'diplomatic' | 'expansionist';
  readonly age: Age;
  /** Whether this IP spawns as hostile by default (barbarian analog) */
  readonly defaultAttitude: 'neutral' | 'friendly' | 'hostile';
  /**
   * Pool of bonus IDs available to suzerains.
   * First suzerain picks from the full pool; later suzerains pick from remainder.
   * Bonus IDs are strings referencing EffectDef descriptors resolved by independentPowerSystem.
   */
  readonly bonusPool: ReadonlyArray<string>;
  /** Flavour description shown in IndependentPowersPanel */
  readonly description?: string;
}
