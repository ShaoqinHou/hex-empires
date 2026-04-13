import type { GameState, GameAction } from '../types/GameState';

// Re-export utility functions from state/EffectUtils so existing imports via effectSystem still work.
export { getActiveEffects, getYieldBonus, getCombatBonus, getMovementBonus, getProductionDiscount } from '../state/EffectUtils';

/**
 * EffectSystem is a pass-through in the pipeline (effects are computed on demand).
 * The real work is done by getActiveEffects() in state/EffectUtils.ts.
 */
export function effectSystem(state: GameState, action: GameAction): GameState {
  return state;
}
