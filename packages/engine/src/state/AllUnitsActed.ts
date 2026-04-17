import type { GameState } from '../types/GameState';

/**
 * allUnitsHaveActed — returns true when every unit owned by the current
 * player has finished their turn (movementLeft === 0 or is fortified).
 *
 * Fortified units have already committed to holding position, so they
 * count as "acted" even when movement would normally still remain.
 * No units at all also returns true (nothing left to do — end turn is
 * always valid).
 *
 * Pure function — no side effects, engine-safe (no DOM/browser APIs).
 */
export function allUnitsHaveActed(state: GameState): boolean {
  for (const unit of state.units.values()) {
    if (unit.owner !== state.currentPlayerId) continue;
    if (unit.movementLeft > 0 && !unit.fortified) return false;
  }
  return true;
}
