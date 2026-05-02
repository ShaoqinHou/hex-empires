import type { GameAction, GameState } from '../types/GameState';
import { tickCommanderRespawns } from '../state/CommanderRespawn';

export function commanderRespawnSystem(state: GameState, action: GameAction): GameState {
  if (action.type !== 'START_TURN') return state;
  return tickCommanderRespawns(state);
}
