import type { GameState, GameAction } from '../types/GameState';

/**
 * CivicSystem handles civic research (parallel to tech tree, uses culture).
 * - SET_CIVIC: pick a civic to research
 * - END_TURN: accumulate culture toward current civic, complete when done
 */
export function civicSystem(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'SET_CIVIC':
      return handleSetCivic(state, action.civicId);
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

  // Civ-specific civics are only available to the matching civilization
  if (civicDef.civId !== undefined && civicDef.civId !== player.civilizationId) return state;

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

function processCivicResearch(state: GameState): GameState {
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
