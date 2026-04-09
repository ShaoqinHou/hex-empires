import type { GameState, GameAction } from '../types/GameState';

/**
 * ResearchSystem handles technology research.
 * - SET_RESEARCH: pick a tech to research
 * - END_TURN: accumulate science toward current research, complete when done
 */
export function researchSystem(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'SET_RESEARCH':
      return handleSetResearch(state, action.techId);
    case 'END_TURN':
      return processResearch(state);
    default:
      return state;
  }
}

function handleSetResearch(state: GameState, techId: string): GameState {
  const player = state.players.get(state.currentPlayerId);
  if (!player) return state;

  // Can't research already-known tech
  if (player.researchedTechs.includes(techId)) return state;

  const updatedPlayers = new Map(state.players);
  updatedPlayers.set(player.id, {
    ...player,
    currentResearch: techId,
    researchProgress: 0,
  });

  return { ...state, players: updatedPlayers };
}

function processResearch(state: GameState): GameState {
  const player = state.players.get(state.currentPlayerId);
  if (!player || !player.currentResearch) return state;

  // Calculate total science per turn from all cities
  let sciencePerTurn = player.science > 0 ? 0 : 1; // minimum 1 science per turn
  // The resourceSystem already accumulated science in player.science
  // But we need the per-turn science for research progress
  // We'll use the previously calculated science accumulation
  // For now, calculate from city count + pop
  for (const city of state.cities.values()) {
    if (city.owner !== player.id) continue;
    sciencePerTurn += city.population; // 1 science per pop base
    if (city.buildings.includes('library')) sciencePerTurn += 2;
  }

  const newProgress = player.researchProgress + Math.max(1, sciencePerTurn);

  // Check if research is complete (look up tech cost)
  const techCost = getTechCost(state, player.currentResearch);

  if (newProgress >= techCost) {
    // Tech complete!
    const updatedPlayers = new Map(state.players);
    updatedPlayers.set(player.id, {
      ...player,
      researchedTechs: [...player.researchedTechs, player.currentResearch],
      currentResearch: null,
      researchProgress: 0,
      ageProgress: player.ageProgress + 5, // +5 age progress per tech
    });

    return {
      ...state,
      players: updatedPlayers,
      log: [...state.log, {
        turn: state.turn,
        playerId: player.id,
        message: `Researched ${player.currentResearch}!`,
        type: 'research',
      }],
    };
  }

  // Accumulate progress
  const updatedPlayers = new Map(state.players);
  updatedPlayers.set(player.id, {
    ...player,
    researchProgress: newProgress,
  });

  return { ...state, players: updatedPlayers };
}

/** Tech cost from state.config.technologies — driven by data */
function getTechCost(state: GameState, techId: string): number {
  return state.config.technologies.get(techId)?.cost ?? 100;
}
