/**
 * IPStateFactory — creates default IndependentPowerState from a config definition.
 *
 * Extracted from independentPowerSystem so that ageSystem can re-seed IPs on
 * age transition without creating a cross-system import dependency.
 */

import type { IndependentPowerState } from '../types/GameState';

/** Create a default IndependentPowerState from a config def. */
export function createDefaultIPState(def: {
  readonly id: string;
  readonly type: 'militaristic' | 'cultural' | 'scientific' | 'economic' | 'diplomatic' | 'expansionist';
  readonly defaultAttitude: 'neutral' | 'friendly' | 'hostile';
  readonly bonusPool: ReadonlyArray<string>;
}): IndependentPowerState {
  return {
    id: def.id,
    type: def.type,
    attitude: def.defaultAttitude,
    position: { q: 0, r: 0 }, // position assigned by map-gen; placeholder here
    befriendProgress: 0,
    suzerainPlayerId: null,
    isIncorporated: false,
    isCityState: true,
    bonusPool: [...def.bonusPool],
  };
}
