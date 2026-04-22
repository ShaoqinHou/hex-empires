/**
 * Commander Aura resolver — F-04 base aura scaffold.
 *
 * Every commander projects a base aura: +1 combat strength to friendly
 * military units within 2 hexes. Promotion-based auras (defined in
 * AuraEffectDef) are additive on top of this base.
 *
 * This module is pure — reads state, returns a numeric bonus. No side
 * effects, no DOM, no Math.random().
 *
 * Full aura resolution (per-promotion stacking, target filtering by
 * UnitCategory, radius expansion from AURA_EXPAND_RADIUS picks) is
 * deferred to cycle D. This scaffold covers the base case only.
 */

import type { HexCoord } from '../types/HexCoord';
import type { GameState } from '../types/GameState';
import { distance } from '../hex/HexMath';

/** Base aura radius in hex rings before any AURA_EXPAND_RADIUS picks. */
const BASE_AURA_RADIUS = 2;

/** Base combat bonus projected by every commander. */
const BASE_COMBAT_BONUS = 1;

/**
 * Returns the total commander aura combat bonus for a unit at the given
 * position owned by the given player.
 *
 * Sums +1 per friendly commander within 2 hexes. Returns 0 when no
 * commanders map exists or no commanders are in range.
 */
export function getCommanderAuraCombatBonus(
  state: GameState,
  unitPosition: HexCoord,
  unitOwner: string,
): number {
  if (!state.commanders) return 0;

  let bonus = 0;
  for (const [commanderId] of state.commanders) {
    const commanderUnit = state.units.get(commanderId);
    if (!commanderUnit) continue;
    if (commanderUnit.owner !== unitOwner) continue;
    if (distance(commanderUnit.position, unitPosition) <= BASE_AURA_RADIUS) {
      bonus += BASE_COMBAT_BONUS;
    }
  }
  return bonus;
}