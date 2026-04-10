import type { GameState, GameAction, ActiveEffect } from '../types/GameState';

/**
 * CivicSystem handles civic research (parallel to tech tree, uses culture).
 * - SET_CIVIC: pick a civic to research
 * - SET_CIVIC_MASTERY: begin mastering an already-researched civic (costs 80% of original, grants +1 culture/turn)
 * - END_TURN: accumulate culture toward current civic/mastery, complete when done
 */
export function civicSystem(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'SET_CIVIC':
      return handleSetCivic(state, action.civicId);
    case 'SET_CIVIC_MASTERY':
      return handleSetCivicMastery(state, action.civicId);
    case 'END_TURN':
      return processCivicResearch(state);
    default:
      return state;
  }
}

function handleSetCivic(state: GameState, civicId: string): GameState {
  const player = state.players.get(state.currentPlayerId);
  if (!player) return state;

  // Can't research already-known civic
  if (player.researchedCivics.includes(civicId)) return state;

  // Civic must exist in config
  const civicDef = state.config.civics.get(civicId);
  if (!civicDef) return state;

  // Civic must belong to the player's current age
  if (civicDef.age !== player.age) return state;

  // All prerequisites must be researched
  const allPrereqsMet = civicDef.prerequisites.every(
    prereq => player.researchedCivics.includes(prereq)
  );
  if (!allPrereqsMet) return state;

  const updatedPlayers = new Map(state.players);
  updatedPlayers.set(player.id, {
    ...player,
    currentCivic: civicId,
    civicProgress: 0,
  });

  return { ...state, players: updatedPlayers };
}

/**
 * Begin mastering an already-researched civic.
 * Requirements:
 *   - Civic must be in researchedCivics
 *   - Civic must NOT already be in masteredCivics
 *   - No active civic mastery in progress
 */
function handleSetCivicMastery(state: GameState, civicId: string): GameState {
  const player = state.players.get(state.currentPlayerId);
  if (!player) return state;

  if (!player.researchedCivics.includes(civicId)) return state;
  if (player.masteredCivics.includes(civicId)) return state;
  if (player.currentCivicMastery !== null) return state;

  const civicDef = state.config.civics.get(civicId);
  if (!civicDef) return state;

  const updatedPlayers = new Map(state.players);
  updatedPlayers.set(player.id, {
    ...player,
    currentCivicMastery: civicId,
    civicMasteryProgress: 0,
  });

  return { ...state, players: updatedPlayers };
}

/** Civic mastery costs 80% of the original civic cost, rounded up */
const CIVIC_MASTERY_COST_MULTIPLIER = 0.8;

function processCivicResearch(state: GameState): GameState {
  let next = state;
  next = processNormalCivicResearch(next);
  next = processCivicMasteryResearch(next);
  return next;
}

function processNormalCivicResearch(state: GameState): GameState {
  const player = state.players.get(state.currentPlayerId);
  if (!player || !player.currentCivic) return state;

  // Calculate culture per turn from cities/buildings
  let culturePerTurn = 0;
  for (const city of state.cities.values()) {
    if (city.owner !== player.id) continue;
    culturePerTurn += 1; // base 1 culture per city
    for (const buildingId of city.buildings) {
      const buildingDef = state.config.buildings.get(buildingId);
      if (buildingDef?.yields.culture) {
        culturePerTurn += buildingDef.yields.culture;
      }
    }
  }

  // Minimum 1 culture per turn if the player has any cities
  if (culturePerTurn === 0) {
    const hasCities = [...state.cities.values()].some(c => c.owner === player.id);
    if (hasCities) culturePerTurn = 1;
  }

  if (culturePerTurn <= 0) return state;

  const newProgress = player.civicProgress + culturePerTurn;

  // Check if civic is complete
  const civicCost = state.config.civics.get(player.currentCivic)?.cost ?? 100;

  if (newProgress >= civicCost) {
    // Civic complete!
    const updatedPlayers = new Map(state.players);
    updatedPlayers.set(player.id, {
      ...player,
      researchedCivics: [...player.researchedCivics, player.currentCivic],
      currentCivic: null,
      civicProgress: 0,
      ageProgress: player.ageProgress + 5, // +5 age progress per civic
    });

    return {
      ...state,
      players: updatedPlayers,
      log: [...state.log, {
        turn: state.turn,
        playerId: player.id,
        message: `Completed civic: ${player.currentCivic}!`,
        type: 'civic',
      }],
    };
  }

  // Accumulate progress
  const updatedPlayers = new Map(state.players);
  updatedPlayers.set(player.id, {
    ...player,
    civicProgress: newProgress,
  });

  return { ...state, players: updatedPlayers };
}

function processCivicMasteryResearch(state: GameState): GameState {
  const player = state.players.get(state.currentPlayerId);
  if (!player || !player.currentCivicMastery) return state;

  let culturePerTurn = 0;
  for (const city of state.cities.values()) {
    if (city.owner !== player.id) continue;
    culturePerTurn += 1;
    for (const buildingId of city.buildings) {
      const buildingDef = state.config.buildings.get(buildingId);
      if (buildingDef?.yields.culture) {
        culturePerTurn += buildingDef.yields.culture;
      }
    }
  }

  if (culturePerTurn === 0) {
    const hasCities = [...state.cities.values()].some(c => c.owner === player.id);
    if (hasCities) culturePerTurn = 1;
  }

  if (culturePerTurn <= 0) return state;

  const civicDef = state.config.civics.get(player.currentCivicMastery);
  const civicBaseCost = civicDef?.cost ?? 100;
  const masteryCost = Math.ceil(civicBaseCost * CIVIC_MASTERY_COST_MULTIPLIER);

  const newProgress = player.civicMasteryProgress + culturePerTurn;

  if (newProgress >= masteryCost) {
    // Civic mastery complete — grant +1 culture empire-wide yield bonus
    const masteryBonus: ActiveEffect = {
      source: `civic_mastery:${player.currentCivicMastery}`,
      effect: {
        type: 'MODIFY_YIELD',
        target: 'empire',
        yield: 'culture',
        value: 1,
      },
    };

    const updatedPlayers = new Map(state.players);
    updatedPlayers.set(player.id, {
      ...player,
      masteredCivics: [...player.masteredCivics, player.currentCivicMastery],
      currentCivicMastery: null,
      civicMasteryProgress: 0,
      legacyBonuses: [...player.legacyBonuses, masteryBonus],
    });

    return {
      ...state,
      players: updatedPlayers,
      log: [...state.log, {
        turn: state.turn,
        playerId: player.id,
        message: `Mastered civic: ${civicDef?.name ?? player.currentCivicMastery}! (+1 Culture per turn)`,
        type: 'civic',
      }],
    };
  }

  const updatedPlayers = new Map(state.players);
  updatedPlayers.set(player.id, {
    ...player,
    civicMasteryProgress: newProgress,
  });

  return { ...state, players: updatedPlayers };
}
