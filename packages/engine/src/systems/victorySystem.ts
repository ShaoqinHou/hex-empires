import type { GameState, GameAction, VictoryProgress, VictoryType, VictoryLegacyProgressEntry } from '../types/GameState';
import type { PlayerId } from '../types/Ids';
import { scoreLegacyPaths } from '../state/LegacyPaths';

/**
 * VictorySystem checks win conditions at the end of each turn.
 *
 * Victory types — CURRENT SCAFFOLD PROXIES (not full Civ VII parity):
 * - Domination: eliminate all rival players (they lose all cities — units alone do not keep a player alive)
 * - Science: research all modern techs  [TODO(W5-01): replace with Space Race project per GDD]
 * - Culture: culture >= 300 + at least 5 civics researched  [TODO(W5-02): add Artifacts / World's Fair per GDD]
 * - Economic: gold >= 500 + totalGoldEarned >= 1000  [TODO(W5-01): replace with World Bank project per GDD]
 * - Military: totalKills >= 20 + at least 5 cities  [TODO(W5-01): replace with Operation Ivy project per GDD]
 * - Score: highest score at turn limit (300 turns) using legacy-based scoring
 *
 * Note: 'diplomacy' victory type was removed (no GDD basis — W1-C / W2-08).
 * Detailed per-proxy rewrites are tracked in workpack W5-01 (Science/Economic/Military)
 * and W5-02 (Culture/Artifacts/World's Fair).
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

  // Scaffold proxy: research all modern techs (10 techs).
  // The invented culture >= 100 gate has been removed (no GDD basis — W2-08 / F-04).
  // TODO(W5-01): replace with Space Race project milestones per GDD.
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

  // Culture >= 300 AND at least 5 civics researched
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

function checkEconomic(state: GameState, playerId: string): VictoryProgress {
  const player = state.players.get(playerId);
  if (!player) return { type: 'economic', progress: 0, achieved: false };

  // Scaffold proxy: gold >= 500 AND totalGoldEarned >= 1000.
  // The invented alliance >= 1 gate has been removed (no GDD basis — W2-08 / F-01).
  // TODO(W5-01): replace with World Bank project milestones per GDD.
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

  // totalKills >= 20 AND at least 5 cities
  const killsReq = 20;
  const citiesReq = 5;
  const ownedCities = [...state.cities.values()].filter(c => c.owner === playerId).length;

  // Progress: 60% from kills, 40% from cities
  const killsProgress = Math.min(1, player.totalKills / killsReq);
  const citiesProgress = Math.min(1, ownedCities / citiesReq);
  const progress = killsProgress * 0.6 + citiesProgress * 0.4;

  // Military victory can only be achieved in the modern age
  const meetsRequirements = player.totalKills >= killsReq && ownedCities >= citiesReq;

  return {
    type: 'military',
    progress,
    achieved: meetsRequirements && state.age.currentAge === 'modern',
  };
}

function checkScore(state: GameState, playerId: string): VictoryProgress {
  const TURN_LIMIT = 300;
  const progress = Math.min(1, state.turn / TURN_LIMIT);

  // Score victory triggers at turn limit
  if (state.turn >= TURN_LIMIT) {
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
