import type { GameState, GameAction, ActiveEffect } from '../types/GameState';

/**
 * EffectSystem collects and applies active effects from civ abilities,
 * leader abilities, and legacy bonuses.
 * Called on START_TURN to refresh effect-based modifiers.
 */
export function effectSystem(state: GameState, action: GameAction): GameState {
  if (action.type !== 'START_TURN') return state;

  // Collect all active effects for current player
  const player = state.players.get(state.currentPlayerId);
  if (!player) return state;

  // For now, effects are passively tracked in player.legacyBonuses
  // A full implementation would apply MODIFY_YIELD effects to city yields,
  // MODIFY_COMBAT to unit strengths, etc.
  // The individual systems (growthSystem, combatSystem) should query active effects.

  return state;
}

/** Get all active effects for a player */
export function getActiveEffects(state: GameState, playerId: string): ReadonlyArray<ActiveEffect> {
  const player = state.players.get(playerId);
  if (!player) return [];

  return [...player.legacyBonuses];
}
