/**
 * treatySystem -- pure system for Treaty proposals (Y5, F-06) and
 * Influence-cost diplomatic actions (Y4).
 *
 * Handles:
 *  - PROPOSE_TREATY: validate treaty def, target, influence -> create ActiveTreaty (pending).
 *  - ACCEPT_TREATY: validate pending treaty targets current player -> set active.
 *  - REJECT_TREATY: validate pending treaty targets current player -> set rejected.
 *  - DENOUNCE_PLAYER (Y4.5): costs 5 Influence, relationship -20.
 *  - DECLARE_FRIENDSHIP (Y4.5): costs 5 Influence, relationship +10.
 *  - IMPOSE_EMBARGO (Y4.5): costs 10 Influence, sets hasEmbargo flag.
 *  - END_TURN:
 *      - Y4.2: per-player Influence (+1 base, +0.5 per treaty partner, +1 per embassy).
 *      - Y4.3: alliance science bonus (+1 Science/turn per alliance partner).
 *      - Y4.3: mutual war obligation -- if A is at war and B is allied with A, B enters war.
 *      - Tick active treaties -- decrement turnsRemaining, expire when 0.
 *
 * Export helpers:
 *  - canEstablishTrade(playerA, playerB, state): Y4.4 -- Neutral/Friendly + no embargo.
 *  - canCrossBorder(movingPlayerId, borderPlayerId, state): Y4.4 -- Neutral/Friendly or open borders.
 *
 * Import boundaries: only from ../types/ and ../state/.
 * No cross-system imports; no side effects; fully pure.
 */

import type { GameState, GameAction, GameEvent } from '../types/GameState';
import type { ActiveTreaty, TreatyDef, TreatyId } from '../types/Treaty';
import {
  getRelationKey,
  defaultRelation,
  getRelationshipTier,
  getRelationshipTierForPair,
  statusFromRelationship,
} from '../state/DiplomacyUtils';

// Re-export tier helpers so callers import from treatySystem
export { getRelationshipTier, getRelationshipTierForPair } from '../state/DiplomacyUtils';

// ---- Constants ----

const DENOUNCE_INFLUENCE_COST = 5;
const DECLARE_FRIENDSHIP_INFLUENCE_COST = 5;
const IMPOSE_EMBARGO_INFLUENCE_COST = 10;

const DENOUNCE_RELATIONSHIP_DELTA = -20;
const DECLARE_FRIENDSHIP_RELATIONSHIP_DELTA = 10;

/** Per-turn Influence baseline granted to every player (Y4.2). */
const INFLUENCE_BASE_PER_TURN = 1;
/** Per-turn bonus for each active bilateral treaty partner (Y4.2). */
const INFLUENCE_PER_TREATY_PARTNER = 0.5;
/** Per-turn bonus per embassy building owned (Y4.2). */
const INFLUENCE_PER_EMBASSY = 1;

/** Alliance science bonus per partner per turn (Y4.3). */
const ALLIANCE_SCIENCE_BONUS = 1;

// ---- Helpers ----

function getTreaties(state: GameState): ReadonlyArray<ActiveTreaty> {
  return state.diplomacy.activeTreaties ?? [];
}

function setTreaties(state: GameState, treaties: ReadonlyArray<ActiveTreaty>): GameState {
  return {
    ...state,
    diplomacy: { ...state.diplomacy, activeTreaties: treaties },
  };
}

/** Generate a unique runtime id for a treaty instance. */
function generateTreatyInstanceId(proposerId: string, targetId: string, treatyId: string, turn: number): string {
  return `treaty-${proposerId}-${targetId}-${treatyId}-${turn}`;
}

/** Look up a treaty definition from config. */
function findTreatyDef(state: GameState, treatyId: string): TreatyDef | undefined {
  return state.config.treaties?.get(treatyId);
}

/** Clamp relationship score to [-100, +100]. */
function clampRel(value: number): number {
  return Math.max(-100, Math.min(100, value));
}

/** Count the number of distinct active treaty partners that playerId has. */
function countTreatyPartners(playerId: string, treaties: ReadonlyArray<ActiveTreaty>): number {
  const partners = new Set<string>();
  for (const t of treaties) {
    if (t.status !== 'active') continue;
    if (t.proposerId === playerId) partners.add(t.targetId);
    else if (t.targetId === playerId) partners.add(t.proposerId);
  }
  return partners.size;
}

/** Count embassy buildings in a player's cities. */
function countEmbassies(playerId: string, state: GameState): number {
  let count = 0;
  for (const city of state.cities.values()) {
    if (city.owner === playerId && city.buildings.includes('embassy')) {
      count += 1;
    }
  }
  return count;
}

// ---- Y4.4 Trade/Border permission helpers ----

/**
 * Y4.4 -- Returns true when playerA can establish a trade route with playerB.
 *
 * Requirements:
 *  - Tier must be Neutral or better (not Unfriendly or Hostile).
 *  - No IMPOSE_EMBARGO active on the bilateral relation.
 */
export function canEstablishTrade(
  playerA: string,
  playerB: string,
  state: GameState,
): boolean {
  const key = getRelationKey(playerA, playerB);
  const rel = state.diplomacy.relations.get(key) ?? defaultRelation();

  // Embargo blocks trade regardless of tier
  if (rel.hasEmbargo) return false;

  const tier = getRelationshipTier(rel.relationship);
  return tier === 'Neutral' || tier === 'Friendly';
}

/**
 * Y4.4 -- Returns true when movingPlayerId can cross into territory
 * owned by borderPlayerId.
 *
 * Requirements (either):
 *  - Tier >= Neutral (Neutral or Friendly), OR
 *  - An active Open Borders treaty exists between the two players.
 */
export function canCrossBorder(
  movingPlayerId: string,
  borderPlayerId: string,
  state: GameState,
): boolean {
  if (movingPlayerId === borderPlayerId) return true;

  const key = getRelationKey(movingPlayerId, borderPlayerId);
  const rel = state.diplomacy.relations.get(key) ?? defaultRelation();
  const tier = getRelationshipTier(rel.relationship);

  if (tier === 'Neutral' || tier === 'Friendly') return true;

  // Check for an active Open Borders treaty
  const treaties = getTreaties(state);
  for (const t of treaties) {
    if (t.status !== 'active') continue;
    if (t.treatyId !== 'open_borders') continue;
    const involvedA = t.proposerId === movingPlayerId || t.targetId === movingPlayerId;
    const involvedB = t.proposerId === borderPlayerId || t.targetId === borderPlayerId;
    if (involvedA && involvedB) return true;
  }

  return false;
}

// ---- Reducers ----

function applyProposeTreaty(
  state: GameState,
  action: Extract<GameAction, { type: 'PROPOSE_TREATY' }>,
): GameState {
  const { targetPlayerId, treatyId, influenceSpent } = action;
  const currentPlayerId = state.currentPlayerId;
  const player = state.players.get(currentPlayerId);
  if (!player) return state;

  // Target must exist
  if (!state.players.has(targetPlayerId)) return state;
  // Cannot propose to self
  if (targetPlayerId === currentPlayerId) return state;

  // Treaty def must exist in config
  const treatyDef = findTreatyDef(state, treatyId);
  if (!treatyDef) return state;

  // Player must have sufficient influence
  if (player.influence < influenceSpent) return state;
  if (influenceSpent < treatyDef.influenceCost) return state;

  // Deduct influence
  const updatedPlayer = { ...player, influence: player.influence - influenceSpent };
  const players = new Map(state.players);
  players.set(currentPlayerId, updatedPlayer);

  // Create the treaty instance
  const treaty: ActiveTreaty = {
    id: generateTreatyInstanceId(currentPlayerId, targetPlayerId, treatyId, state.turn),
    treatyId: treatyId as TreatyId,
    proposerId: currentPlayerId,
    targetId: targetPlayerId,
    status: 'pending',
    proposedOnTurn: state.turn,
    activeSinceTurn: null,
    turnsRemaining: null,
  };

  return setTreaties(
    { ...state, players },
    [...getTreaties(state), treaty],
  );
}

function applyAcceptTreaty(
  state: GameState,
  action: Extract<GameAction, { type: 'ACCEPT_TREATY' }>,
): GameState {
  const { treatyId } = action;
  const currentPlayerId = state.currentPlayerId;

  // Find the pending treaty by its runtime id
  const treaties = getTreaties(state);
  const index = treaties.findIndex(t => t.id === treatyId);
  if (index === -1) return state;

  const treaty = treaties[index];

  // Must be pending
  if (treaty.status !== 'pending') return state;
  // Must target the current player (the acceptor is the target)
  if (treaty.targetId !== currentPlayerId) return state;

  // Look up treaty def for duration
  const treatyDef = findTreatyDef(state, treaty.treatyId);
  const duration = treatyDef?.durationTurns ?? 0;

  // Update to active
  const updated: ActiveTreaty = {
    ...treaty,
    status: 'active',
    activeSinceTurn: state.turn,
    turnsRemaining: duration > 0 ? duration : null,
  };

  const newTreaties = [...treaties];
  newTreaties[index] = updated;

  return setTreaties(state, newTreaties);
}

function applyRejectTreaty(
  state: GameState,
  action: Extract<GameAction, { type: 'REJECT_TREATY' }>,
): GameState {
  const { treatyId } = action;
  const currentPlayerId = state.currentPlayerId;

  const treaties = getTreaties(state);
  const index = treaties.findIndex(t => t.id === treatyId);
  if (index === -1) return state;

  const treaty = treaties[index];

  // Must be pending
  if (treaty.status !== 'pending') return state;
  // Must target the current player
  if (treaty.targetId !== currentPlayerId) return state;

  // Update to rejected
  const updated: ActiveTreaty = { ...treaty, status: 'rejected' };

  const newTreaties = [...treaties];
  newTreaties[index] = updated;

  return setTreaties(state, newTreaties);
}

// ---- Y4.5: Influence-cost diplomatic actions ----

function applyDenouncePlayer(
  state: GameState,
  action: Extract<GameAction, { type: 'DENOUNCE_PLAYER' }>,
): GameState {
  const { targetPlayerId } = action;
  const sourceId = state.currentPlayerId;

  if (sourceId === targetPlayerId) return state;
  if (!state.players.has(targetPlayerId)) return state;

  const player = state.players.get(sourceId)!;
  if (player.influence < DENOUNCE_INFLUENCE_COST) return state;

  const key = getRelationKey(sourceId, targetPlayerId);
  const rel = state.diplomacy.relations.get(key) ?? defaultRelation();
  const newRelScore = clampRel(rel.relationship + DENOUNCE_RELATIONSHIP_DELTA);

  const updatedRelations = new Map(state.diplomacy.relations);
  updatedRelations.set(key, {
    ...rel,
    relationship: newRelScore,
    status: statusFromRelationship(newRelScore),
  });

  const updatedPlayers = new Map(state.players);
  updatedPlayers.set(sourceId, { ...player, influence: player.influence - DENOUNCE_INFLUENCE_COST });

  return {
    ...state,
    players: updatedPlayers,
    diplomacy: { ...state.diplomacy, relations: updatedRelations },
    log: [...state.log, {
      turn: state.turn,
      playerId: sourceId,
      message: `Denounced ${targetPlayerId} (relationship -${Math.abs(DENOUNCE_RELATIONSHIP_DELTA)})`,
      type: 'diplomacy' as const,
      category: 'diplomatic' as const,
      panelTarget: 'diplomacy' as const,
    }],
  };
}

function applyDeclareFriendship(
  state: GameState,
  action: Extract<GameAction, { type: 'DECLARE_FRIENDSHIP' }>,
): GameState {
  const { targetPlayerId } = action;
  const sourceId = state.currentPlayerId;

  if (sourceId === targetPlayerId) return state;
  if (!state.players.has(targetPlayerId)) return state;

  const player = state.players.get(sourceId)!;
  if (player.influence < DECLARE_FRIENDSHIP_INFLUENCE_COST) return state;

  const key = getRelationKey(sourceId, targetPlayerId);
  const rel = state.diplomacy.relations.get(key) ?? defaultRelation();
  const newRelScore = clampRel(rel.relationship + DECLARE_FRIENDSHIP_RELATIONSHIP_DELTA);

  const updatedRelations = new Map(state.diplomacy.relations);
  updatedRelations.set(key, {
    ...rel,
    relationship: newRelScore,
    status: statusFromRelationship(newRelScore),
  });

  const updatedPlayers = new Map(state.players);
  updatedPlayers.set(sourceId, { ...player, influence: player.influence - DECLARE_FRIENDSHIP_INFLUENCE_COST });

  return {
    ...state,
    players: updatedPlayers,
    diplomacy: { ...state.diplomacy, relations: updatedRelations },
    log: [...state.log, {
      turn: state.turn,
      playerId: sourceId,
      message: `Declared friendship with ${targetPlayerId} (relationship +${DECLARE_FRIENDSHIP_RELATIONSHIP_DELTA})`,
      type: 'diplomacy' as const,
      category: 'diplomatic' as const,
      panelTarget: 'diplomacy' as const,
    }],
  };
}

function applyImposeEmbargo(
  state: GameState,
  action: Extract<GameAction, { type: 'IMPOSE_EMBARGO' }>,
): GameState {
  const { targetPlayerId } = action;
  const sourceId = state.currentPlayerId;

  if (sourceId === targetPlayerId) return state;
  if (!state.players.has(targetPlayerId)) return state;

  const player = state.players.get(sourceId)!;
  if (player.influence < IMPOSE_EMBARGO_INFLUENCE_COST) return state;

  const key = getRelationKey(sourceId, targetPlayerId);
  const rel = state.diplomacy.relations.get(key) ?? defaultRelation();

  const updatedRelations = new Map(state.diplomacy.relations);
  updatedRelations.set(key, { ...rel, hasEmbargo: true });

  const updatedPlayers = new Map(state.players);
  updatedPlayers.set(sourceId, { ...player, influence: player.influence - IMPOSE_EMBARGO_INFLUENCE_COST });

  return {
    ...state,
    players: updatedPlayers,
    diplomacy: { ...state.diplomacy, relations: updatedRelations },
    log: [...state.log, {
      turn: state.turn,
      playerId: sourceId,
      message: `Imposed trade embargo on ${targetPlayerId}`,
      type: 'diplomacy' as const,
      category: 'diplomatic' as const,
      panelTarget: 'diplomacy' as const,
    }],
  };
}

// ---- Y4.2: Per-turn Influence accumulation ----

/**
 * Apply per-turn Influence grants for all players.
 *
 * Each player gains:
 *  - +1 baseline per turn (INFLUENCE_BASE_PER_TURN)
 *  - +0.5 for each distinct partner with an active treaty
 *  - +1 for each city that contains an 'embassy' building
 *
 * This is additive with the city-based influence from resourceSystem.
 */
function applyInfluenceAccumulation(state: GameState): GameState {
  const treaties = getTreaties(state);
  const updatedPlayers = new Map(state.players);

  for (const [playerId, player] of state.players) {
    const partnerCount = countTreatyPartners(playerId, treaties);
    const embassyCount = countEmbassies(playerId, state);

    const bonus =
      INFLUENCE_BASE_PER_TURN +
      partnerCount * INFLUENCE_PER_TREATY_PARTNER +
      embassyCount * INFLUENCE_PER_EMBASSY;

    updatedPlayers.set(playerId, {
      ...player,
      influence: player.influence + bonus,
    });
  }

  return { ...state, players: updatedPlayers };
}

// ---- Y4.3: Alliance science bonus + mutual war ----

/**
 * Apply +1 Science/turn to all players who share an active alliance.
 * Alliance pairs are derived from DiplomacyRelation.hasAlliance.
 */
function applyAllianceScienceBonus(state: GameState): GameState {
  const alliancePairs: Array<[string, string]> = [];
  for (const [key, rel] of state.diplomacy.relations) {
    if (rel.hasAlliance) {
      const parts = key.split(':');
      const pA = parts[0];
      const pB = parts[1];
      if (pA && pB) alliancePairs.push([pA, pB]);
    }
  }

  if (alliancePairs.length === 0) return state;

  const updatedPlayers = new Map(state.players);

  for (const [pA, pB] of alliancePairs) {
    const playerA = updatedPlayers.get(pA);
    const playerB = updatedPlayers.get(pB);
    if (playerA) {
      updatedPlayers.set(pA, { ...playerA, science: playerA.science + ALLIANCE_SCIENCE_BONUS });
    }
    if (playerB) {
      updatedPlayers.set(pB, { ...playerB, science: playerB.science + ALLIANCE_SCIENCE_BONUS });
    }
  }

  return { ...state, players: updatedPlayers };
}

/**
 * Y4.3 -- Mutual war obligation: if player A is at war with player C, and
 * player B has an alliance with A, then B is automatically drawn into war with C.
 */
function applyMutualWarObligation(state: GameState): GameState {
  const relations = state.diplomacy.relations;
  let updatedRelations = new Map(relations);
  const newLogEntries: GameEvent[] = [];

  // Collect all active alliances: Map<playerId, Set<alliedPlayerId>>
  const alliances = new Map<string, Set<string>>();
  for (const [key, rel] of relations) {
    if (!rel.hasAlliance) continue;
    const parts = key.split(':');
    const a = parts[0];
    const b = parts[1];
    if (!a || !b) continue;
    if (!alliances.has(a)) alliances.set(a, new Set());
    if (!alliances.has(b)) alliances.set(b, new Set());
    alliances.get(a)!.add(b);
    alliances.get(b)!.add(a);
  }

  for (const [key, rel] of relations) {
    if (rel.status !== 'war') continue;
    const parts = key.split(':');
    const pA = parts[0];
    const pC = parts[1];
    if (!pA || !pC) continue;

    const belligerents = [pA, pC];
    for (const belligerent of belligerents) {
      const enemies = belligerents.filter(p => p !== belligerent);
      const allies = alliances.get(belligerent) ?? new Set<string>();

      for (const ally of allies) {
        for (const enemy of enemies) {
          if (ally === enemy) continue;
          const warKey = getRelationKey(ally, enemy);
          const existing = updatedRelations.get(warKey) ?? defaultRelation();
          if (existing.status === 'war') continue;

          updatedRelations.set(warKey, {
            ...existing,
            status: 'war',
            turnsAtWar: 0,
            turnsAtPeace: 0,
            warDeclarer: belligerent,
            isSurpriseWar: false,
          });

          newLogEntries.push({
            turn: state.turn,
            playerId: ally,
            message: `Alliance obligation: ${ally} enters war with ${enemy} to support ${belligerent}`,
            type: 'diplomacy' as const,
            category: 'diplomatic' as const,
            panelTarget: 'diplomacy' as const,
            severity: 'warning' as const,
          });
        }
      }
    }
  }

  if (newLogEntries.length === 0) return state;

  return {
    ...state,
    diplomacy: { ...state.diplomacy, relations: updatedRelations },
    log: [...state.log, ...newLogEntries],
  };
}

/**
 * Tick all active treaties on END_TURN:
 * - Decrement turnsRemaining for active treaties.
 * - Expire when turnsRemaining reaches 0 (duration > 0 only).
 */
function tickTreaties(state: GameState): GameState {
  const treaties = getTreaties(state);
  if (treaties.length === 0) return state;

  const newTreaties = treaties.map(t => {
    if (t.status !== 'active') return t;
    if (t.turnsRemaining === null) return t; // permanent treaty

    const remaining = t.turnsRemaining - 1;
    if (remaining <= 0) {
      return { ...t, turnsRemaining: 0, status: 'expired' as const };
    }
    return { ...t, turnsRemaining: remaining };
  });

  return setTreaties(state, newTreaties);
}

// ---- System ----

/**
 * treatySystem -- pure function, no mutation, no side effects.
 *
 * Returns state unchanged for any action type it does not handle.
 */
export function treatySystem(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'PROPOSE_TREATY':
      return applyProposeTreaty(state, action);
    case 'ACCEPT_TREATY':
      return applyAcceptTreaty(state, action);
    case 'REJECT_TREATY':
      return applyRejectTreaty(state, action);
    case 'DENOUNCE_PLAYER':
      return applyDenouncePlayer(state, action);
    case 'DECLARE_FRIENDSHIP':
      return applyDeclareFriendship(state, action);
    case 'IMPOSE_EMBARGO':
      return applyImposeEmbargo(state, action);
    case 'END_TURN': {
      let next = applyInfluenceAccumulation(state);
      next = applyAllianceScienceBonus(next);
      next = applyMutualWarObligation(next);
      next = tickTreaties(next);
      return next;
    }
    default:
      return state;
  }
}
