import type { GameState, GameAction } from '../types/GameState';
import { coordToKey, range } from '../hex/HexMath';

/**
 * VisibilitySystem recalculates fog of war on START_TURN.
 * Each unit provides sight radius (default 2). Cities provide sight radius 3.
 * Tiles in range are "visible". Previously visible tiles become "explored".
 */
export function visibilitySystem(state: GameState, action: GameAction): GameState {
  if (action.type !== 'START_TURN') return state;

  const player = state.players.get(state.currentPlayerId);
  if (!player) return state;

  // Previous visibility becomes explored
  const explored = new Set(player.explored);
  for (const key of player.visibility) {
    explored.add(key);
  }

  // Calculate new visibility
  const visible = new Set<string>();

  // Units provide sight
  for (const unit of state.units.values()) {
    if (unit.owner !== state.currentPlayerId) continue;
    const sightRange = getSightRange(state, unit.typeId);
    for (const hex of range(unit.position, sightRange)) {
      const key = coordToKey(hex);
      if (state.map.tiles.has(key)) {
        visible.add(key);
        explored.add(key);
      }
    }
  }

  // Cities provide sight
  for (const city of state.cities.values()) {
    if (city.owner !== state.currentPlayerId) continue;
    for (const hex of range(city.position, 3)) {
      const key = coordToKey(hex);
      if (state.map.tiles.has(key)) {
        visible.add(key);
        explored.add(key);
      }
    }
  }

  const updatedPlayers = new Map(state.players);
  updatedPlayers.set(state.currentPlayerId, {
    ...player,
    visibility: visible,
    explored,
  });

  return { ...state, players: updatedPlayers };
}

function getSightRange(state: GameState, typeId: string): number {
  return state.config.units.get(typeId)?.sightRange ?? 2;
}
