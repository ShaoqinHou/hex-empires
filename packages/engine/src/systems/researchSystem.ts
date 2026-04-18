import type { GameState, GameAction, ActiveEffect } from '../types/GameState';

/**
 * ResearchSystem handles technology research and tech mastery.
 * - SET_RESEARCH: pick a tech to research
 * - SET_MASTERY: begin mastering an already-researched tech (costs 80% of original, grants yield bonus)
 * - END_TURN: accumulate science toward current research/mastery, complete when done
 */
export function researchSystem(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'SET_RESEARCH':
      return handleSetResearch(state, action.techId);
    case 'SET_MASTERY':
      return handleSetMastery(state, action.techId);
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

/** Mastery costs 80% of the original tech cost */
const MASTERY_COST_MULTIPLIER = 0.8;

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

/**
 * Begin mastering an already-researched tech.
 * Requirements:
 *   - Tech must be in researchedTechs
 *   - Tech must NOT already be in masteredTechs
 *   - No active mastery in progress
 */
function handleSetMastery(state: GameState, techId: string): GameState {
  const player = state.players.get(state.currentPlayerId);
  if (!player) return state;

  // Must have researched the tech first
  if (!player.researchedTechs.includes(techId)) return state;

  // Can't master the same tech twice
  if (player.masteredTechs.includes(techId)) return state;

  // Can't start mastery while another mastery is in progress
  if (player.currentMastery !== null) return state;

  // Tech must be registered
  const techDef = state.config.technologies.get(techId);
  if (!techDef) return state;

  const updatedPlayers = new Map(state.players);
  updatedPlayers.set(player.id, {
    ...player,
    currentMastery: techId,
    masteryProgress: 0,
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
  let next = state;

  // Process normal research
  next = processNormalResearch(next);

  // Process mastery research
  next = processMasteryResearch(next);

  return next;
}

function processNormalResearch(state: GameState): GameState {
  const player = state.players.get(state.currentPlayerId);
  if (!player || !player.currentResearch) return state;

  const sciencePerTurn = calculateSciencePerTurn(state, player.id);
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
          severity: 'warning' as const,
          category: 'research' as const,
          panelTarget: 'tech' as const,
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
        severity: 'warning' as const,
        category: 'research' as const,
        panelTarget: 'tech' as const,
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

function processMasteryResearch(state: GameState): GameState {
  const player = state.players.get(state.currentPlayerId);
  if (!player || !player.currentMastery) return state;

  const sciencePerTurn = calculateSciencePerTurn(state, player.id);
  const newProgress = player.masteryProgress + Math.max(1, sciencePerTurn);

  const techDef = state.config.technologies.get(player.currentMastery);
  const masteryCost = getMasteryCost(state, player.currentMastery);

  if (newProgress >= masteryCost) {
    // Mastery complete — grant a +1 science empire-wide yield bonus
    const masteryBonus: ActiveEffect = {
      source: `mastery:${player.currentMastery}`,
      effect: {
        type: 'MODIFY_YIELD',
        target: 'empire',
        yield: 'science',
        value: 1,
      },
    };

    const updatedPlayers = new Map(state.players);
    updatedPlayers.set(player.id, {
      ...player,
      masteredTechs: [...player.masteredTechs, player.currentMastery],
      currentMastery: null,
      masteryProgress: 0,
      legacyBonuses: [...player.legacyBonuses, masteryBonus],
    });

    return {
      ...state,
      players: updatedPlayers,
      log: [...state.log, {
        turn: state.turn,
        playerId: player.id,
        message: `Mastered ${techDef?.name ?? player.currentMastery}! (+1 Science per turn)`,
        type: 'research',
        severity: 'warning' as const,
        category: 'research' as const,
        panelTarget: 'tech' as const,
      }],
    };
  }

  // Accumulate mastery progress
  const updatedPlayers = new Map(state.players);
  updatedPlayers.set(player.id, {
    ...player,
    masteryProgress: newProgress,
  });

  return { ...state, players: updatedPlayers };
}

/** Calculate science per turn for a player from their cities */
function calculateSciencePerTurn(state: GameState, playerId: string): number {
  const player = state.players.get(playerId);
  let sciencePerTurn = player && player.science > 0 ? 0 : 1; // minimum 1 science per turn
  for (const city of state.cities.values()) {
    if (city.owner !== playerId) continue;
    sciencePerTurn += city.population; // 1 science per pop base
    // Add science from buildings (data-driven)
    for (const buildingId of city.buildings) {
      const buildingDef = state.config.buildings.get(buildingId);
      if (buildingDef?.yields.science) {
        sciencePerTurn += buildingDef.yields.science;
      }
    }
  }
  return sciencePerTurn;
}

/** Tech cost from state.config.technologies — driven by data */
function getTechCost(state: GameState, techId: string): number {
  if (techId === FUTURE_TECH_ID) return FUTURE_TECH_COST;
  return state.config.technologies.get(techId)?.cost ?? 100;
}

/** Mastery cost is 80% of the original tech cost, rounded up */
function getMasteryCost(state: GameState, techId: string): number {
  const originalCost = getTechCost(state, techId);
  return Math.ceil(originalCost * MASTERY_COST_MULTIPLIER);
}
