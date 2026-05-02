import type { GameState, GameAction } from '../types/GameState';

/**
 * FortifySystem handles the FORTIFY_UNIT action.
 * Fortified units consume all remaining movement and gain a flat +5 combat
 * strength on defense. The CS bonus is applied in
 * combatSystem.getEffectiveDefenseStrength.
 */
export function fortifySystem(state: GameState, action: GameAction): GameState {
  if (action.type !== 'FORTIFY_UNIT') return state;

  const unit = state.units.get(action.unitId);
  if (!unit) return state;
  if (unit.owner !== state.currentPlayerId) return state;

  // Civilians can't fortify
  if (state.config.units.get(unit.typeId)?.category === 'civilian') return state;

  const updatedUnits = new Map(state.units);
  updatedUnits.set(unit.id, {
    ...unit,
    fortified: !unit.fortified, // toggle fortification
    movementLeft: 0, // fortifying uses all movement
  });

  return { ...state, units: updatedUnits };
}
