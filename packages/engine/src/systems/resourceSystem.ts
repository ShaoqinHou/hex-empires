import type { GameState, GameAction } from '../types/GameState';
import { calculateCityYields } from '../state/YieldCalculator';

/**
 * ResourceSystem accumulates per-turn yields (gold, science, culture, faith)
 * from all cities at END_TURN.
 */
export function resourceSystem(state: GameState, action: GameAction): GameState {
  if (action.type !== 'END_TURN') return state;

  const updatedPlayers = new Map(state.players);
  let changed = false;

  for (const [playerId, player] of state.players) {
    if (playerId !== state.currentPlayerId) continue;

    let totalGold = 0;
    let totalScience = 0;
    let totalCulture = 0;
    let totalFaith = 0;

    for (const city of state.cities.values()) {
      if (city.owner !== playerId) continue;
      const yields = calculateCityYields(city, state);
      totalGold += yields.gold;
      totalScience += yields.science;
      totalCulture += yields.culture;
      totalFaith += yields.faith;
    }

    // Unit maintenance (1 gold per military unit)
    let maintenance = 0;
    for (const unit of state.units.values()) {
      if (unit.owner === playerId) {
        const isCivilian = state.config.units.get(unit.typeId)?.category === 'civilian';
        if (!isCivilian) maintenance += 1;
      }
    }

    updatedPlayers.set(playerId, {
      ...player,
      gold: player.gold + totalGold - maintenance,
      science: player.science + totalScience,
      culture: player.culture + totalCulture,
      faith: player.faith + totalFaith,
    });
    changed = true;
  }

  if (!changed) return state;
  return { ...state, players: updatedPlayers };
}
