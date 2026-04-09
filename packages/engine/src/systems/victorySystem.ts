import type { GameState, GameAction, VictoryProgress, VictoryType } from '../types/GameState';

/**
 * VictorySystem checks win conditions at the end of each turn.
 * Victory types:
 * - Domination: control all original capitals
 * - Science: complete the space race (research all modern techs)
 * - Culture: earn enough culture (culture >= threshold)
 * - Diplomacy: achieve diplomatic victory (alliances + world congress)
 * - Score: highest score at turn limit (300 turns)
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
  const ownedUnits = [...state.units.values()].filter(u => u.owner === playerId).length;
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

  // Need to research all modern techs (10 techs)
  const modernTechs = [
    'industrialization', 'scientific_theory', 'rifling',
    'steam_power', 'electricity', 'replaceable_parts',
    'flight', 'nuclear_fission', 'combined_arms', 'rocketry',
  ];
  const researched = modernTechs.filter(t => player.researchedTechs.includes(t)).length;
  const progress = researched / modernTechs.length;

  return {
    type: 'science',
    progress,
    achieved: researched === modernTechs.length,
  };
}

function checkCulture(state: GameState, playerId: string): VictoryProgress {
  const player = state.players.get(playerId);
  if (!player) return { type: 'culture', progress: 0, achieved: false };

  const threshold = 500;
  const progress = Math.min(1, player.culture / threshold);

  return {
    type: 'culture',
    progress,
    achieved: player.culture >= threshold,
  };
}

function checkDiplomacy(state: GameState, playerId: string): VictoryProgress {
  // Count alliances
  const alliances = [...state.diplomacy.relations.entries()].filter(
    ([key, rel]) => rel.status === 'alliance' && key.includes(playerId)
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

function calculateScore(state: GameState, playerId: string): number {
  const player = state.players.get(playerId);
  if (!player) return 0;

  let score = 0;
  score += [...state.cities.values()].filter(c => c.owner === playerId).length * 100;
  score += player.researchedTechs.length * 20;
  score += player.culture;
  score += player.gold;
  score += [...state.units.values()].filter(u => u.owner === playerId).length * 10;
  return score;
}
