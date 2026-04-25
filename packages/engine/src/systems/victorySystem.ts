import type { GameState, GameAction, VictoryProgress, VictoryType, VictoryLegacyProgressEntry } from '../types/GameState';
import type { PlayerId } from '../types/Ids';
import { scoreLegacyPaths } from '../state/LegacyPaths';

/**
 * F-08: Number of relics required for the relic-based cultural victory threshold.
 * Relics contribute to cultural victory alongside artifacts and World's Fair.
 */
export const CULTURAL_VICTORY_RELIC_COUNT = 8;

/**
 * X5.1: Number of great-works artifacts required for the VII-correct Cultural victory.
 * Brief F-01: player needs World's Fair wonder AND >= ARTIFACTS_FOR_CULTURAL_VICTORY artifacts.
 */
export const ARTIFACTS_FOR_CULTURAL_VICTORY = 10;

/**
 * X5.1: Modern ideology civics -- any one of these counts as "has ideology" for
 * the Military (Operation Ivy) victory prerequisite.
 */
export const IDEOLOGY_CIVICS: ReadonlyArray<string> = ['fascism', 'communism', 'democracy'];

/**
 * VictorySystem checks win conditions at the end of each turn.
 *
 * Victory types (X5.1 VII-parity rewrite):
 * - Domination: eliminate all rival players (they lose all cities -- units alone do not keep a player alive)
 * - Science: complete 3 Space Race projects (spaceMilestonesComplete >= 3) [W5-01]
 *   Scaffold fallback: all 10 modern techs researched (if no project data available)
 * - Culture: World's Fair wonder built + >= ARTIFACTS_FOR_CULTURAL_VICTORY (10) artifacts collected [X5.1]
 *   Scaffold fallback: culture >= 300 + at least 5 civics (if no artifact gameplay)
 * - Economic: World Bank wonder built + trade routes to >= 3 distinct rival civs [X5.1]
 *   Scaffold fallback: worldBankOfficesRemaining countdown (W5-01) then gold thresholds
 * - Military: Operation Ivy completed (completedProjects.includes('operation_ivy'))
 *             AND ideology civic researched (fascism | communism | democracy) [X5.1]
 *   Progress: 0% no ideology, 33% ideology civic, 66% manhattan_project, 100% operation_ivy
 * - Score: highest score when Modern age progress reaches 100% (F-06) using legacy-based scoring
 *
 * Note: diplomacy victory type was removed (no GDD basis -- W1-C / W2-08).
 */
export function victorySystem(state: GameState, action: GameAction): GameState {
  if (action.type !== 'END_TURN') return state;

  // Only check victory at end of the last player's turn
  const playerIds = [...state.players.keys()];
  const isLastPlayer = state.currentPlayerId === playerIds[playerIds.length - 1];
  if (!isLastPlayer) return state;

  // Already have a winner
  if (state.victory.winner) return state;

  const progress = new Map<string, ReadonlyArray<VictoryProgress>>();

  // M18: Recompute LegacyPath progress for every player. The scoring is
  // pure and independent of victory detection -- we always compute it on
  // a victory-check tick, even if a player wins this turn, so UI panels
  // always see a fresh snapshot. This is pure enrichment; the existing
  // seven-path victory detection below is unchanged.
  const legacyProgress = new Map<PlayerId, ReadonlyArray<VictoryLegacyProgressEntry>>();
  for (const pid of state.players.keys()) {
    legacyProgress.set(pid, scoreLegacyPaths(pid, state));
  }

  // F-11: Collect ALL winners this turn before picking one.
  // If multiple players achieve victory on the same turn, tiebreak by
  // highest totalCareerLegacyPoints; on further tie, insertion order wins.
  const winners: Array<{ playerId: string; winType: VictoryType; player: typeof player }> = [];

  for (const [playerId, player] of state.players) {
    const playerProgress: VictoryProgress[] = [
      checkDomination(state, playerId),
      checkScience(state, playerId),
      checkCulture(state, playerId),
      checkEconomic(state, playerId),
      checkMilitary(state, playerId),
      checkScore(state, playerId),
    ];

    progress.set(playerId, playerProgress);

    // Collect any victory achieved
    const won = playerProgress.find(p => p.achieved);
    if (won) {
      winners.push({ playerId, winType: won.type, player });
    }
  }

  if (winners.length > 0) {
    // F-11 tiebreak: highest totalCareerLegacyPoints, then insertion order
    const tied = winners.length > 1;
    if (tied) {
      winners.sort((a, b) => {
        const scoreA = a.player.totalCareerLegacyPoints ?? a.player.legacyPoints;
        const scoreB = b.player.totalCareerLegacyPoints ?? b.player.legacyPoints;
        return scoreB - scoreA; // higher score first; equal scores keep insertion order
      });
    }
    const winner = winners[0];
    return {
      ...state,
      victory: {
        winner: winner.playerId,
        winType: winner.winType,
        progress,
        legacyProgress,
        tied,
      },
      log: [...state.log, {
        turn: state.turn,
        playerId: winner.playerId,
        message: `${winner.player.name} achieved ${winner.winType} victory!${tied ? ' (tiebreak resolved)' : ''}`,
        type: 'victory',
      }],
    };
  }

  return { ...state, victory: { ...state.victory, progress, legacyProgress } };
}

function checkDomination(state: GameState, playerId: string): VictoryProgress {
  // Domination: must have at least one city AND all other players must have
  // lost all their cities (eliminated). A player stripped of all cities is
  // eliminated even if stray units survive -- units alone do not constitute
  // a living empire (Civ VII rulebook §7.2 -- W2-08).
  const ownedCities = [...state.cities.values()].filter(c => c.owner === playerId).length;
  const otherPlayersTotal = state.players.size - 1;

  // Count players that still have at least one city
  const otherPlayersAlive = [...state.players.keys()].filter(pid => {
    if (pid === playerId) return false;
    const hasCities = [...state.cities.values()].some(c => c.owner === pid);
    return hasCities;
  }).length;

  const progress = otherPlayersTotal > 0
    ? (otherPlayersTotal - otherPlayersAlive) / otherPlayersTotal
    : 0;

  return {
    type: 'domination',
    progress,
    achieved: otherPlayersAlive === 0 && ownedCities > 0 && otherPlayersTotal > 0,
  };
}

function checkScience(state: GameState, playerId: string): VictoryProgress {
  const player = state.players.get(playerId);
  if (!player) return { type: 'science', progress: 0, achieved: false };

  // W5-01: Space Race project milestones (3 required).
  // Use spaceMilestonesComplete when the player has started the project chain.
  const MILESTONES_REQUIRED = 3;
  const spaceMilestones = player.spaceMilestonesComplete ?? 0;
  if (spaceMilestones > 0) {
    const progress = Math.min(1, spaceMilestones / MILESTONES_REQUIRED);
    return {
      type: 'science',
      progress,
      achieved: spaceMilestones >= MILESTONES_REQUIRED && state.age.currentAge === 'modern',
    };
  }

  // Scaffold fallback (no project chain started): research all modern techs (10 techs).
  // The invented culture >= 100 gate has been removed (no GDD basis -- W2-08 / F-04).
  const modernTechs = [
    'industrialization', 'scientific_theory', 'rifling',
    'steam_power', 'electricity', 'replaceable_parts',
    'flight', 'nuclear_fission', 'combined_arms', 'rocketry',
  ];
  const researched = modernTechs.filter(t => player.researchedTechs.includes(t)).length;
  const progress = researched / modernTechs.length;

  // Science victory can only be achieved in the modern age
  return {
    type: 'science',
    progress,
    achieved: researched === modernTechs.length && state.age.currentAge === 'modern',
  };
}

function checkCulture(state: GameState, playerId: string): VictoryProgress {
  const player = state.players.get(playerId);
  if (!player) return { type: 'culture', progress: 0, achieved: false };

  // X5.1: GDD-parity cultural victory -- World's Fair wonder + >= 10 artifacts.
  // Activate GDD path when any player has collected at least 1 artifact (signals artifact
  // gameplay is live in this session).
  const anyArtifactCollected = [...state.players.values()].some(p => (p.artifactsCollected ?? 0) > 0);

  if (anyArtifactCollected) {
    // X5.1: Brief F-01 -- Cultural victory requires World's Fair wonder + >= 10 artifacts.
    const artifactsCollected = player.artifactsCollected ?? 0;
    const worldsFairOwnedByPlayer = worldsFairBuiltByPlayer(state, playerId);
    const relicCount = player.relics?.length ?? 0;

    // F-09: Relics contribute to cultural victory alongside artifacts.
    // Progress: 50% from artifacts (threshold = ARTIFACTS_FOR_CULTURAL_VICTORY),
    //           20% from relics, 30% from World's Fair
    const artifactProgress = Math.min(1, artifactsCollected / ARTIFACTS_FOR_CULTURAL_VICTORY);
    const relicProgress = Math.min(1, relicCount / CULTURAL_VICTORY_RELIC_COUNT);
    const wonderProgress = worldsFairOwnedByPlayer ? 1 : 0;
    const progress = artifactProgress * 0.5 + relicProgress * 0.2 + wonderProgress * 0.3;

    const achieved = artifactsCollected >= ARTIFACTS_FOR_CULTURAL_VICTORY && worldsFairOwnedByPlayer && state.age.currentAge === 'modern';
    return { type: 'culture', progress, achieved };
  }

  // F-09: Relic-based progress for the scaffold proxy path.
  // When relics are present, they contribute alongside culture + civics.
  const relicCount = player.relics?.length ?? 0;
  const anyRelicsCollected = [...state.players.values()].some(p => (p.relics?.length ?? 0) > 0);

  if (anyRelicsCollected) {
    const cultureThreshold = 300;
    const civicsRequired = 5;
    const civicsCount = player.researchedCivics.length;

    const cultureProgress = Math.min(1, player.culture / cultureThreshold);
    const civicsProgress = Math.min(1, civicsCount / civicsRequired);
    const relicProgress = Math.min(1, relicCount / CULTURAL_VICTORY_RELIC_COUNT);
    const progress = cultureProgress * 0.4 + civicsProgress * 0.3 + relicProgress * 0.3;

    const meetsRequirements = player.culture >= cultureThreshold && civicsCount >= civicsRequired;
    return {
      type: 'culture',
      progress,
      achieved: meetsRequirements && state.age.currentAge === 'modern',
    };
  }

  // Scaffold proxy (backwards compat when no artifact or relic gameplay has occurred):
  // culture >= 300 AND at least 5 civics researched
  const cultureThreshold = 300;
  const civicsRequired = 5;
  const civicsCount = player.researchedCivics.length;

  // Progress: 60% from culture, 40% from civics
  const cultureProgress = Math.min(1, player.culture / cultureThreshold);
  const civicsProgress = Math.min(1, civicsCount / civicsRequired);
  const progress = cultureProgress * 0.6 + civicsProgress * 0.4;

  // Culture victory can only be achieved in the modern age
  const meetsRequirements = player.culture >= cultureThreshold && civicsCount >= civicsRequired;

  return {
    type: 'culture',
    progress,
    achieved: meetsRequirements && state.age.currentAge === 'modern',
  };
}

/**
 * Returns true if the given player owns a city that has the World's Fair wonder.
 * Checks the global builtWonders list first (fast bail-out), then checks
 * player-owned city buildings for 'worlds_fair'.
 */
function worldsFairBuiltByPlayer(state: GameState, playerId: string): boolean {
  if (!state.builtWonders.includes('worlds_fair')) return false;
  for (const city of state.cities.values()) {
    if (city.owner === playerId && city.buildings.includes('worlds_fair')) {
      return true;
    }
  }
  return false;
}

function checkEconomic(state: GameState, playerId: string): VictoryProgress {
  const player = state.players.get(playerId);
  if (!player) return { type: 'economic', progress: 0, achieved: false };

  // X5.1 (World Bank): victory requires:
  //   1. The player has built the 'world_bank' wonder in one of their cities.
  //   2. The player has active trade routes to >= 3 distinct rival civilizations.
  const hasWorldBankWonder = worldBankBuiltByPlayer(state, playerId);
  const TRADE_ROUTES_REQUIRED = 3;
  const tradeRouteCivCount = countDistinctTradeRouteCivs(state, playerId);

  if (hasWorldBankWonder) {
    const tradeProgress = Math.min(1, tradeRouteCivCount / TRADE_ROUTES_REQUIRED);
    // Progress: 50% from wonder, 50% from trade routes
    const progress = 0.5 + tradeProgress * 0.5;
    return {
      type: 'economic',
      progress,
      achieved: tradeRouteCivCount >= TRADE_ROUTES_REQUIRED && state.age.currentAge === 'modern',
    };
  }

  // Scaffold / pre-wonder fallback: worldBankOfficesRemaining chain (W5-01) as a progress
  // signal only -- it no longer achieves victory by itself (wonder required).
  const officesRemaining = player.worldBankOfficesRemaining;
  if (officesRemaining !== null && officesRemaining !== undefined) {
    const totalRivals = state.players.size - 1;
    const establishedCount = Math.max(0, totalRivals - officesRemaining);
    const progress = totalRivals > 0 ? (establishedCount / totalRivals) * 0.5 : 0;
    return {
      type: 'economic',
      progress,
      achieved: false, // World Bank offices alone no longer achieve victory; need the wonder too
    };
  }

  // Final fallback: gold thresholds (no GDD basis; preserved for progress display only).
  const goldReq = 500;
  const totalGoldReq = 1000;
  const goldProgress = Math.min(1, player.gold / goldReq);
  const totalGoldProgress = Math.min(1, player.totalGoldEarned / totalGoldReq);
  const progress = (goldProgress * 0.5 + totalGoldProgress * 0.5) * 0.5; // caps at 0.5 (wonder not built)

  return {
    type: 'economic',
    progress,
    achieved: false, // victory requires World Bank wonder + 3 trade routes
  };
}

/**
 * Returns true if the given player owns a city that has the World Bank wonder.
 */
function worldBankBuiltByPlayer(state: GameState, playerId: string): boolean {
  if (!state.builtWonders.includes('world_bank')) return false;
  for (const city of state.cities.values()) {
    if (city.owner === playerId && city.buildings.includes('world_bank')) {
      return true;
    }
  }
  return false;
}

/**
 * Counts how many distinct rival civilizations this player has active trade routes to.
 * Each trade route's target city's owner that is not the current player counts as one civ
 * (deduplicated so multiple routes to the same civ count once).
 */
function countDistinctTradeRouteCivs(state: GameState, playerId: string): number {
  const civs = new Set<string>();
  for (const route of state.tradeRoutes.values()) {
    if (route.owner !== playerId) continue;
    const targetCity = state.cities.get(route.to);
    if (!targetCity) continue;
    if (targetCity.owner === playerId) continue; // internal route
    civs.add(targetCity.owner);
  }
  return civs.size;
}

function checkMilitary(state: GameState, playerId: string): VictoryProgress {
  const player = state.players.get(playerId);
  if (!player) return { type: 'military', progress: 0, achieved: false };

  // X5.1 / W5-01: Operation Ivy terminal check -- project chain victory.
  // completedProjects.includes('operation_ivy') AND ideology civic researched -> Military Victory.
  const completedProjects = player.completedProjects ?? [];
  const hasIdeologyCivic = IDEOLOGY_CIVICS.some(c => player.researchedCivics.includes(c));

  if (completedProjects.includes('operation_ivy') && hasIdeologyCivic) {
    return {
      type: 'military',
      progress: 1,
      achieved: state.age.currentAge === 'modern',
    };
  }

  // Progress indicator (3 steps):
  //   0   = no ideology civic yet (0%)
  //   0.33 = ideology civic researched
  //   0.66 = manhattan_project completed
  //   1.0  = operation_ivy completed (above)
  // Also show Operation Ivy build progress from operationIvyProgress (0-100).
  const ivyProgress = (player.operationIvyProgress ?? 0) / 100;
  let chainProgress = 0;
  if (completedProjects.includes('manhattan_project')) {
    // between 0.66 and 1.0 based on ivy build progress
    chainProgress = 0.66 + ivyProgress * 0.34;
  } else if (hasIdeologyCivic) {
    chainProgress = 0.33;
  } else {
    chainProgress = 0;
  }

  // Military victory can only be achieved in the modern age via Operation Ivy
  return {
    type: 'military',
    progress: chainProgress,
    achieved: false, // only achieved via completedProjects.includes('operation_ivy') above
  };
}

function checkScore(state: GameState, playerId: string): VictoryProgress {
  const player = state.players.get(playerId);
  if (!player) return { type: 'score', progress: 0, achieved: false };

  // F-06: Score victory triggers when the Modern age progress reaches 100%.
  // Gate: currentAge === "modern" AND ageProgress >= modernThreshold.
  // The old turn-gate (turn >= 300) has been removed -- only age-progress matters.
  // (The outer victorySystem already short-circuits when state.victory.winner is set.)
  const modernThreshold = state.age.ageThresholds?.modern ?? 100;
  const ageProgressRatio = player.ageProgress / modernThreshold;
  const progress = Math.min(1, ageProgressRatio);

  if (state.age.currentAge === 'modern' && ageProgressRatio >= 1.0) {
    // Calculate scores -- player with the highest score wins
    const score = calculateScore(state, playerId);
    let isHighest = true;
    for (const [pid] of state.players) {
      if (pid !== playerId && calculateScore(state, pid) > score) {
        isHighest = false;
        break;
      }
    }
    return { type: 'score', progress: 1, achieved: isHighest };
  }

  return { type: 'score', progress, achieved: false };
}

/**
 * Legacy-based score calculation:
 * milestones * 100 + totalCareerLegacyPoints * 50 + cities * 100 + techs * 20 + culture
 *
 * F-07: uses totalCareerLegacyPoints (never reset) instead of legacyPoints
 * (which resets to 0 at each age transition).  This ensures players who
 * earned points in earlier ages retain their score contribution.
 */
function calculateScore(state: GameState, playerId: string): number {
  const player = state.players.get(playerId);
  if (!player) return 0;

  const paths = player.legacyPaths;
  const totalMilestones = paths.military + paths.economic + paths.science + paths.culture;

  // F-07: career total (accumulates across ages, never reset)
  const careerPoints = player.totalCareerLegacyPoints ?? player.legacyPoints;

  let score = 0;
  score += totalMilestones * 100;
  score += careerPoints * 50;
  score += [...state.cities.values()].filter(c => c.owner === playerId).length * 100;
  score += player.researchedTechs.length * 20;
  score += player.culture;
  return score;
}
