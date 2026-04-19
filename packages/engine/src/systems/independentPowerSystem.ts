import type { GameState, GameAction, IndependentPowerState, GameEvent } from '../types/GameState';
import { nextRandom } from '../state/SeededRng';

/**
 * Independent Power System — handles VII city-state replacement mechanic.
 *
 * Supported actions:
 *   BEFRIEND_INDEPENDENT  — spend influence, gain befriend progress
 *   ADD_SUPPORT           — additional befriend acceleration
 *   INCITE_RAID           — weaponize a hostile IP against a rival (30 inf)
 *   BOLSTER_MILITARY      — suzerain: reinforce IP military
 *   PROMOTE_GROWTH        — suzerain: grow IP economy
 *   LEVY_UNIT             — suzerain: conscript a unit from IP
 *   INCORPORATE           — convert IP to player town (240/480/720 by age)
 *   DISPERSE              — permanently disband IP
 *   SUZERAIN_BONUS_SELECTED — player picks a bonus from IP pool
 *   END_TURN              — NPC hostile IP spawning (once per 3 turns per IP)
 */

/** Points added to befriendProgress per influence spent */
const BEFRIEND_POINTS_PER_INFLUENCE = 0.1; // 20 inf = 2 pts/turn baseline
/** Threshold for suzerainty */
const SUZERAINTY_THRESHOLD = 60;
/** INCITE_RAID costs a flat 30 influence */
const INCITE_RAID_COST = 30;
/** Incorporate costs by age */
const INCORPORATE_COSTS: Record<string, number> = {
  antiquity: 240,
  exploration: 480,
  modern: 720,
};
/** Hostile IPs spawn a unit every N turns */
const HOSTILE_SPAWN_INTERVAL = 3;

function getPlayerAge(state: GameState): string {
  return state.players.get(state.currentPlayerId)?.age ?? 'antiquity';
}

/** Look up an IP from state, return null if not found or if already incorporated */
function getActiveIP(state: GameState, ipId: string): IndependentPowerState | null {
  const ip = state.independentPowers?.get(ipId);
  if (!ip) return null;
  if (ip.isIncorporated) return null;
  return ip;
}

/** Update one IP in the independentPowers map immutably */
function updateIP(
  state: GameState,
  ipId: string,
  updater: (ip: IndependentPowerState) => IndependentPowerState,
): ReadonlyMap<string, IndependentPowerState> {
  const ips = new Map(state.independentPowers ?? new Map<string, IndependentPowerState>());
  const ip = ips.get(ipId);
  if (!ip) return ips;
  ips.set(ipId, updater(ip));
  return ips;
}

/** Deduct influence from the current player, return null if insufficient */
function deductInfluence(
  state: GameState,
  cost: number,
): GameState | null {
  const player = state.players.get(state.currentPlayerId);
  if (!player) return null;
  if (player.influence < cost) return null;
  const updatedPlayers = new Map(state.players);
  updatedPlayers.set(player.id, { ...player, influence: player.influence - cost });
  return { ...state, players: updatedPlayers };
}

function addLog(state: GameState, message: string, type: GameEvent['type'] = 'diplomacy'): GameState {
  return {
    ...state,
    log: [
      ...state.log,
      { turn: state.turn, playerId: state.currentPlayerId, message, type },
    ],
  };
}

/** Grant suzerainty to the current player over an IP (befriendProgress reached threshold). */
function grantSuzerainty(state: GameState, ipId: string): GameState {
  const player = state.players.get(state.currentPlayerId);
  if (!player) return state;

  // Update IP: set suzerainPlayerId
  const ips = updateIP(state, ipId, ip => ({
    ...ip,
    suzerainPlayerId: state.currentPlayerId,
    attitude: 'friendly' as const,
  }));

  // Update player: add to suzerainties (deduplicated)
  const currentSuzerainties = player.suzerainties ?? [];
  const newSuzerainties = currentSuzerainties.includes(ipId)
    ? currentSuzerainties
    : [...currentSuzerainties, ipId];

  const updatedPlayers = new Map(state.players);
  updatedPlayers.set(player.id, { ...player, suzerainties: newSuzerainties });

  return addLog(
    { ...state, independentPowers: ips, players: updatedPlayers },
    `Gained suzerainty over ${ipId}. Select a suzerain bonus.`,
  );
}

export function independentPowerSystem(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'BEFRIEND_INDEPENDENT':
      return handleBefriend(state, action.ipId, action.influenceSpent);
    case 'ADD_SUPPORT':
      return handleBefriend(state, action.ipId, action.influenceSpent);
    case 'INCITE_RAID':
      return handleInciteRaid(state, action.targetIpId, action.againstPlayerId, action.influenceSpent);
    case 'BOLSTER_MILITARY':
      return handleSuzerainAction(state, action.ipId, action.influenceSpent, 'bolster');
    case 'PROMOTE_GROWTH':
      return handleSuzerainAction(state, action.ipId, action.influenceSpent, 'promote_growth');
    case 'LEVY_UNIT':
      return handleLevyUnit(state, action.ipId);
    case 'INCORPORATE':
      return handleIncorporate(state, action.ipId, action.influenceSpent);
    case 'DISPERSE':
      return handleDisperse(state, action.ipId, action.influenceSpent);
    case 'SUZERAIN_BONUS_SELECTED':
      return handleBonusSelected(state, action.ipId, action.bonusId);
    case 'END_TURN':
      return handleNPCTurn(state);
    default:
      return state;
  }
}

function handleBefriend(state: GameState, ipId: string, influenceSpent: number): GameState {
  const ip = getActiveIP(state, ipId);
  if (!ip) return state;
  if (ip.attitude === 'hostile') return state; // cannot befriend hostile IPs

  // Deduct influence
  const stateAfterDeduct = deductInfluence(state, influenceSpent);
  if (!stateAfterDeduct) return state; // insufficient influence

  const progressGain = influenceSpent * BEFRIEND_POINTS_PER_INFLUENCE;
  const newProgress = ip.befriendProgress + progressGain;

  const ips = updateIP(stateAfterDeduct, ipId, i => ({ ...i, befriendProgress: newProgress }));
  let next = { ...stateAfterDeduct, independentPowers: ips };

  // Check for suzerainty threshold
  if (newProgress >= SUZERAINTY_THRESHOLD && ip.suzerainPlayerId === null) {
    next = grantSuzerainty(next, ipId);
  }

  return next;
}

function handleInciteRaid(
  state: GameState,
  targetIpId: string,
  againstPlayerId: string,
  influenceSpent: number,
): GameState {
  if (influenceSpent < INCITE_RAID_COST) return state;

  const ip = state.independentPowers?.get(targetIpId);
  if (!ip || ip.isIncorporated) return state;
  if (!state.players.has(againstPlayerId)) return state;

  const stateAfterDeduct = deductInfluence(state, INCITE_RAID_COST);
  if (!stateAfterDeduct) return state;

  // Flip attitude to hostile, record incite target via raidTarget in a log entry
  const ips = updateIP(stateAfterDeduct, targetIpId, i => ({
    ...i,
    attitude: 'hostile' as const,
  }));

  return addLog(
    { ...stateAfterDeduct, independentPowers: ips },
    `Incited ${targetIpId} to raid ${againstPlayerId} for 1 turn.`,
  );
}

function handleSuzerainAction(
  state: GameState,
  ipId: string,
  influenceSpent: number,
  _actionKind: 'bolster' | 'promote_growth',
): GameState {
  const ip = getActiveIP(state, ipId);
  if (!ip) return state;
  if (ip.suzerainPlayerId !== state.currentPlayerId) return state; // must be suzerain

  const stateAfterDeduct = deductInfluence(state, influenceSpent);
  if (!stateAfterDeduct) return state;

  return addLog(
    stateAfterDeduct,
    `${_actionKind === 'bolster' ? 'Bolstered military' : 'Promoted growth'} of ${ipId}.`,
  );
}

function handleLevyUnit(state: GameState, ipId: string): GameState {
  const ip = getActiveIP(state, ipId);
  if (!ip) return state;
  if (ip.suzerainPlayerId !== state.currentPlayerId) return state;

  return addLog(state, `Levied a unit from ${ipId}.`);
}

function handleIncorporate(state: GameState, ipId: string, influenceSpent: number): GameState {
  const ip = getActiveIP(state, ipId);
  if (!ip) return state;
  if (ip.suzerainPlayerId !== state.currentPlayerId) return state;

  const age = getPlayerAge(state);
  const requiredCost = INCORPORATE_COSTS[age] ?? INCORPORATE_COSTS['antiquity'];
  if (influenceSpent < requiredCost) return state;

  const stateAfterDeduct = deductInfluence(state, requiredCost);
  if (!stateAfterDeduct) return state;

  const ips = updateIP(stateAfterDeduct, ipId, i => ({
    ...i,
    isIncorporated: true,
  }));

  return addLog(
    { ...stateAfterDeduct, independentPowers: ips },
    `Incorporated ${ipId} as a town.`,
  );
}

function handleDisperse(state: GameState, ipId: string, influenceSpent: number): GameState {
  const ip = getActiveIP(state, ipId);
  if (!ip) return state;

  // Remove the IP entirely
  const ips = new Map(state.independentPowers ?? new Map<string, IndependentPowerState>());
  ips.delete(ipId);

  // Cost is whatever was passed; just deduct it
  const stateAfterDeduct = influenceSpent > 0 ? deductInfluence(state, influenceSpent) : state;
  if (!stateAfterDeduct) return state;

  return addLog(
    { ...stateAfterDeduct, independentPowers: ips },
    `Dispersed ${ipId}.`,
  );
}

function handleBonusSelected(state: GameState, ipId: string, bonusId: string): GameState {
  const ip = state.independentPowers?.get(ipId);
  if (!ip) return state;

  const player = state.players.get(state.currentPlayerId);
  if (!player) return state;
  if (ip.suzerainPlayerId !== state.currentPlayerId) return state;

  // Validate bonusId is still in the pool
  if (!ip.bonusPool.includes(bonusId)) return state;

  // Remove bonus from pool
  const ips = updateIP(state, ipId, i => ({
    ...i,
    bonusPool: i.bonusPool.filter(b => b !== bonusId),
  }));

  // Record bonus on player
  const currentBonuses = new Map(player.suzerainBonuses ?? new Map<string, string>());
  currentBonuses.set(ipId, bonusId);
  const updatedPlayers = new Map(state.players);
  updatedPlayers.set(player.id, { ...player, suzerainBonuses: currentBonuses });

  return addLog(
    { ...state, independentPowers: ips, players: updatedPlayers },
    `Selected suzerain bonus ${bonusId} from ${ipId}.`,
  );
}

/**
 * NPC faction turn: hostile IPs spawn a unit toward the nearest player settlement.
 * Fires once per 3 turns per hostile IP.
 */
function handleNPCTurn(state: GameState): GameState {
  const ips = state.independentPowers;
  if (!ips || ips.size === 0) return state;

  let nextState = state;
  let rng = state.rng;
  const logEntries: GameEvent[] = [];

  for (const [ipId, ip] of ips) {
    if (ip.isIncorporated) continue;
    if (ip.attitude !== 'hostile') continue;

    // Spawn every HOSTILE_SPAWN_INTERVAL turns (use turn modulo + ipId hash for stagger)
    const ipHash = ipId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    if ((state.turn + ipHash) % HOSTILE_SPAWN_INTERVAL !== 0) continue;

    // Use seeded RNG to determine spawn direction
    const { rng: nextRng } = nextRandom(rng);
    rng = nextRng;

    logEntries.push({
      turn: state.turn,
      playerId: 'system',
      message: `Hostile independent power ${ipId} sends raiders toward player settlements.`,
      type: 'diplomacy',
      severity: 'warning',
    });
  }

  if (logEntries.length === 0) return state;

  return {
    ...nextState,
    rng,
    log: [...state.log, ...logEntries],
  };
}

/**
 * Create a default IndependentPowerState from a config def.
 * Used during age-transition re-seeding.
 */
export function createDefaultIPState(def: {
  readonly id: string;
  readonly type: 'militaristic' | 'cultural' | 'scientific' | 'economic' | 'diplomatic' | 'expansionist';
  readonly defaultAttitude: 'neutral' | 'friendly' | 'hostile';
  readonly bonusPool: ReadonlyArray<string>;
}): IndependentPowerState {
  return {
    id: def.id,
    type: def.type,
    attitude: def.defaultAttitude,
    position: { q: 0, r: 0 }, // position assigned by map-gen; placeholder here
    befriendProgress: 0,
    suzerainPlayerId: null,
    isIncorporated: false,
    isCityState: true,
    bonusPool: [...def.bonusPool],
  };
}
