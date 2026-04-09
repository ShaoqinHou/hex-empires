import type { GameState, GameAction, VictoryProgress, VictoryType } from '../types/GameState';

/**
 * VictorySystem checks win conditions at the end of each turn.
 * Victory types:
 * - Domination: eliminate all rival players (no cities/units remaining)
 * - Science: research all modern techs + culture >= 100
 * - Culture: culture >= 300 + at least 5 civics researched
 * - Diplomacy: alliances with 60% of other players
 * - Economic: gold >= 500, totalGoldEarned >= 1000, has alliance with at least 1 player
 * - Military: totalKills >= 20 + at least 5 cities
 * - Score: highest score at turn limit (300 turns) using legacy-based scoring
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

  for (const [playerId, player] of state.players) {
    const playerProgress: VictoryProgress[] = [
      checkDomination(state, playerId),
      checkScience(state, playerId),
      checkCulture(state, playerId),
      checkDiplomacy(state, playerId),
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

  return { ...state, victory: { ...state.victory, progress } };
}

function checkDomination(state: GameState, playerId: string): VictoryProgress {
  // Domination: must have at least one city AND all other players must have
  // lost all their units and cities (eliminated)
  const ownedCities = [...state.cities.values()].filter(c => c.owner === playerId).length;
  const otherPlayersTotal = state.players.size - 1;

  // Count players that still have cities OR military units
  const otherPlayersAlive = [...state.players.keys()].filter(pid => {
    if (pid === playerId) return false;
    const hasCities = [...state.cities.values()].some(c => c.owner === pid);
    const hasUnits = [...state.units.values()].some(u => u.owner === pid);
    return hasCities || hasUnits;
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

  // Need to research all modern techs (10 techs) AND have culture >= 100
  const modernTechs = [
    'industrialization', 'scientific_theory', 'rifling',
    'steam_power', 'electricity', 'replaceable_parts',
    'flight', 'nuclear_fission', 'combined_arms', 'rocketry',
  ];
  const researched = modernTechs.filter(t => player.researchedTechs.includes(t)).length;
  const cultureReq = 100;
  const hasCulture = player.culture >= cultureReq;

  // Progress: 80% from techs, 20% from culture requirement
  const techProgress = researched / modernTechs.length;
  const cultureProgress = Math.min(1, player.culture / cultureReq);
  const progress = techProgress * 0.8 + cultureProgress * 0.2;

  return {
    type: 'science',
    progress,
    achieved: researched === modernTechs.length && hasCulture,
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

  return {
    type: 'culture',
    progress,
    achieved: player.culture >= cultureThreshold && civicsCount >= civicsRequired,
  };
}

function checkDiplomacy(state: GameState, playerId: string): VictoryProgress {
  // Count alliances
  const alliances = [...state.diplomacy.relations.entries()].filter(
    ([key, rel]) => rel.hasAlliance && key.includes(playerId)
  ).length;

  const otherPlayers = state.players.size - 1;
  const needed = Math.max(1, Math.ceil(otherPlayers * 0.6));
  const progress = otherPlayers > 0 ? Math.min(1, alliances / needed) : 0;

  return {
    type: 'diplomacy',
    progress,
    achieved: alliances >= needed && otherPlayers > 0,
  };
}

function checkEconomic(state: GameState, playerId: string): VictoryProgress {
  const player = state.players.get(playerId);
  if (!player) return { type: 'economic', progress: 0, achieved: false };

  // Gold >= 500 AND totalGoldEarned >= 1000 AND has alliance with at least 1 player
  const goldReq = 500;
  const totalGoldReq = 1000;
  const hasGold = player.gold >= goldReq;
  const hasTotalGold = player.totalGoldEarned >= totalGoldReq;

  const alliances = [...state.diplomacy.relations.entries()].filter(
    ([key, rel]) => rel.hasAlliance && key.includes(playerId)
  ).length;
  const hasAlliance = alliances >= 1;

  // Progress: 40% gold, 40% total gold, 20% alliance
  const goldProgress = Math.min(1, player.gold / goldReq);
  const totalGoldProgress = Math.min(1, player.totalGoldEarned / totalGoldReq);
  const allianceProgress = hasAlliance ? 1 : 0;
  const progress = goldProgress * 0.4 + totalGoldProgress * 0.4 + allianceProgress * 0.2;

  return {
    type: 'economic',
    progress,
    achieved: hasGold && hasTotalGold && hasAlliance,
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

  return {
    type: 'military',
    progress,
    achieved: player.totalKills >= killsReq && ownedCities >= citiesReq,
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
 * milestones * 100 + legacyPoints * 50 + cities * 100 + techs * 20 + culture
 */
function calculateScore(state: GameState, playerId: string): number {
  const player = state.players.get(playerId);
  if (!player) return 0;

  const paths = player.legacyPaths;
  const totalMilestones = paths.military + paths.economic + paths.science + paths.culture;

  let score = 0;
  score += totalMilestones * 100;
  score += player.legacyPoints * 50;
  score += [...state.cities.values()].filter(c => c.owner === playerId).length * 100;
  score += player.researchedTechs.length * 20;
  score += player.culture;
  return score;
}
