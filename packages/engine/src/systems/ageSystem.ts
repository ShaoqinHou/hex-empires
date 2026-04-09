import type { GameState, GameAction, ActiveEffect } from '../types/GameState';

/**
 * AgeSystem handles age transitions.
 * When a player's ageProgress reaches the threshold, they can transition.
 * TRANSITION_AGE action: pick a new civilization for the next age, get legacy bonus.
 */
export function ageSystem(state: GameState, action: GameAction): GameState {
  if (action.type !== 'TRANSITION_AGE') return state;

  const player = state.players.get(state.currentPlayerId);
  if (!player) return state;

  const nextAge = getNextAge(player.age);
  if (!nextAge) return state; // already in modern age

  const threshold = state.age.ageThresholds[nextAge];
  if (player.ageProgress < threshold) return state; // not ready

  // Get legacy bonus from current civ
  const legacyBonus = getCivLegacyBonus(player.civilizationId);

  const updatedPlayers = new Map(state.players);
  updatedPlayers.set(player.id, {
    ...player,
    civilizationId: action.newCivId,
    age: nextAge,
    ageProgress: 0,
    legacyBonuses: legacyBonus
      ? [...player.legacyBonuses, legacyBonus]
      : player.legacyBonuses,
  });

  return {
    ...state,
    players: updatedPlayers,
    age: { ...state.age, currentAge: nextAge },
    log: [...state.log, {
      turn: state.turn,
      playerId: state.currentPlayerId,
      message: `Transitioned to ${nextAge} age as ${action.newCivId}`,
      type: 'age',
    }],
  };
}

function getNextAge(current: string): 'exploration' | 'modern' | null {
  switch (current) {
    case 'antiquity': return 'exploration';
    case 'exploration': return 'modern';
    default: return null;
  }
}

function getCivLegacyBonus(civId: string): ActiveEffect | null {
  const bonuses: Record<string, ActiveEffect> = {
    rome: {
      source: `legacy:${civId}`,
      effect: { type: 'MODIFY_YIELD', target: 'empire', yield: 'production', value: 2 },
    },
    egypt: {
      source: `legacy:${civId}`,
      effect: { type: 'MODIFY_YIELD', target: 'empire', yield: 'culture', value: 2 },
    },
    greece: {
      source: `legacy:${civId}`,
      effect: { type: 'MODIFY_YIELD', target: 'empire', yield: 'science', value: 2 },
    },
    persia: {
      source: `legacy:${civId}`,
      effect: { type: 'MODIFY_YIELD', target: 'empire', yield: 'gold', value: 3 },
    },
    india: {
      source: `legacy:${civId}`,
      effect: { type: 'MODIFY_YIELD', target: 'empire', yield: 'faith', value: 3 },
    },
    china: {
      source: `legacy:${civId}`,
      effect: { type: 'MODIFY_YIELD', target: 'empire', yield: 'science', value: 1 },
    },
  };
  return bonuses[civId] ?? null;
}
