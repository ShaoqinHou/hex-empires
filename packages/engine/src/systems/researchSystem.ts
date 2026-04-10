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

/** Special tech ID for repeatable future research */
const FUTURE_TECH_ID = 'future_tech';
const FUTURE_TECH_COST = 100;
const FUTURE_TECH_AGE_PROGRESS = 10;

function handleSetResearch(state: GameState, techId: string): GameState {
  const player = state.players.get(state.currentPlayerId);
  if (!player) return state;

  // Allow future_tech when all techs for the current age are researched
  if (techId === FUTURE_TECH_ID) {
    if (!allAgeTechsResearched(state, player)) return state;
    const updatedPlayers = new Map(state.players);
    updatedPlayers.set(player.id, {
      ...player,
      currentResearch: FUTURE_TECH_ID,
      researchProgress: 0,
    });
    return { ...state, players: updatedPlayers };
  }

  // Can't research already-known tech
  if (player.researchedTechs.includes(techId)) return state;

  // Tech must belong to the player's current age
  const techDef = state.config.technologies.get(techId);
  if (!techDef || techDef.age !== player.age) return state;

  const updatedPlayers = new Map(state.players);
  updatedPlayers.set(player.id, {
    ...player,
    currentResearch: techId,
    researchProgress: 0,
  });

  return { ...state, players: updatedPlayers };
}

/** Check if a player has researched all technologies available in their current age */
function allAgeTechsResearched(state: GameState, player: { readonly age: string; readonly researchedTechs: ReadonlyArray<string> }): boolean {
  for (const [techId, techDef] of state.config.technologies) {
    if (techDef.age === player.age && !player.researchedTechs.includes(techId)) {
      return false;
    }
  }
  return true;
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
    // Add science from buildings (data-driven)
    for (const buildingId of city.buildings) {
      const buildingDef = state.config.buildings.get(buildingId);
      if (buildingDef?.yields.science) {
        sciencePerTurn += buildingDef.yields.science;
      }
    }
  }

  const newProgress = player.researchProgress + Math.max(1, sciencePerTurn);

  // Check if research is complete (look up tech cost)
  const techCost = getTechCost(state, player.currentResearch);

  if (newProgress >= techCost) {
    const updatedPlayers = new Map(state.players);

    if (player.currentResearch === FUTURE_TECH_ID) {
      // Future tech: repeatable — grant age progress but don't add to researchedTechs
      updatedPlayers.set(player.id, {
        ...player,
        currentResearch: null,
        researchProgress: 0,
        ageProgress: player.ageProgress + FUTURE_TECH_AGE_PROGRESS,
      });

      return {
        ...state,
        players: updatedPlayers,
        log: [...state.log, {
          turn: state.turn,
          playerId: player.id,
          message: `Completed Future Tech! (+${FUTURE_TECH_AGE_PROGRESS} age progress)`,
          type: 'research',
        }],
      };
    }

    // Normal tech complete! Carry overflow science to the next research.
    const overflow = newProgress - techCost;
    updatedPlayers.set(player.id, {
      ...player,
      researchedTechs: [...player.researchedTechs, player.currentResearch],
      currentResearch: null,
      researchProgress: overflow, // overflow carries to next tech
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
  if (techId === FUTURE_TECH_ID) return FUTURE_TECH_COST;
  return state.config.technologies.get(techId)?.cost ?? 100;
}
