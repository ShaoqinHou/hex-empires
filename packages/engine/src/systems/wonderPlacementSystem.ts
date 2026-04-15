import type { GameState, GameAction } from '../types/GameState';

// Re-export the pure validation helper and its type so existing callers
// that import from this module continue to work.
export type { WonderPlacementValidation } from '../state/WonderPlacementUtils';
export { isWonderPlacementValid } from '../state/WonderPlacementUtils';

/**
 * WonderPlacementSystem is a standalone pass-through system. It exposes
 * `isWonderPlacementValid` (via `state/WonderPlacementUtils`) as the
 * consumable API; the pipeline-facing function itself performs no state
 * mutation.
 *
 * This system is intentionally NOT wired into the `SYSTEMS` pipeline yet —
 * a later cycle will integrate the validator into `urbanBuildingSystem`
 * so that wonder-placement actions on ineligible tiles are rejected with
 * a structured validation error.
 */
export function wonderPlacementSystem(state: GameState, _action: GameAction): GameState {
  return state;
}
