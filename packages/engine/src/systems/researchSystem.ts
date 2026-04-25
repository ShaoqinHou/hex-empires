import type { GameState, GameAction, ActiveEffect, PlayerState, CodexState } from '../types/GameState';

/**
 * ResearchSystem handles technology research and tech mastery.
 * - SET_RESEARCH: pick a tech to research; preserves previous tech progress (F-06)
 * - SET_MASTERY: begin mastering an already-researched tech (costs 80% of original)
 * - END_TURN: accumulate science toward current research/mastery, complete when done
 * - TRANSITION_AGE: clears techProgressMap (new age, new tree)
 * - PLACE_CODEX: assigns a codex to a building codex slot
 */
export function researchSystem(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'SET_RESEARCH':
      return handleSetResearch(state, action.techId);
    case 'SET_MASTERY':
      return handleSetMastery(state, action.techId);
    case 'END_TURN':
      return processResearch(state);
    case 'TRANSITION_AGE':
      return clearTechProgressMap(state);
    case 'PLACE_CODEX':
      return handlePlaceCodex(state, action.codexId, action.buildingId, action.cityId);
    default:
      return state;
  }
}

/** Special tech ID for repeatable future research */
/** Age progress granted per Future Tech completion */
const FUTURE_TECH_AGE_PROGRESS = 10;

/** Mastery costs 80% of the original tech cost */
const MASTERY_COST_MULTIPLIER = 0.8;

/** Science contribution per displayed codex (VII baseline) */
const SCIENCE_PER_CODEX = 2;

/** Buildings that qualify a city to generate a codex on tech research. */
const CODEX_BUILDINGS = ['library', 'museum'] as const;

function handleSetResearch(state: GameState, techId: string): GameState {
  const player = state.players.get(state.currentPlayerId);
  if (!player) return state;

  // Can't research already-known tech (except future techs which are repeatable)
  const techDef = state.config.technologies.get(techId);
  if (!techDef || techDef.age !== player.age) return state;

  if (!techDef.isFutureTech && player.researchedTechs.includes(techId)) return state;

  // F-13: Check prerequisites — all prerequisite techs must be researched
  for (const prereq of techDef.prerequisites) {
    if (!player.researchedTechs.includes(prereq)) return state;
  }

  // Save current research progress, restore saved progress for the new tech
  const prevMap = saveCurrentProgress(player);
  const restoredProgress = prevMap.get(techId) ?? 0;

  const updatedPlayers = new Map(state.players);
  updatedPlayers.set(player.id, {
    ...player,
    currentResearch: techId,
    researchProgress: restoredProgress,
    techProgressMap: prevMap,
  });

  return { ...state, players: updatedPlayers };
}

/**
 * Save the player's current research progress into the techProgressMap.
 * Returns the updated map (immutable copy).
 */
function saveCurrentProgress(player: PlayerState): ReadonlyMap<string, number> {
  const prevTech = player.currentResearch;
  const prevMap = new Map(player.techProgressMap ?? new Map<string, number>());
  if (prevTech && player.researchProgress > 0) {
    prevMap.set(prevTech, player.researchProgress);
  }
  return prevMap;
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

/** On TRANSITION_AGE: clear techProgressMap — new age, new tech tree */
function clearTechProgressMap(state: GameState): GameState {
  const player = state.players.get(state.currentPlayerId);
  if (!player) return state;
  if (!player.techProgressMap || player.techProgressMap.size === 0) return state;

  const updatedPlayers = new Map(state.players);
  updatedPlayers.set(player.id, {
    ...player,
    techProgressMap: new Map<string, number>(),
  });
  return { ...state, players: updatedPlayers };
}

/**
 * Place a codex into a building's codex slot.
 * Validates: player owns codex, city has building, building has available slots.
 */
function handlePlaceCodex(
  state: GameState,
  codexId: string,
  buildingId: string,
  cityId: string,
): GameState {
  const player = state.players.get(state.currentPlayerId);
  if (!player) return state;

  // Player must own the codex
  const ownedCodices = player.ownedCodices ?? [];
  if (!ownedCodices.includes(codexId)) return state;

  // Codex must not already be placed
  const existingPlacements = player.codexPlacements ?? [];
  if (existingPlacements.some(p => p.codexId === codexId)) return state;

  // City must exist and be owned by the player
  const city = state.cities.get(cityId);
  if (!city || city.owner !== player.id) return state;

  // City must have the building
  if (!city.buildings.includes(buildingId)) return state;

  // Building must have codex slots
  const buildingDef = state.config.buildings.get(buildingId);
  if (!buildingDef || !buildingDef.codexSlots || buildingDef.codexSlots <= 0) return state;

  // Count how many codices are already placed in this specific building+city
  const currentlyPlacedInBuilding = existingPlacements.filter(
    p => p.buildingId === buildingId && p.cityId === cityId,
  ).length;
  if (currentlyPlacedInBuilding >= buildingDef.codexSlots) return state;

  const updatedPlayers = new Map(state.players);
  updatedPlayers.set(player.id, {
    ...player,
    codexPlacements: [...existingPlacements, { codexId, buildingId, cityId }],
  });

  return { ...state, players: updatedPlayers };
}

/**
 * AA5.1: Generate a CodexState entry when a tech is researched and the player
 * has a city with a 'library' or 'museum' building. Returns the updated
 * GameState with the new codex added to state.codices.
 *
 * If no qualifying city exists, returns state unchanged.
 */
function generateCodexForTech(
  state: GameState,
  playerId: string,
  techId: string,
): GameState {
  // Find the first city owned by this player that has a library or museum
  let qualifyingCityId: string | null = null;
  let qualifyingBuildingId: string | null = null;

  for (const city of state.cities.values()) {
    if (city.owner !== playerId) continue;
    for (const buildingId of CODEX_BUILDINGS) {
      if (city.buildings.includes(buildingId)) {
        qualifyingCityId = city.id;
        qualifyingBuildingId = buildingId;
        break;
      }
    }
    if (qualifyingCityId) break;
  }

  if (!qualifyingCityId || !qualifyingBuildingId) return state;

  const codexId = `codex-${techId}-${playerId}-${state.turn}`;
  const newCodex: CodexState = {
    id: codexId,
    playerId,
    cityId: qualifyingCityId,
    buildingId: qualifyingBuildingId,
    addedTurn: state.turn,
  };

  const nextCodices = new Map(state.codices ?? new Map<string, CodexState>());
  nextCodices.set(codexId, newCodex);

  return { ...state, codices: nextCodices };
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
  const techDef = state.config.technologies.get(player.currentResearch);

  if (newProgress >= techCost) {
    const updatedPlayers = new Map(state.players);

    // F-13: Future tech is repeatable — grant age progress, don't add to researchedTechs
    if (techDef?.isFutureTech) {
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
    // Also remove the saved progress entry for this tech (it's done).
    const overflow = newProgress - techCost;
    const prevMap = new Map(player.techProgressMap ?? new Map<string, number>());
    prevMap.delete(player.currentResearch);

    const completedTechId = player.currentResearch;
    updatedPlayers.set(player.id, {
      ...player,
      researchedTechs: [...player.researchedTechs, completedTechId],
      currentResearch: null,
      researchProgress: overflow, // overflow carries to next tech
      techProgressMap: prevMap,
    });

    const stateAfterResearch = {
      ...state,
      players: updatedPlayers,
      log: [...state.log, {
        turn: state.turn,
        playerId: player.id,
        message: `Researched ${completedTechId}!`,
        type: 'research',
        severity: 'warning' as const,
        category: 'research' as const,
        panelTarget: 'tech' as const,
      }],
    };

    // AA5.1: Generate codex if the player has a library or museum
    return generateCodexForTech(stateAfterResearch, player.id, completedTechId);
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
    // Mastery complete — use per-tech masteryEffect if defined, otherwise fall back to +1 science
    const masteryEffect = techDef?.masteryEffect ?? {
      type: 'MODIFY_YIELD' as const,
      target: 'empire' as const,
      yield: 'science' as const,
      value: 1,
    };

    const masteryBonus: ActiveEffect = {
      source: `mastery:${player.currentMastery}`,
      effect: masteryEffect,
    };

    // Award codices if the tech specifies a count
    const codexCount = techDef?.masteryCodexCount ?? 0;
    const newCodexIds: string[] = [];
    for (let i = 0; i < codexCount; i++) {
      newCodexIds.push(`codex-${player.currentMastery}-${i}-${state.turn}`);
    }

    const updatedPlayers = new Map(state.players);
    updatedPlayers.set(player.id, {
      ...player,
      masteredTechs: [...player.masteredTechs, player.currentMastery],
      currentMastery: null,
      masteryProgress: 0,
      legacyBonuses: [...player.legacyBonuses, masteryBonus],
      ownedCodices: [...(player.ownedCodices ?? []), ...newCodexIds],
    });

    const techName = techDef?.name ?? player.currentMastery;
    const codexMsg = codexCount > 0 ? ` (+${codexCount} codex${codexCount > 1 ? 'es' : ''})` : '';

    return {
      ...state,
      players: updatedPlayers,
      log: [...state.log, {
        turn: state.turn,
        playerId: player.id,
        message: `Mastered ${techName}!${codexMsg}`,
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

/** Calculate science per turn for a player from their cities (includes codex placements + policy bonuses) */
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
  // Add codex contributions (+2 science per placed codex in a slot)
  if (player) {
    const placements = player.codexPlacements ?? [];
    for (const placement of placements) {
      const city = state.cities.get(placement.cityId);
      if (!city || city.owner !== playerId) continue;
      if (!city.buildings.includes(placement.buildingId)) continue;
      const buildingDef = state.config.buildings.get(placement.buildingId);
      if (buildingDef?.codexSlots && buildingDef.codexSlots > 0) {
        sciencePerTurn += SCIENCE_PER_CODEX;
      }
    }

    // F-05: Policy multipliers — slotted policies with MODIFY_YIELD science contribute
    const slotted = player.slottedPolicies;
    if (slotted) {
      for (const policyId of slotted) {
        if (policyId === null) continue;
        const policyDef = state.config.policies?.get(policyId);
        if (!policyDef) continue;
        const bonus = policyDef.bonus;
        if (
          bonus.type === 'MODIFY_YIELD' &&
          bonus.yield === 'science' &&
          (bonus.target === 'empire' || bonus.target === 'city')
        ) {
          // 'city'-targeted policies apply per city the player owns
          const cityCount = bonus.target === 'city'
            ? [...state.cities.values()].filter(c => c.owner === playerId).length
            : 1;
          sciencePerTurn += bonus.value * Math.max(1, cityCount);
        }
      }
    }
  }
  return sciencePerTurn;
}

/** Tech cost from state.config.technologies — driven by data */
function getTechCost(state: GameState, techId: string): number {
  return state.config.technologies.get(techId)?.cost ?? 100;
}

/** Mastery cost is 80% of the original tech cost, rounded up */
function getMasteryCost(state: GameState, techId: string): number {
  const originalCost = getTechCost(state, techId);
  return Math.ceil(originalCost * MASTERY_COST_MULTIPLIER);
}
