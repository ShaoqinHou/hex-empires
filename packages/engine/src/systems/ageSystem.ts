import type { GameState, GameAction, ActiveEffect, LegacyPaths, GameEvent } from '../types/GameState';
import type { YieldType } from '../types/Yields';
import { nextRandom } from '../state/SeededRng';

/**
 * AgeSystem handles age transitions and legacy milestone tracking.
 * - TRANSITION_AGE: pick a new civilization for the next age, get legacy bonus + legacy point bonuses + golden/dark age effects
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

  // Determine golden/dark age effects based on legacy path milestones
  const goldenDarkResult = getGoldenDarkAgeEffects(player.legacyPaths, player.age, rng, player.researchedTechs);
  bonuses = [...bonuses, ...goldenDarkResult.effects];
  rng = goldenDarkResult.rng;

  const updatedPlayers = new Map(state.players);

  // Apply immediate gold penalty from economic dark age
  let goldAdjustment = 0;
  for (const effect of goldenDarkResult.effects) {
    if (effect.source.includes('dark-age:economic')) {
      // Find the gold penalty marker
      if (effect.effect.type === 'MODIFY_YIELD' && effect.effect.yield === 'gold' && effect.effect.value === -50) {
        goldAdjustment -= 50;
      }
    }
  }

  // Apply tech loss from science dark age
  let researchedTechs = player.researchedTechs;
  if (goldenDarkResult.lostTech) {
    researchedTechs = researchedTechs.filter(t => t !== goldenDarkResult.lostTech);
  }

  updatedPlayers.set(player.id, {
    ...player,
    civilizationId: newCivId,
    age: nextAge,
    ageProgress: 0,
    legacyBonuses: bonuses,
    legacyPoints: 0, // spent all legacy points
    gold: player.gold + goldAdjustment,
    // ── Tech tree reset (§16.1 #9) ──
    researchedTechs,
    currentResearch: null,
    researchProgress: 0,
    masteredTechs: [],
    currentMastery: null,
    masteryProgress: 0,
    // ── Civic tree reset (§16.1 #9) ──
    researchedCivics: [],
    currentCivic: null,
    civicProgress: 0,
    masteredCivics: [],
    currentCivicMastery: null,
    civicMasteryProgress: 0,
    // ── Government reset — require re-selection in new age ──
    governmentId: null,
    slottedPolicies: [],
    // Unlock government selection for the new age (W2-03 CT F-07)
    governmentLockedForAge: false,
    // Clear ideology for new age
    ideology: null,
    // ── Religion — pantheon only clears on Antiquity→Exploration (§18) ──
    pantheonId: (state.age.currentAge === 'antiquity') ? null : player.pantheonId,
  });

  const logEntries: GameEvent[] = [
    {
      turn: state.turn,
      playerId: state.currentPlayerId,
      message: `Transitioned to ${nextAge} age as ${newCivId}`,
      type: 'age',
      category: 'age' as const,
      panelTarget: 'age' as const,
    },
    ...goldenDarkResult.logEntries.map(msg => ({
      turn: state.turn,
      playerId: state.currentPlayerId,
      message: msg,
      type: 'age' as const,
      category: 'age' as const,
      panelTarget: 'age' as const,
    })),
  ];

  return {
    ...state,
    players: updatedPlayers,
    age: { ...state.age, currentAge: nextAge },
    rng,
    log: [...state.log, ...logEntries],
  };
}

interface GoldenDarkResult {
  readonly effects: ReadonlyArray<ActiveEffect>;
  readonly logEntries: ReadonlyArray<string>;
  readonly rng: import('../types/GameState').RngState;
  readonly lostTech: string | null;
}

/**
 * Determine golden/dark age effects based on legacy path milestones.
 * For each path:
 *   milestones === 3 -> Golden Age effect
 *   milestones === 0 -> Dark Age effect
 *   otherwise -> Normal (no special effect)
 */
function getGoldenDarkAgeEffects(
  paths: LegacyPaths,
  age: string,
  rng: import('../types/GameState').RngState,
  researchedTechs: ReadonlyArray<string>,
): GoldenDarkResult {
  const effects: ActiveEffect[] = [];
  const logEntries: string[] = [];
  let currentRng = rng;
  let lostTech: string | null = null;

  // Military path
  if (paths.military === 3) {
    effects.push({
      source: `golden-age:military:${age}`,
      effect: { type: 'MODIFY_COMBAT', target: 'all', value: 5 },
    });
    logEntries.push('Military Golden Age! +5 combat strength for all units permanently.');
  } else if (paths.military === 0) {
    effects.push({
      source: `dark-age:military:${age}`,
      effect: { type: 'MODIFY_COMBAT', target: 'all', value: 3 },
    });
    effects.push({
      source: `dark-age:military:${age}:penalty`,
      effect: { type: 'MODIFY_YIELD', target: 'city', yield: 'food', value: -2 },
    });
    logEntries.push('Military Dark Age! +3 combat but -2 happiness in all cities.');
  }

  // Economic path
  if (paths.economic === 3) {
    effects.push({
      source: `golden-age:economic:${age}`,
      effect: { type: 'MODIFY_YIELD', target: 'city', yield: 'gold', value: 3 },
    });
    logEntries.push('Economic Golden Age! +3 gold in all cities permanently.');
  } else if (paths.economic === 0) {
    effects.push({
      source: `dark-age:economic:${age}`,
      effect: { type: 'MODIFY_YIELD', target: 'city', yield: 'gold', value: -50 },
    });
    effects.push({
      source: `dark-age:economic:${age}:bonus`,
      effect: { type: 'MODIFY_YIELD', target: 'city', yield: 'production', value: 2 },
    });
    logEntries.push('Economic Dark Age! -50 gold immediately but +2 production permanently.');
  }

  // Science path
  if (paths.science === 3) {
    effects.push({
      source: `golden-age:science:${age}`,
      effect: { type: 'MODIFY_YIELD', target: 'city', yield: 'science', value: 3 },
    });
    logEntries.push('Science Golden Age! +3 science in all cities permanently.');
  } else if (paths.science === 0) {
    // Lose 1 random researched tech
    if (researchedTechs.length > 0) {
      const result = nextRandom(currentRng);
      currentRng = result.rng;
      const techIndex = Math.floor(result.value * researchedTechs.length);
      lostTech = researchedTechs[techIndex];
      logEntries.push(`Science Dark Age! Lost technology: ${lostTech}. +5 science permanently.`);
    } else {
      logEntries.push('Science Dark Age! No techs to lose. +5 science permanently.');
    }
    effects.push({
      source: `dark-age:science:${age}`,
      effect: { type: 'MODIFY_YIELD', target: 'city', yield: 'science', value: 5 },
    });
  }

  // Culture path
  if (paths.culture === 3) {
    effects.push({
      source: `golden-age:culture:${age}`,
      effect: { type: 'MODIFY_YIELD', target: 'city', yield: 'culture', value: 3 },
    });
    logEntries.push('Culture Golden Age! +3 culture in all cities permanently.');
  } else if (paths.culture === 0) {
    effects.push({
      source: `dark-age:culture:${age}:penalty`,
      effect: { type: 'MODIFY_YIELD', target: 'city', yield: 'food', value: -2 },
    });
    effects.push({
      source: `dark-age:culture:${age}`,
      effect: { type: 'MODIFY_YIELD', target: 'city', yield: 'culture', value: 4 },
    });
    logEntries.push('Culture Dark Age! -2 happiness but +4 culture permanently.');
  }

  return { effects, logEntries, rng: currentRng, lostTech };
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

  const newPaths: LegacyPaths = {
    military: newMilitary,
    economic: newEconomic,
    science: newScience,
    culture: newCulture,
  };

  // Always increment ageProgress by +1 per turn (natural age advancement)
  const updatedPlayers = new Map(state.players);
  updatedPlayers.set(player.id, {
    ...player,
    legacyPaths: newPaths,
    legacyPoints: player.legacyPoints + totalGain,
    ageProgress: player.ageProgress + 1,
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
