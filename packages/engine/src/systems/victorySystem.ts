import type { GameState, GameAction, VictoryProgress, VictoryType, VictoryLegacyProgressEntry } from '../types/GameState';
import type { PlayerId } from '../types/Ids';
import { scoreLegacyPaths } from '../state/LegacyPaths';

/**
 * VictorySystem checks win conditions at the end of each turn.
 *
 * Victory types:
 * - Domination: eliminate all rival players (they lose all cities — units alone do not keep a player alive)
 * - Science: complete 3 Space Race projects (spaceMilestonesComplete >= 3) [W5-01]
 *   Scaffold fallback: all 10 modern techs researched (if no project data available)
 * - Culture: culture >= 300 + at least 5 civics researched [TODO(W5-02): Artifacts / World's Fair]
 * - Economic: World Bank offices in all rival capitals (worldBankOfficesRemaining === 0) [W5-01]
 *   Scaffold fallback: gold >= 500 + totalGoldEarned >= 1000 (if no project chain started)
 * - Military: complete Operation Ivy project (completedProjects.includes('operation_ivy')) [W5-01]
 *   Scaffold fallback: totalKills >= 20 + at least 5 cities (if Operation Ivy not completed)
 * - Score: highest score when Modern age progress reaches 100% (F-06) using legacy-based scoring
 *
 * Note: diplomacy victory type was removed (no GDD basis — W1-C / W2-08).
 * W5-02 (Culture/Artifacts/World's Fair) is a separate workpack.
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
  // pure and independent of victory detection — we always compute it on
  // a victory-check tick, even if a player wins this turn, so UI panels
  // always see a fresh snapshot. This is pure enrichment; the existing
  // seven-path victory detection below is unchanged.
  const legacyProgress = new Map<PlayerId, ReadonlyArray<VictoryLegacyProgressEntry>>();
  for (const pid of state.players.keys()) {
    legacyProgress.set(pid, scoreLegacyPaths(pid, state));
  }

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

    // Check if any victory achieved
    const won = playerProgress.find(p => p.achieved);
    if (won) {
      return {
        ...state,
        victory: {
          winner: playerId,
          winType: won.type,
          progress,
          legacyProgress,
        },
        log: [...state.log, {
          turn: state.turn,
          playerId,
          message: `${player.name} achieved ${won.type} victory!`,
          type: 'victory',
        }],
      };
    }
  }

  return { ...state, victory: { ...state.victory, progress, legacyProgress } };
}

function checkDomination(state: GameState, playerId: string): VictoryProgress {
  // Domination: must have at least one city AND all other players must have
  // lost all their cities (eliminated). A player stripped of all cities is
  // eliminated even if stray units survive — units alone do not constitute
  // a living empire (Civ VII rulebook §7.2 — W2-08).
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
  // The invented culture >= 100 gate has been removed (no GDD basis — W2-08 / F-04).
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

  // W5-02: GDD-parity cultural victory — 15 Artifacts via Explorer + World's Fair built.
  // Activate GDD path when any player has collected at least 1 artifact (signals artifact
  // gameplay is live in this session).
  const anyArtifactCollected = [...state.players.values()].some(p => (p.artifactsCollected ?? 0) > 0);

  if (anyArtifactCollected) {
    const ARTIFACTS_REQUIRED = 15;
    const artifactsCollected = player.artifactsCollected ?? 0;
    const worldsFairOwnedByPlayer = worldsFairBuiltByPlayer(state, playerId);
    const relicCount = player.relics?.length ?? 0;

    // F-09: Relics contribute to cultural victory alongside artifacts.
    // Progress: 50% from artifacts, 20% from relics, 30% from World's Fair
    const artifactProgress = Math.min(1, artifactsCollected / ARTIFACTS_REQUIRED);
    const relicProgress = Math.min(1, relicCount / 6);
    const wonderProgress = worldsFairOwnedByPlayer ? 1 : 0;
    const progress = artifactProgress * 0.5 + relicProgress * 0.2 + wonderProgress * 0.3;

    const achieved = artifactsCollected >= ARTIFACTS_REQUIRED && worldsFairOwnedByPlayer && state.age.currentAge === 'modern';
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
    const relicProgress = Math.min(1, relicCount / 6);
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

  // W5-01: World Bank offices — all rival capitals visited.
  // worldBankOfficesRemaining is null/undefined until the player starts the chain,
  // then counts down to 0 (victory).
  const officesRemaining = player.worldBankOfficesRemaining;
  if (officesRemaining !== null && officesRemaining !== undefined) {
    const totalRivals = state.players.size - 1;
    const establishedCount = Math.max(0, totalRivals - officesRemaining);
    const progress = totalRivals > 0 ? establishedCount / totalRivals : 0;
    return {
      type: 'economic',
      progress,
      achieved: officesRemaining === 0 && state.age.currentAge === 'modern',
    };
  }

  // Scaffold fallback (World Bank chain not yet started): gold thresholds.
  // The invented alliance >= 1 gate has been removed (no GDD basis — W2-08 / F-01).
  const goldReq = 500;
  const totalGoldReq = 1000;
  const hasGold = player.gold >= goldReq;
  const hasTotalGold = player.totalGoldEarned >= totalGoldReq;

  // Progress: 50% gold, 50% total gold
  const goldProgress = Math.min(1, player.gold / goldReq);
  const totalGoldProgress = Math.min(1, player.totalGoldEarned / totalGoldReq);
  const progress = goldProgress * 0.5 + totalGoldProgress * 0.5;

  // Economic victory can only be achieved in the modern age
  return {
    type: 'economic',
    progress,
    achieved: hasGold && hasTotalGold && state.age.currentAge === 'modern',
  };
}

function checkMilitary(state: GameState, playerId: string): VictoryProgress {
  const player = state.players.get(playerId);
  if (!player) return { type: 'military', progress: 0, achieved: false };

  // W5-01: Operation Ivy terminal check — project chain victory.
  // completedProjects.includes('operation_ivy') → Military Victory.
  const completedProjects = player.completedProjects ?? [];
  if (completedProjects.includes('operation_ivy')) {
    return {
      type: 'military',
      progress: 1,
      achieved: state.age.currentAge === 'modern',
    };
  }

  // Progress indicator for the project chain:
  // Step 0 = 0 pts, step 1 (ideology >= 20) = 0.33, step 2 (manhattan complete) = 0.66, step 3 (ivy) = 1.0
  const ideologyPts = player.ideologyPoints ?? 0;
  const IDEOLOGY_THRESHOLD = 20;
  let chainProgress = 0;
  if (completedProjects.includes('manhattan_project')) {
    chainProgress = 0.66;
  } else if (ideologyPts >= IDEOLOGY_THRESHOLD) {
    chainProgress = 0.33;
  } else {
    chainProgress = Math.min(0.33, (ideologyPts / IDEOLOGY_THRESHOLD) * 0.33);
  }

  // Scaffold fallback: if the project system has never been triggered,
  // also show kills + cities progress as a baseline signal.
  const killsReq = 20;
  const citiesReq = 5;
  const ownedCities = [...state.cities.values()].filter(c => c.owner === playerId).length;
  const killsProgress = Math.min(1, player.totalKills / killsReq);
  const citiesProgress = Math.min(1, ownedCities / citiesReq);
  const scaffoldProgress = killsProgress * 0.6 + citiesProgress * 0.4;

  // Show whichever is higher so players see meaningful progress either way
  const progress = Math.max(chainProgress, scaffoldProgress);

  // Military victory can only be achieved in the modern age via Operation Ivy
  return {
    type: 'military',
    progress,
    achieved: false, // only achieved via completedProjects.includes('operation_ivy') above
  };
}

function checkScore(state: GameState, playerId: string): VictoryProgress {
  const player = state.players.get(playerId);
  if (!player) return { type: 'score', progress: 0, achieved: false };

  // F-06: Score victory triggers when modern age progress reaches 100%,
  // not at a fixed turn limit. This ties game length to the age system.
  const modernThreshold = state.age.ageThresholds?.modern ?? 100;
  const ageProgressRatio = player.ageProgress / modernThreshold;
  const progress = Math.min(1, ageProgressRatio);

  if (state.age.currentAge === 'modern' && ageProgressRatio >= 1.0 && !state.victory?.winner) {
    // Calculate scores
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
