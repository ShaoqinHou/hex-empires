import type { GameState, GameAction, CrisisState, CityState } from '../types/GameState';
import type { CrisisEventDef } from '../data/crises/types';
import { ALL_CRISES } from '../data/crises/all-crises';

/**
 * CrisisSystem handles narrative/crisis events.
 *
 * On END_TURN: checks if any crisis trigger conditions are met for crises
 * not yet triggered; if so, activates them.
 *
 * On RESOLVE_CRISIS: applies the chosen effects and marks the crisis as resolved.
 */
export function crisisSystem(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'END_TURN':
      return checkCrisisTriggers(state);
    case 'RESOLVE_CRISIS':
      return resolveCrisis(state, action.crisisId, action.choice);
    default:
      return state;
  }
}

/** Check all crisis definitions for unresolved triggers */
function checkCrisisTriggers(state: GameState): GameState {
  const triggeredIds = new Set(state.crises.map(c => c.id));
  const newCrises: CrisisState[] = [];

  for (const def of ALL_CRISES) {
    if (triggeredIds.has(def.id)) continue;
    if (isTriggerMet(state, def)) {
      newCrises.push(crisisFromDef(def, state.turn));
    }
  }

  if (newCrises.length === 0) return state;

  const logEntries = newCrises.map(c => ({
    turn: state.turn,
    playerId: state.currentPlayerId,
    message: `Crisis event: ${c.name}`,
    type: 'crisis' as const,
  }));

  return {
    ...state,
    crises: [...state.crises, ...newCrises],
    log: [...state.log, ...logEntries],
  };
}

/** Check whether a crisis definition's trigger condition is met */
function isTriggerMet(state: GameState, def: CrisisEventDef): boolean {
  switch (def.triggerCondition) {
    case 'turn_reached':
      return typeof def.triggerValue === 'number' && state.turn >= def.triggerValue;

    case 'tech_researched': {
      // triggerValue is the number of techs required (as number) or a specific tech id (as string)
      const player = state.players.get(state.currentPlayerId);
      if (!player) return false;
      if (typeof def.triggerValue === 'number') {
        return player.researchedTechs.length >= def.triggerValue;
      }
      return player.researchedTechs.includes(def.triggerValue);
    }

    case 'war_declared': {
      // Check if any relation involving current player is at war
      for (const [key, rel] of state.diplomacy.relations) {
        if (key.includes(state.currentPlayerId) && rel.status === 'war') {
          return true;
        }
      }
      return false;
    }

    case 'city_founded': {
      // triggerValue is the number of cities required
      const playerCities = [...state.cities.values()].filter(
        c => c.owner === state.currentPlayerId,
      ).length;
      return typeof def.triggerValue === 'number' && playerCities >= def.triggerValue;
    }

    default:
      return false;
  }
}

/** Convert a CrisisEventDef to a CrisisState */
function crisisFromDef(def: CrisisEventDef, turn: number): CrisisState {
  return {
    id: def.id,
    name: def.name,
    active: true,
    turn,
    choices: def.choices.map(c => ({
      id: c.id,
      text: c.text,
      effects: c.effects.map(e => {
        // Map crisis effect types to EffectDef compatible types
        // For effects that don't map to EffectDef directly, we use MODIFY_YIELD as a carrier
        if (e.type === 'MODIFY_YIELD' && e.yield) {
          return {
            type: 'MODIFY_YIELD' as const,
            target: e.target as 'city' | 'empire' | 'unit' | 'tile',
            yield: e.yield as 'food' | 'production' | 'gold' | 'science' | 'culture' | 'faith',
            value: e.value,
          };
        }
        // For MODIFY_GOLD, LOSE_POPULATION, SPAWN_ENEMIES — use MODIFY_YIELD as a proxy
        // The actual effect handling is done in resolveCrisis
        return {
          type: 'MODIFY_YIELD' as const,
          target: 'empire' as const,
          yield: 'gold' as const,
          value: 0,
        };
      }),
    })),
    resolvedBy: null,
    choiceMade: null,
  };
}

/** Apply the chosen crisis effects and mark as resolved */
function resolveCrisis(state: GameState, crisisId: string, choiceId: string): GameState {
  const crisisIndex = state.crises.findIndex(c => c.id === crisisId && c.active);
  if (crisisIndex === -1) return state;

  const crisis = state.crises[crisisIndex];

  // Find the original def for full effect info
  const def = ALL_CRISES.find(d => d.id === crisisId);
  if (!def) return state;

  const choiceDef = def.choices.find(c => c.id === choiceId);
  if (!choiceDef) return state;

  // Apply effects
  let nextState = state;
  for (const effect of choiceDef.effects) {
    nextState = applyCrisisEffect(nextState, effect);
  }

  // Mark crisis as resolved
  const updatedCrises = [...nextState.crises];
  updatedCrises[crisisIndex] = {
    ...crisis,
    active: false,
    resolvedBy: nextState.currentPlayerId,
    choiceMade: choiceId,
  };

  return {
    ...nextState,
    crises: updatedCrises,
    log: [...nextState.log, {
      turn: nextState.turn,
      playerId: nextState.currentPlayerId,
      message: `Crisis "${crisis.name}" resolved: chose "${choiceDef.text}"`,
      type: 'crisis' as const,
    }],
  };
}

/** Apply a single crisis effect to the game state */
function applyCrisisEffect(
  state: GameState,
  effect: { readonly type: string; readonly target: string; readonly yield?: string; readonly value: number },
): GameState {
  const player = state.players.get(state.currentPlayerId);
  if (!player) return state;

  switch (effect.type) {
    case 'MODIFY_GOLD': {
      const updatedPlayers = new Map(state.players);
      updatedPlayers.set(state.currentPlayerId, {
        ...player,
        gold: Math.max(0, player.gold + effect.value),
      });
      return { ...state, players: updatedPlayers };
    }

    case 'MODIFY_YIELD': {
      if (!effect.yield) return state;
      const updatedPlayers = new Map(state.players);
      const yieldKey = effect.yield as 'gold' | 'science' | 'culture' | 'faith';
      if (yieldKey in player) {
        updatedPlayers.set(state.currentPlayerId, {
          ...player,
          [yieldKey]: Math.max(0, (player[yieldKey] as number) + effect.value),
        });
        return { ...state, players: updatedPlayers };
      }
      // For food/production — logged but not directly on player
      return state;
    }

    case 'LOSE_POPULATION': {
      const playerCities = [...state.cities.entries()]
        .filter(([, c]) => c.owner === state.currentPlayerId);

      if (playerCities.length === 0) return state;

      let targetCity: [string, CityState];
      if (effect.target === 'largest_city') {
        targetCity = playerCities.reduce((a, b) => a[1].population > b[1].population ? a : b);
      } else {
        // random_city — use first city (deterministic without RNG for simplicity)
        targetCity = playerCities[0];
      }

      const [cityId, city] = targetCity;
      if (city.population <= 1) return state; // don't kill the city

      const updatedCities = new Map(state.cities);
      updatedCities.set(cityId, {
        ...city,
        population: city.population - effect.value,
      });
      return { ...state, cities: updatedCities };
    }

    case 'SPAWN_ENEMIES': {
      // Log the spawn — actual unit spawning would need more infrastructure
      return {
        ...state,
        log: [...state.log, {
          turn: state.turn,
          playerId: state.currentPlayerId,
          message: `${effect.value} enemy warriors appear near your borders!`,
          type: 'crisis' as const,
        }],
      };
    }

    default:
      return state;
  }
}
