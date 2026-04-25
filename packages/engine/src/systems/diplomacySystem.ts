import type { GameState, GameAction, DiplomacyRelation, DiplomaticStatus, DiplomaticEndeavor, DiplomaticSanction, Age, PendingEndeavor, ActiveEffect, PeaceOffer } from '../types/GameState';
import { getRelationKey, defaultRelation } from '../state/DiplomacyUtils';

/**
 * DiplomacySystem handles diplomatic proposals between players.
 * Relations are stored as key "p1:p2" (alphabetically sorted).
 *
 * Civ VII-style diplomacy:
 * - Relationship score (-100 to +100) drives diplomatic status stages
 * - War Support replaces grievances (attacker/defender advantage)
 * - Formal war requires hostile relationship; surprise war gives defender war support
 * - Alliance requires helpful status (relationship > 60)
 */
/** Base cost in Influence for diplomatic endeavors and sanctions (Antiquity). */
const ENDEAVOR_INFLUENCE_COST = 50;
const SANCTION_INFLUENCE_COST = 50;

/** Influence cost to declare a formal war (§11.1, §11.4). */
const FORMAL_WAR_INFLUENCE_COST = 100;
/** Influence cost to declare a surprise war — strictly higher than formal. */
const SURPRISE_WAR_INFLUENCE_COST = 200;

/** Duration in turns for endeavors and sanctions */
const ENDEAVOR_DURATION = 10;
const SANCTION_DURATION = 10;

/**
 * Age multiplier for diplomacy costs (§11.3):
 *   Antiquity ×1, Exploration ×2, Modern ×3.
 */
function ageCostMultiplier(age: Age): number {
  if (age === 'exploration') return 2;
  if (age === 'modern') return 3;
  return 1;
}

export function diplomacySystem(state: GameState, action: GameAction): GameState {
  if (
    action.type !== 'PROPOSE_DIPLOMACY' &&
    action.type !== 'PROPOSE_ENDEAVOR' &&
    action.type !== 'RESPOND_ENDEAVOR' &&
    action.type !== 'DIPLOMATIC_SANCTION' &&
    action.type !== 'ACCEPT_PEACE' &&
    action.type !== 'REJECT_PEACE'
  ) return state;

  // ── F-13: ACCEPT_PEACE ──
  if (action.type === 'ACCEPT_PEACE') {
    return handleAcceptPeace(state, action.offerId);
  }

  // ── F-13: REJECT_PEACE ──
  if (action.type === 'REJECT_PEACE') {
    return handleRejectPeace(state, action.offerId);
  }

  // Handle RESPOND_ENDEAVOR (target player responds to a pending endeavor)
  if (action.type === 'RESPOND_ENDEAVOR') {
    return handleRespondEndeavor(state, action.endeavorId, action.response);
  }

  const sourceId = state.currentPlayerId;
  const targetId = action.targetId;
  if (sourceId === targetId) return state;
  if (!state.players.has(targetId)) return state;

  // Handle PROPOSE_ENDEAVOR (step 1 of 2-step endeavor flow)
  if (action.type === 'PROPOSE_ENDEAVOR') {
    return handleEndeavor(state, sourceId, targetId, action.endeavorType);
  }

  // Handle DIPLOMATIC_SANCTION
  if (action.type === 'DIPLOMATIC_SANCTION') {
    return handleSanction(state, sourceId, targetId, action.sanctionType);
  }

  const relationKey = getRelationKey(sourceId, targetId);
  const currentRelation = state.diplomacy.relations.get(relationKey) ?? defaultRelation();

  let newRelation: DiplomacyRelation;
  let logMessage: string;

  switch (action.proposal.type) {
    case 'DECLARE_WAR': {
      if (currentRelation.status === 'war') return state; // already at war

      const warType = action.proposal.warType;

      // Formal war requires hostile relationship (relationship < -60)
      if (warType === 'formal' && currentRelation.relationship > -60) {
        return {
          ...state,
          log: [...state.log, {
            turn: state.turn,
            playerId: sourceId,
            message: `Cannot declare formal war on ${targetId} (relationship not hostile enough)`,
            type: 'diplomacy',
          }],
        };
      }

      // Surprise war: any relationship but gives defender war support
      const isSurprise = warType === 'surprise';

      // §11.1 — Influence is spent on all diplomatic actions. Surprise war
      // (§11.4) costs strictly more than formal war.
      const warCost = isSurprise ? SURPRISE_WAR_INFLUENCE_COST : FORMAL_WAR_INFLUENCE_COST;
      const sourcePlayer = state.players.get(sourceId)!;
      if (sourcePlayer.influence < warCost) {
        return {
          ...state,
          log: [...state.log, {
            turn: state.turn,
            playerId: sourceId,
            message: `Cannot declare ${warType} war on ${targetId} (insufficient Influence, need ${warCost})`,
            type: 'diplomacy',
          }],
        };
      }

      const warSupportChange = isSurprise ? -50 : 0; // negative = defender advantage

      newRelation = {
        ...currentRelation,
        status: 'war',
        turnsAtWar: 0,
        turnsAtPeace: 0,
        warSupport: clampWarSupport(currentRelation.warSupport + warSupportChange),
        hasAlliance: false,  // war breaks alliance
        hasFriendship: false, // war breaks friendship
        hasDenounced: false,
        warDeclarer: sourceId,
        isSurpriseWar: isSurprise,
        // Relationship drops significantly on war
        relationship: clampRelationship(currentRelation.relationship - 40),
      };

      // Deduct Influence for the declaration.
      const updatedRelations = new Map(state.diplomacy.relations);
      updatedRelations.set(relationKey, newRelation);
      const updatedPlayers = new Map(state.players);
      updatedPlayers.set(sourceId, { ...sourcePlayer, influence: sourcePlayer.influence - warCost });
      return {
        ...state,
        players: updatedPlayers,
        diplomacy: { relations: updatedRelations },
        log: [...state.log, {
          turn: state.turn,
          playerId: sourceId,
          message: `Declared ${warType} war on ${targetId}`,
          type: 'diplomacy' as const,
          category: 'diplomatic' as const,
          panelTarget: 'diplomacy' as const,
          // Surprise war declared ON this player is critical and blocks turn; formal war is just warning
          severity: isSurprise ? 'critical' as const : 'warning' as const,
          blocksTurn: isSurprise ? true as const : undefined,
        }],
      };
    }

    case 'PROPOSE_PEACE': {
      if (currentRelation.status !== 'war') return state;

      // ── F-13: Check peace cooldown ──
      if (
        currentRelation.peaceCooldownUntilTurn !== undefined &&
        state.turn < currentRelation.peaceCooldownUntilTurn
      ) {
        return {
          ...state,
          log: [...state.log, {
            turn: state.turn,
            playerId: sourceId,
            message: `Cannot propose peace to ${targetId} yet (peace cooldown until turn ${currentRelation.peaceCooldownUntilTurn})`,
            type: 'diplomacy' as const,
          }],
        };
      }

      // ── F-13: Create a pending bilateral peace offer ──
      const existingOffers = state.diplomacy.pendingPeaceOffers ?? [];
      // Prevent duplicate offers between the same pair this turn
      const alreadyPending = existingOffers.some(
        o => (o.proposerId === sourceId && o.targetId === targetId) ||
             (o.proposerId === targetId && o.targetId === sourceId)
      );
      if (alreadyPending) {
        return {
          ...state,
          log: [...state.log, {
            turn: state.turn,
            playerId: sourceId,
            message: `A peace offer between you and ${targetId} is already pending`,
            type: 'diplomacy' as const,
          }],
        };
      }

      const offerId = `peace:${sourceId}:${targetId}:t${state.turn}`;
      const newOffer: PeaceOffer = {
        id: offerId,
        proposerId: sourceId,
        targetId,
        proposedOnTurn: state.turn,
      };

      return {
        ...state,
        diplomacy: {
          ...state.diplomacy,
          pendingPeaceOffers: [...existingOffers, newOffer],
        },
        log: [...state.log, {
          turn: state.turn,
          playerId: sourceId,
          message: `Proposed peace to ${targetId}`,
          type: 'diplomacy' as const,
          category: 'diplomatic' as const,
          panelTarget: 'diplomacy' as const,
          severity: 'warning' as const,
          blocksTurn: true as const,
        }],
      };
    }

    case 'PROPOSE_ALLIANCE': {
      if (currentRelation.status === 'war') return state;
      // Alliance requires helpful status (relationship > 60)
      if (currentRelation.relationship <= 60) {
        return {
          ...state,
          log: [...state.log, {
            turn: state.turn,
            playerId: sourceId,
            message: `Cannot form alliance with ${targetId} (relationship not high enough, need > 60)`,
            type: 'diplomacy',
          }],
        };
      }
      newRelation = {
        ...currentRelation,
        hasAlliance: true,
        hasFriendship: true, // alliance implies friendship
        hasDenounced: false,
        relationship: clampRelationship(currentRelation.relationship + 15),
      };
      newRelation = { ...newRelation, status: getStatusFromRelationship(newRelation.relationship) };
      logMessage = `Formed alliance with ${targetId}`;
      break;
    }

    case 'DENOUNCE': {
      if (currentRelation.status === 'war') return state;
      newRelation = {
        ...currentRelation,
        hasDenounced: true,
        hasAlliance: false, // denounce breaks alliance
        hasFriendship: false, // denounce breaks friendship
        relationship: clampRelationship(currentRelation.relationship - 60),
      };
      newRelation = { ...newRelation, status: getStatusFromRelationship(newRelation.relationship) };
      logMessage = `Denounced ${targetId}`;
      break;
    }

    default:
      return state;
  }

  const updatedRelations = new Map(state.diplomacy.relations);
  updatedRelations.set(relationKey, newRelation);

  // Alliance proposals are noteworthy (warning) so the player notices the offer.
  const proposalSeverity =
    (action.type === 'PROPOSE_DIPLOMACY' && action.proposal.type === 'PROPOSE_ALLIANCE')
      ? 'warning' as const
      : 'info' as const;

  return {
    ...state,
    diplomacy: { relations: updatedRelations },
    log: [...state.log, {
      turn: state.turn,
      playerId: sourceId,
      message: logMessage,
      type: 'diplomacy',
      severity: proposalSeverity,
      category: 'diplomatic' as const,
      panelTarget: 'diplomacy' as const,
    }],
  };
}

/** Derive the diplomatic status stage from relationship score */
export function getStatusFromRelationship(relationship: number): DiplomaticStatus {
  if (relationship > 60) return 'helpful';
  if (relationship > 20) return 'friendly';
  if (relationship >= -20) return 'neutral';
  if (relationship >= -60) return 'unfriendly';
  return 'hostile';
}

// getRelationKey and defaultRelation live in ../state/DiplomacyUtils — re-exported
// for backwards-compat with any consumer that imported them from here.
export { getRelationKey, defaultRelation } from '../state/DiplomacyUtils';

function clampRelationship(value: number): number {
  return Math.max(-100, Math.min(100, value));
}

function clampWarSupport(value: number): number {
  return Math.max(-100, Math.min(100, value));
}

/**
 * F-04 STEP 1: PROPOSE_ENDEAVOR creates a pending endeavor.
 * Influence is deducted immediately. Target must respond via RESPOND_ENDEAVOR.
 */
function handleEndeavor(state: GameState, sourceId: string, targetId: string, endeavorType: string): GameState {
  const sourcePlayer = state.players.get(sourceId)!;

  // §11.3: base cost × Age multiplier (Antiquity ×1, Exploration ×2, Modern ×3).
  const cost = ENDEAVOR_INFLUENCE_COST * ageCostMultiplier(state.age.currentAge);

  // Check influence cost
  if (sourcePlayer.influence < cost) {
    return {
      ...state,
      log: [...state.log, {
        turn: state.turn,
        playerId: sourceId,
        message: `Cannot propose ${endeavorType} endeavor to ${targetId} (insufficient Influence, need ${cost})`,
        type: 'diplomacy',
      }],
    };
  }

  // Generate a deterministic endeavor id
  const pending = state.diplomacy.pendingEndeavors ?? [];
  const endeavorId = `${sourceId}:${targetId}:${endeavorType}:t${state.turn}:${pending.length}`;

  const newPending: PendingEndeavor = {
    id: endeavorId,
    sourceId,
    targetId,
    endeavorType,
    influenceCost: cost,
  };

  const updatedPlayers = new Map(state.players);
  updatedPlayers.set(sourceId, { ...sourcePlayer, influence: sourcePlayer.influence - cost });

  return {
    ...state,
    players: updatedPlayers,
    diplomacy: {
      ...state.diplomacy,
      pendingEndeavors: [...pending, newPending],
    },
    log: [...state.log, {
      turn: state.turn,
      playerId: sourceId,
      message: `Proposed ${endeavorType} endeavor to ${targetId}`,
      type: 'diplomacy',
      category: 'diplomatic' as const,
      panelTarget: 'diplomacy' as const,
    }],
  };
}

/** Relationship delta for accept (standard) / support (bigger) / reject (negative). */
const RELATIONSHIP_DELTA_ACCEPT = 5;
const RELATIONSHIP_DELTA_SUPPORT = 10;
const RELATIONSHIP_DELTA_REJECT = -10;

/**
 * F-04: Influence drain on the proposer (sourceId) when their endeavor is rejected.
 * Represents the diplomatic cost of a failed initiative.
 */
const ENDEAVOR_REJECT_INFLUENCE_DRAIN = 10;

/**
 * F-04 STEP 2: RESPOND_ENDEAVOR resolves a pending endeavor.
 * - accept: activates the endeavor with standard relationship delta
 * - support: activates the endeavor with bigger relationship delta + both players gain benefit
 * - reject: removes the pending endeavor, negative relationship delta
 */
function handleRespondEndeavor(state: GameState, endeavorId: string, response: 'support' | 'accept' | 'reject'): GameState {
  const pending = state.diplomacy.pendingEndeavors ?? [];
  const idx = pending.findIndex(e => e.id === endeavorId);
  if (idx === -1) return state; // not found

  const endeavor = pending[idx];

  // Only the target player can respond
  if (state.currentPlayerId !== endeavor.targetId) return state;

  // Remove from pending
  const updatedPending = pending.filter((_, i) => i !== idx);

  const relationKey = getRelationKey(endeavor.sourceId, endeavor.targetId);
  const currentRelation = state.diplomacy.relations.get(relationKey) ?? defaultRelation();
  const updatedRelations = new Map(state.diplomacy.relations);

  let logMessage: string;

  if (response === 'reject') {
    // Rejection: negative relationship delta, no active endeavor created,
    // and source player (proposer) loses Influence for the failed initiative.
    const newRelationship = clampRelationship(currentRelation.relationship + RELATIONSHIP_DELTA_REJECT);
    updatedRelations.set(relationKey, {
      ...currentRelation,
      relationship: newRelationship,
      status: getStatusFromRelationship(newRelationship),
    });

    // Drain Influence from the proposer
    const updatedPlayers = new Map(state.players);
    const sourcePlayer = updatedPlayers.get(endeavor.sourceId);
    if (sourcePlayer) {
      updatedPlayers.set(endeavor.sourceId, {
        ...sourcePlayer,
        influence: Math.max(0, sourcePlayer.influence - ENDEAVOR_REJECT_INFLUENCE_DRAIN),
      });
    }

    return {
      ...state,
      players: updatedPlayers,
      diplomacy: {
        ...state.diplomacy,
        relations: updatedRelations,
        pendingEndeavors: updatedPending,
      },
      log: [...state.log, {
        turn: state.turn,
        playerId: state.currentPlayerId,
        message: `Rejected ${endeavor.endeavorType} endeavor from ${endeavor.sourceId} (proposer loses ${ENDEAVOR_REJECT_INFLUENCE_DRAIN} Influence)`,
        type: 'diplomacy',
        category: 'diplomatic' as const,
        panelTarget: 'diplomacy' as const,
      }],
    };
  } else {
    // Accept or Support: activate the endeavor
    const delta = response === 'support' ? RELATIONSHIP_DELTA_SUPPORT : RELATIONSHIP_DELTA_ACCEPT;
    const newRelationship = clampRelationship(currentRelation.relationship + delta);
    const newEndeavor: DiplomaticEndeavor = { type: endeavor.endeavorType, turnsRemaining: ENDEAVOR_DURATION, sourceId: endeavor.sourceId };

    updatedRelations.set(relationKey, {
      ...currentRelation,
      relationship: newRelationship,
      status: getStatusFromRelationship(newRelationship),
      activeEndeavors: [...currentRelation.activeEndeavors, newEndeavor],
    });

    const responseLabel = response === 'support' ? 'Supported' : 'Accepted';
    logMessage = `${responseLabel} ${endeavor.endeavorType} endeavor from ${endeavor.sourceId}`;
  }

  let next: GameState = {
    ...state,
    diplomacy: {
      ...state.diplomacy,
      relations: updatedRelations,
      pendingEndeavors: updatedPending,
    },
    log: [...state.log, {
      turn: state.turn,
      playerId: state.currentPlayerId,
      message: logMessage,
      type: 'diplomacy',
      category: 'diplomatic' as const,
      panelTarget: 'diplomacy' as const,
    }],
  };

  // Support: both players gain a benefit (ActiveEffect)
  if (response === 'support') {
    const benefit: ActiveEffect = {
      source: `endeavor_support:${endeavor.id}`,
      effect: {
        type: 'MODIFY_YIELD',
        target: 'empire',
        yield: 'culture',
        value: 1,
      },
    };

    const updatedPlayers = new Map(next.players);
    for (const pid of [endeavor.sourceId, endeavor.targetId]) {
      const p = updatedPlayers.get(pid);
      if (p) {
        updatedPlayers.set(pid, {
          ...p,
          legacyBonuses: [...p.legacyBonuses, benefit],
        });
      }
    }
    next = { ...next, players: updatedPlayers };
  }

  return next;
}

function handleSanction(state: GameState, sourceId: string, targetId: string, sanctionType: string): GameState {
  const sourcePlayer = state.players.get(sourceId)!;

  // §11.3: base cost × Age multiplier (Antiquity ×1, Exploration ×2, Modern ×3).
  const cost = SANCTION_INFLUENCE_COST * ageCostMultiplier(state.age.currentAge);

  // Check influence cost
  if (sourcePlayer.influence < cost) {
    return {
      ...state,
      log: [...state.log, {
        turn: state.turn,
        playerId: sourceId,
        message: `Cannot impose ${sanctionType} sanction on ${targetId} (insufficient Influence, need ${cost})`,
        type: 'diplomacy',
      }],
    };
  }

  const relationKey = getRelationKey(sourceId, targetId);
  const currentRelation = state.diplomacy.relations.get(relationKey) ?? defaultRelation();

  const newSanction: DiplomaticSanction = { type: sanctionType, turnsRemaining: SANCTION_DURATION, targetId };
  const updatedRelation: DiplomacyRelation = {
    ...currentRelation,
    activeSanctions: [...currentRelation.activeSanctions, newSanction],
  };

  const updatedRelations = new Map(state.diplomacy.relations);
  updatedRelations.set(relationKey, updatedRelation);

  const updatedPlayers = new Map(state.players);
  updatedPlayers.set(sourceId, { ...sourcePlayer, influence: sourcePlayer.influence - cost });

  return {
    ...state,
    players: updatedPlayers,
    diplomacy: { relations: updatedRelations },
    log: [...state.log, {
      turn: state.turn,
      playerId: sourceId,
      message: `Imposed ${sanctionType} sanction on ${targetId}`,
      type: 'diplomacy',
      category: 'diplomatic' as const,
      panelTarget: 'diplomacy' as const,
    }],
  };
}

// ── F-13: Bilateral peace resolution ──

/** Number of turns before another PROPOSE_PEACE is allowed after REJECT_PEACE. */
const PEACE_COOLDOWN_TURNS = 5;

/**
 * ACCEPT_PEACE: current player accepts the pending peace offer targetted at them.
 * - Ends the war between the two players (sets status based on new relationship).
 * - Optionally transfers cities listed in offer.terms.cityTransfers.
 * - Removes the resolved offer from pendingPeaceOffers.
 */
function handleAcceptPeace(state: GameState, offerId: string): GameState {
  const offers = state.diplomacy.pendingPeaceOffers ?? [];
  const offerIdx = offers.findIndex(o => o.id === offerId);
  if (offerIdx === -1) return state;

  const offer = offers[offerIdx];

  // Only the target of the offer can accept it
  if (state.currentPlayerId !== offer.targetId) return state;

  const relationKey = getRelationKey(offer.proposerId, offer.targetId);
  const currentRelation = state.diplomacy.relations.get(relationKey) ?? defaultRelation();
  if (currentRelation.status !== 'war') return state;

  const newRelationship = clampRelationship(currentRelation.relationship + 10);
  const updatedRelation: DiplomacyRelation = {
    ...currentRelation,
    status: getStatusFromRelationship(newRelationship),
    turnsAtPeace: 0,
    turnsAtWar: 0,
    warSupport: 0,
    warDeclarer: null,
    isSurpriseWar: false,
    relationship: newRelationship,
    peaceCooldownUntilTurn: undefined,
  };

  const updatedRelations = new Map(state.diplomacy.relations);
  updatedRelations.set(relationKey, updatedRelation);

  const remainingOffers = offers.filter((_, i) => i !== offerIdx);

  let nextState: GameState = {
    ...state,
    diplomacy: {
      ...state.diplomacy,
      relations: updatedRelations,
      pendingPeaceOffers: remainingOffers,
    },
    log: [...state.log, {
      turn: state.turn,
      playerId: state.currentPlayerId,
      message: `Accepted peace from ${offer.proposerId}`,
      type: 'diplomacy' as const,
      category: 'diplomatic' as const,
      panelTarget: 'diplomacy' as const,
    }],
  };

  // Apply any city transfers from the offer terms
  if (offer.terms?.cityTransfers && offer.terms.cityTransfers.length > 0) {
    const updatedCities = new Map(nextState.cities);
    for (const cityId of offer.terms.cityTransfers) {
      const city = updatedCities.get(cityId);
      if (city && city.owner === offer.proposerId) {
        updatedCities.set(cityId, { ...city, owner: offer.targetId });
      }
    }
    nextState = { ...nextState, cities: updatedCities };
  }

  return nextState;
}

/**
 * REJECT_PEACE: current player rejects the pending peace offer targetted at them.
 * - War continues unchanged.
 * - Imposes a PEACE_COOLDOWN_TURNS cooldown before a new PROPOSE_PEACE can be made.
 * - Removes the resolved offer from pendingPeaceOffers.
 */
function handleRejectPeace(state: GameState, offerId: string): GameState {
  const offers = state.diplomacy.pendingPeaceOffers ?? [];
  const offerIdx = offers.findIndex(o => o.id === offerId);
  if (offerIdx === -1) return state;

  const offer = offers[offerIdx];

  // Only the target of the offer can reject it
  if (state.currentPlayerId !== offer.targetId) return state;

  const relationKey = getRelationKey(offer.proposerId, offer.targetId);
  const currentRelation = state.diplomacy.relations.get(relationKey) ?? defaultRelation();

  const updatedRelation: DiplomacyRelation = {
    ...currentRelation,
    peaceCooldownUntilTurn: state.turn + PEACE_COOLDOWN_TURNS,
  };

  const updatedRelations = new Map(state.diplomacy.relations);
  updatedRelations.set(relationKey, updatedRelation);

  const remainingOffers = offers.filter((_, i) => i !== offerIdx);

  return {
    ...state,
    diplomacy: {
      ...state.diplomacy,
      relations: updatedRelations,
      pendingPeaceOffers: remainingOffers,
    },
    log: [...state.log, {
      turn: state.turn,
      playerId: state.currentPlayerId,
      message: `Rejected peace from ${offer.proposerId} (cooldown: ${PEACE_COOLDOWN_TURNS} turns)`,
      type: 'diplomacy' as const,
      category: 'diplomatic' as const,
      panelTarget: 'diplomacy' as const,
    }],
  };
}

/** Update diplomacy turn counters (called on END_TURN by the system pipeline) */
export function updateDiplomacyCounters(state: GameState, action: GameAction): GameState {
  if (action.type !== 'END_TURN') return state;

  const updatedRelations = new Map<string, DiplomacyRelation>();
  let changed = false;

  for (const [key, rel] of state.diplomacy.relations) {
    let updated = { ...rel };
    if (rel.status === 'war') {
      updated.turnsAtWar = rel.turnsAtWar + 1;
      // War support decays toward 0 over time (by 5 per turn)
      if (rel.warSupport > 0) {
        updated.warSupport = Math.max(0, rel.warSupport - 5);
      } else if (rel.warSupport < 0) {
        updated.warSupport = Math.min(0, rel.warSupport + 5);
      }
    } else {
      updated.turnsAtPeace = rel.turnsAtPeace + 1;
      // Relationship naturally drifts toward 0 during peace (by 1 per turn)
      if (rel.relationship > 0 && !rel.hasFriendship && !rel.hasAlliance) {
        updated.relationship = Math.max(0, rel.relationship - 1);
      } else if (rel.relationship < 0 && !rel.hasDenounced) {
        updated.relationship = Math.min(0, rel.relationship + 1);
      }
      // Friendship/alliance improves relationship over time (+1 per turn)
      if (rel.hasFriendship || rel.hasAlliance) {
        updated.relationship = clampRelationship(rel.relationship + 1);
      }
      // Denouncement degrades relationship over time (-1 per turn)
      if (rel.hasDenounced) {
        updated.relationship = clampRelationship(rel.relationship - 1);
      }
      // Update status based on new relationship
      updated.status = getStatusFromRelationship(updated.relationship);
    }

    // Decrement endeavor turns and remove expired ones
    const updatedEndeavors = rel.activeEndeavors
      .map(e => ({ ...e, turnsRemaining: e.turnsRemaining - 1 }))
      .filter(e => e.turnsRemaining > 0);
    updated.activeEndeavors = updatedEndeavors;

    // Decrement sanction turns and remove expired ones
    const updatedSanctions = rel.activeSanctions
      .map(s => ({ ...s, turnsRemaining: s.turnsRemaining - 1 }))
      .filter(s => s.turnsRemaining > 0);
    updated.activeSanctions = updatedSanctions;

    updatedRelations.set(key, updated);
    changed = true;
  }

  if (!changed) return state;
  return { ...state, diplomacy: { relations: updatedRelations } };
}
