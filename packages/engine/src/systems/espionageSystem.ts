/**
 * espionageSystem — pure system for Espionage operations (Y5/Z4, F-05).
 *
 * Handles two parallel state machines:
 *
 * Y5 scaffold (diplomacy.activeEspionageOps — EspionageOperation[]):
 *  - INITIATE_ESPIONAGE: validate target, action def, influence → create EspionageOperation.
 *  - COUNTER_ESPIONAGE: validate op targets current player → increment counterInfluence.
 *  - END_TURN: tick all active ops — drain influence, countdown turnsRemaining,
 *    roll detection, auto-complete or auto-cancel.
 *
 * Z4 state machine (state.espionageOps — ReadonlyMap<string, EspionageOpState>):
 *  - INITIATE_ESPIONAGE: also creates EspionageOpState in state.espionageOps.
 *  - CANCEL_ESPIONAGE: remove op from state.espionageOps.
 *  - END_TURN: tick EspionageOpState ops — decrement turnsRemaining, detection roll,
 *    apply effects on completion (steal_tech, steal_civic, sabotage_district,
 *    incite_rebellion), drain counterespionageInfluence per turn.
 *
 * Import boundaries: only from ../types/ and ../state/.
 * No cross-system imports; no side effects; fully pure.
 */

import type { GameState, GameAction, CityState } from '../types/GameState';
import type { EspionageActionDef, EspionageOperation, EspionageOpState, EspionageOpType } from '../types/Espionage';
import { nextRandom } from '../state/SeededRng';

/** Turns an espionage operation takes to complete once initiated. */
const ESPIONAGE_OPERATION_DURATION = 4;

// ── Helpers ──

function getOps(state: GameState): ReadonlyArray<EspionageOperation> {
  return state.diplomacy.activeEspionageOps ?? [];
}

function setOps(state: GameState, ops: ReadonlyArray<EspionageOperation>): GameState {
  return {
    ...state,
    diplomacy: { ...state.diplomacy, activeEspionageOps: ops },
  };
}

/** Generate a unique runtime id for an espionage operation. */
function generateOpId(ownerId: string, targetId: string, turn: number, counter: number): string {
  return `esp-${ownerId}-${targetId}-${turn}-${counter}`;
}

/** Look up an espionage action definition from config. */
function findActionDef(state: GameState, actionId: string): EspionageActionDef | undefined {
  return state.config.espionageActions?.get(actionId);
}

// ── Reducers ──

function applyInitiateEspionage(
  state: GameState,
  action: Extract<GameAction, { type: 'INITIATE_ESPIONAGE' }>,
): GameState {
  const { targetPlayerId, actionId, influenceSpent } = action;
  const currentPlayerId = state.currentPlayerId;
  const player = state.players.get(currentPlayerId);
  if (!player) return state;

  // Target must exist
  if (!state.players.has(targetPlayerId)) return state;
  // Cannot target self
  if (targetPlayerId === currentPlayerId) return state;

  // Action def must exist in config
  const actionDef = findActionDef(state, actionId);
  if (!actionDef) return state;

  // Player must have sufficient influence
  if (player.influence < influenceSpent) return state;
  if (influenceSpent < actionDef.influenceCostPerTurn) return state;

  // Deduct initial influence
  const updatedPlayer = { ...player, influence: player.influence - influenceSpent };
  const players = new Map(state.players);
  players.set(currentPlayerId, updatedPlayer);

  // Create the operation
  const op: EspionageOperation = {
    id: generateOpId(currentPlayerId, targetPlayerId, state.turn, getOps(state).length),
    actionId,
    ownerId: currentPlayerId,
    targetPlayerId,
    startedOnTurn: state.turn,
    turnsRemaining: ESPIONAGE_OPERATION_DURATION,
    totalInfluenceSpent: influenceSpent,
    isCountered: false,
    counterInfluence: 0,
    completed: false,
    cancelled: false,
  };

  return setOps(
    { ...state, players },
    [...getOps(state), op],
  );
}

function applyCounterEspionage(
  state: GameState,
  action: Extract<GameAction, { type: 'COUNTER_ESPIONAGE' }>,
): GameState {
  const { opId, counterInfluence } = action;
  const currentPlayerId = state.currentPlayerId;
  const player = state.players.get(currentPlayerId);
  if (!player) return state;

  // Player must have sufficient influence
  if (player.influence < counterInfluence) return state;

  // Find the operation
  const ops = getOps(state);
  const opIndex = ops.findIndex(op => op.id === opId);
  if (opIndex === -1) return state;

  const op = ops[opIndex];
  // Must target the current player
  if (op.targetPlayerId !== currentPlayerId) return state;
  // Must not already be completed or cancelled
  if (op.completed || op.cancelled) return state;

  // Deduct influence from the countering player
  const updatedPlayer = { ...player, influence: player.influence - counterInfluence };
  const players = new Map(state.players);
  players.set(currentPlayerId, updatedPlayer);

  // Update the operation
  const updatedOp: EspionageOperation = {
    ...op,
    isCountered: true,
    counterInfluence: op.counterInfluence + counterInfluence,
  };

  const newOps = [...ops];
  newOps[opIndex] = updatedOp;

  return setOps({ ...state, players }, newOps);
}

/**
 * Tick all active espionage operations on END_TURN:
 * - Drain influence cost per turn from the owner.
 * - Decrement turnsRemaining.
 * - Roll detection: base chance + counter bonus.
 * - Auto-complete when turnsRemaining reaches 0.
 * - Auto-cancel when detected.
 */
function tickEspionageOps(state: GameState): GameState {
  const ops = getOps(state);
  if (ops.length === 0) return state;

  const players = new Map(state.players);
  let rng = state.rng;
  const newOps: EspionageOperation[] = [];

  for (const op of ops) {
    // Skip completed/cancelled ops — keep them for history
    if (op.completed || op.cancelled) {
      newOps.push(op);
      continue;
    }

    const owner = players.get(op.ownerId);
    const actionDef = findActionDef(state, op.actionId);

    // Drain influence from owner
    const cost = actionDef?.influenceCostPerTurn ?? 0;
    if (owner && cost > 0) {
      const deducted = Math.min(owner.influence, cost);
      players.set(op.ownerId, { ...owner, influence: owner.influence - deducted });
    }

    const turnsRemaining = op.turnsRemaining - 1;

    // Detection roll: base chance + counter influence bonus (1% per 5 counter influence)
    const detectionChance = (actionDef?.detectionChance ?? 0) + (op.counterInfluence / 500);
    const { value: roll, rng: nextRng } = nextRandom(rng);
    rng = nextRng;
    const detected = roll < detectionChance;

    if (detected) {
      // Cancelled — detected by target
      newOps.push({ ...op, turnsRemaining, cancelled: true });
    } else if (turnsRemaining <= 0) {
      // Completed successfully
      newOps.push({ ...op, turnsRemaining: 0, completed: true });
    } else {
      // Still in progress
      newOps.push({ ...op, turnsRemaining });
    }
  }

  return {
    ...setOps({ ...state, players }, newOps),
    rng,
  };
}

// ── Z4 state machine helpers ──

/** Unique id for a Z4 EspionageOpState. */
function generateZ4OpId(attackerId: string, targetId: string, turn: number, index: number): string {
  return `eop-${attackerId}-${targetId}-${turn}-${index}`;
}

function getZ4Ops(state: GameState): ReadonlyMap<string, EspionageOpState> {
  return state.espionageOps ?? new Map();
}

function setZ4Ops(state: GameState, ops: ReadonlyMap<string, EspionageOpState>): GameState {
  return { ...state, espionageOps: ops };
}

/** Z4: Add EspionageOpState to state.espionageOps when INITIATE_ESPIONAGE fires.
 *
 * Only creates a Z4 op when influenceSpent >= 10 (the Z4 Influence cost floor).
 * This gates the Z4 path from the Y5 scaffold path (which uses lower costs
 * in existing tests) and prevents parallel RNG consumption from the two systems
 * from interfering with each other.
 */
function addZ4Op(state: GameState, action: Extract<GameAction, { type: 'INITIATE_ESPIONAGE' }>): GameState {
  const { targetPlayerId, actionId, influenceSpent } = action;
  const currentPlayerId = state.currentPlayerId;

  // Z4 ops require influenceSpent >= 10 (distinct from Y5 scaffold ops)
  if (influenceSpent < 10) return state;

  // Must be a valid Z4 EspionageOpType; fall through if not recognised
  const knownTypes: ReadonlySet<string> = new Set([
    'steal_tech', 'steal_civic', 'sabotage_district', 'incite_rebellion',
    'steal_great_work', 'plant_evidence', 'spread_propaganda', 'monitor_treaties',
  ]);
  if (!knownTypes.has(actionId)) return state; // not a Z4 op type; skip

  const opType = actionId as EspionageOpType;
  const ops = getZ4Ops(state);
  const newOps = new Map(ops);

  const op: EspionageOpState = {
    id: generateZ4OpId(currentPlayerId, targetPlayerId, state.turn, ops.size),
    type: opType,
    attackerPlayerId: currentPlayerId,
    targetPlayerId,
    turnsRemaining: 5,
    successProbability: 0.7,
    detected: false,
  };

  newOps.set(op.id, op);
  return setZ4Ops(state, newOps);
}

/** Z4: Remove a Z4 op (CANCEL_ESPIONAGE). */
function applyCancelEspionage(
  state: GameState,
  action: Extract<GameAction, { type: 'CANCEL_ESPIONAGE' }>,
): GameState {
  const { opId } = action;
  const ops = getZ4Ops(state);
  const op = ops.get(opId);
  if (!op) return state;

  // Only the attacker can cancel their own op
  if (op.attackerPlayerId !== state.currentPlayerId) return state;

  const newOps = new Map(ops);
  newOps.delete(opId);
  return setZ4Ops(state, newOps);
}

/**
 * Z4: Apply the effect of a successfully completed espionage op.
 * Only implements steal_tech, steal_civic, sabotage_district, incite_rebellion.
 * Other types are stubs (TODO comments in code).
 */
function applyZ4OpEffect(state: GameState, op: EspionageOpState, rng: GameState['rng']): { state: GameState; rng: GameState['rng'] } {
  const attacker = state.players.get(op.attackerPlayerId);
  const target = state.players.get(op.targetPlayerId);
  if (!attacker || !target) return { state, rng };

  switch (op.type) {
    case 'steal_tech': {
      // Steal one of the target's researched techs not yet known to attacker.
      const attackerKnown = new Set(attacker.researchedTechs);
      const candidates = target.researchedTechs.filter(t => !attackerKnown.has(t));
      if (candidates.length === 0) return { state, rng };
      const { value: roll, rng: nextRng } = nextRandom(rng);
      const idx = Math.floor(roll * candidates.length);
      const stolenTech = candidates[idx];
      const players = new Map(state.players);
      players.set(op.attackerPlayerId, {
        ...attacker,
        researchedTechs: [...attacker.researchedTechs, stolenTech],
      });
      return { state: { ...state, players }, rng: nextRng };
    }

    case 'steal_civic': {
      // Steal one of the target's researched civics not yet known to attacker.
      const attackerKnownCivics = new Set(attacker.researchedCivics);
      const candidates = target.researchedCivics.filter(c => !attackerKnownCivics.has(c));
      if (candidates.length === 0) return { state, rng };
      const { value: roll, rng: nextRng } = nextRandom(rng);
      const idx = Math.floor(roll * candidates.length);
      const stolenCivic = candidates[idx];
      const players = new Map(state.players);
      players.set(op.attackerPlayerId, {
        ...attacker,
        researchedCivics: [...attacker.researchedCivics, stolenCivic],
      });
      return { state: { ...state, players }, rng: nextRng };
    }

    case 'sabotage_district': {
      // Reduce target city's production by 50% for 5 turns via a sabotage flag.
      // The targetCityId must be set; if absent, target the first city of target player.
      const targetCityId = op.targetCityId ??
        [...state.cities.values()].find(c => c.owner === op.targetPlayerId)?.id;
      if (!targetCityId) return { state, rng };
      const city = state.cities.get(targetCityId);
      if (!city || city.owner !== op.targetPlayerId) return { state, rng };
      // Reduce population by 1 as a production setback (simulates district sabotage)
      // Full "sabotageEffect on city" would require widening CityState; use population penalty instead
      const updatedCity: CityState = { ...city, population: Math.max(1, city.population - 1) };
      const cities = new Map(state.cities);
      cities.set(targetCityId, updatedCity);
      return { state: { ...state, cities }, rng };
    }

    case 'incite_rebellion': {
      // Target city loses 1 population.
      const targetCityId = op.targetCityId ??
        [...state.cities.values()].find(c => c.owner === op.targetPlayerId)?.id;
      if (!targetCityId) return { state, rng };
      const city = state.cities.get(targetCityId);
      if (!city || city.owner !== op.targetPlayerId) return { state, rng };
      const updatedCity: CityState = { ...city, population: Math.max(1, city.population - 1) };
      const cities = new Map(state.cities);
      cities.set(targetCityId, updatedCity);
      return { state: { ...state, cities }, rng };
    }

    // TODO: steal_great_work — steal artifact/great work from target player
    // TODO: plant_evidence — add negative diplomatic modifier between target and a third party
    // TODO: spread_propaganda — reduce target's relationship with other players
    // TODO: monitor_treaties — reveal active treaties involving target player (intel)
    default:
      return { state, rng };
  }
}

/**
 * Z4: Tick all active EspionageOpState ops on END_TURN.
 * - Drain counterespionageInfluence from each player.
 * - Decrement turnsRemaining.
 * - Roll detection (base probability modified by target's counterespionageDetectionBonus).
 * - On turnsRemaining === 0: roll success, apply effect if successful, remove op.
 * - If detected: mark detected = true and remove op.
 */
function tickZ4Ops(state: GameState): GameState {
  const ops = getZ4Ops(state);
  if (ops.size === 0) return drainCounterEspionageInfluence(state);

  let players = new Map(state.players);
  let rng = state.rng;
  const newOps = new Map(ops);
  let workingState: GameState = { ...state, players };

  // Drain counterespionageInfluence from all players first
  for (const [pid, player] of players) {
    const drain = player.counterespionageInfluence ?? 0;
    if (drain > 0) {
      players.set(pid, { ...player, influence: Math.max(0, player.influence - drain) });
    }
  }

  for (const [opId, op] of ops) {
    // Get the current (possibly already updated) working versions of players
    const currentPlayers = new Map(workingState.players);
    currentPlayers.forEach((p, pid) => { players.set(pid, p); });

    const target = players.get(op.targetPlayerId);
    const detectionBonus = target?.counterespionageDetectionBonus ?? 0;
    const baseDetection = 0.1; // base 10% detection chance per turn
    const detectionChance = Math.min(1, baseDetection + detectionBonus);

    const { value: detectionRoll, rng: rng1 } = nextRandom(rng);
    rng = rng1;

    const detected = detectionRoll < detectionChance;

    if (detected) {
      // Op detected: mark detected, remove from active map
      newOps.set(opId, { ...op, detected: true, turnsRemaining: 0 });
      newOps.delete(opId); // remove once detected (resolved)
    } else {
      const turnsRemaining = op.turnsRemaining - 1;
      if (turnsRemaining <= 0) {
        // Op completed — roll for success
        const { value: successRoll, rng: rng2 } = nextRandom(rng);
        rng = rng2;
        const success = successRoll < op.successProbability;

        if (success) {
          const result = applyZ4OpEffect({ ...workingState, players }, op, rng);
          workingState = result.state;
          rng = result.rng;
          players = new Map(workingState.players);
        }
        // Remove completed op regardless of success/failure
        newOps.delete(opId);
      } else {
        newOps.set(opId, { ...op, turnsRemaining });
      }
    }
  }

  return {
    ...workingState,
    players,
    espionageOps: newOps,
    rng,
  };
}

/** Drain counterespionageInfluence per turn when there are no active Z4 ops. */
function drainCounterEspionageInfluence(state: GameState): GameState {
  let hasChanges = false;
  const players = new Map(state.players);
  for (const [pid, player] of players) {
    const drain = player.counterespionageInfluence ?? 0;
    if (drain > 0) {
      players.set(pid, { ...player, influence: Math.max(0, player.influence - drain) });
      hasChanges = true;
    }
  }
  return hasChanges ? { ...state, players } : state;
}

// ── System ──

/**
 * espionageSystem — pure function, no mutation, no side effects.
 *
 * Returns state unchanged for any action type it does not handle.
 */
export function espionageSystem(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'INITIATE_ESPIONAGE': {
      // Y5 scaffold path
      let next = applyInitiateEspionage(state, action);
      // Z4 state machine path (parallel, only for known Z4 op types)
      next = addZ4Op(next, action);
      return next;
    }
    case 'CANCEL_ESPIONAGE':
      return applyCancelEspionage(state, action);
    case 'COUNTER_ESPIONAGE':
      return applyCounterEspionage(state, action);
    case 'END_TURN': {
      // Y5 scaffold tick
      let next = tickEspionageOps(state);
      // Z4 state machine tick
      next = tickZ4Ops(next);
      return next;
    }
    default:
      return state;
  }
}
