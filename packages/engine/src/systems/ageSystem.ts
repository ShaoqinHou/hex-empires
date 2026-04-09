import type { GameState, GameAction, ActiveEffect, LegacyPaths } from '../types/GameState';
import type { YieldType } from '../types/Yields';
import { nextRandom } from '../state/SeededRng';

/**
 * AgeSystem handles age transitions and legacy milestone tracking.
 * - TRANSITION_AGE: pick a new civilization for the next age, get legacy bonus + legacy point bonuses
 * - END_TURN: check and award legacy milestones
 */
export function ageSystem(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'TRANSITION_AGE':
      return handleTransition(state, action.newCivId);
    case 'END_TURN':
      return checkLegacyMilestones(state);
    default:
      return state;
  }
}

function handleTransition(state: GameState, newCivId: string): GameState {
  const player = state.players.get(state.currentPlayerId);
  if (!player) return state;

  const nextAge = getNextAge(player.age);
  if (!nextAge) return state; // already in modern age

  const threshold = state.age.ageThresholds[nextAge];
  if (player.ageProgress < threshold) return state; // not ready

  // Get legacy bonus from current civ
  const legacyBonus = getCivLegacyBonus(player.civilizationId);

  // Spend legacy points: each point grants +1 to a yield permanently
  let bonuses = legacyBonus
    ? [...player.legacyBonuses, legacyBonus]
    : [...player.legacyBonuses];

  let rng = state.rng;
  const yieldTypes: ReadonlyArray<YieldType> = ['food', 'production', 'gold', 'science', 'culture'];
  for (let i = 0; i < player.legacyPoints; i++) {
    const result = nextRandom(rng);
    rng = result.rng;
    const yieldType = yieldTypes[Math.floor(result.value * yieldTypes.length)];
    bonuses.push({
      source: `legacy-point:${player.age}:${i}`,
      effect: { type: 'MODIFY_YIELD', target: 'empire', yield: yieldType, value: 1 },
    });
  }

  const updatedPlayers = new Map(state.players);
  updatedPlayers.set(player.id, {
    ...player,
    civilizationId: newCivId,
    age: nextAge,
    ageProgress: 0,
    legacyBonuses: bonuses,
    legacyPoints: 0, // spent all legacy points
  });

  return {
    ...state,
    players: updatedPlayers,
    age: { ...state.age, currentAge: nextAge },
    rng,
    log: [...state.log, {
      turn: state.turn,
      playerId: state.currentPlayerId,
      message: `Transitioned to ${nextAge} age as ${newCivId}`,
      type: 'age',
    }],
  };
}

/**
 * Check and award legacy milestones on END_TURN.
 * - Military: 1 milestone per 3 kills (max 3)
 * - Economic: 1 milestone per 100 gold earned (max 3)
 * - Science: 1 milestone per 5 techs researched (max 3)
 * - Culture: 1 milestone per 3 civics researched (max 3)
 */
function checkLegacyMilestones(state: GameState): GameState {
  const player = state.players.get(state.currentPlayerId);
  if (!player) return state;

  const paths = player.legacyPaths;

  const newMilitary = Math.min(3, Math.floor(player.totalKills / 3));
  const newEconomic = Math.min(3, Math.floor(player.totalGoldEarned / 100));
  const newScience = Math.min(3, Math.floor(player.researchedTechs.length / 5));
  const newCulture = Math.min(3, Math.floor(player.researchedCivics.length / 3));

  const militaryGain = newMilitary - paths.military;
  const economicGain = newEconomic - paths.economic;
  const scienceGain = newScience - paths.science;
  const cultureGain = newCulture - paths.culture;

  const totalGain = militaryGain + economicGain + scienceGain + cultureGain;
  if (totalGain <= 0) return state;

  const newPaths: LegacyPaths = {
    military: newMilitary,
    economic: newEconomic,
    science: newScience,
    culture: newCulture,
  };

  const updatedPlayers = new Map(state.players);
  updatedPlayers.set(player.id, {
    ...player,
    legacyPaths: newPaths,
    legacyPoints: player.legacyPoints + totalGain,
  });

  const logEntries = [...state.log];
  if (totalGain > 0) {
    logEntries.push({
      turn: state.turn,
      playerId: player.id,
      message: `Earned ${totalGain} legacy point(s)!`,
      type: 'legacy',
    });
  }

  return {
    ...state,
    players: updatedPlayers,
    log: logEntries,
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
