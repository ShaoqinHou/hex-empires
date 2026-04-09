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
  const techCost = getTechCost(player.currentResearch);

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

function getTechCost(techId: string): number {
  // We don't import data here to avoid cross-boundary issues
  // Instead, we use a lookup table matching the tech data
  const costs: Record<string, number> = {
    // Antiquity
    pottery: 25, animal_husbandry: 25, mining: 25, sailing: 50, astrology: 50,
    archery: 50, writing: 50, masonry: 80, bronze_working: 80, wheel: 80,
    irrigation: 50, currency: 120, construction: 120, iron_working: 150, mathematics: 150,
    // Exploration
    cartography: 200, gunpowder: 250, printing: 200, banking: 250, astronomy: 300,
    metallurgy: 300, education: 300, military_tactics: 350, economics: 400, siege_tactics: 400,
    // Modern
    industrialization: 500, scientific_theory: 500, rifling: 500,
    steam_power: 600, electricity: 700, replaceable_parts: 700,
    flight: 800, nuclear_fission: 1000, combined_arms: 900, rocketry: 1200,
  };
  return costs[techId] ?? 100;
}
