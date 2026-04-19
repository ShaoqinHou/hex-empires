import type { GameState, GameAction, DiplomacyRelation, DiplomaticStatus, DiplomaticEndeavor, DiplomaticSanction, Age } from '../types/GameState';
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
    action.type !== 'DIPLOMATIC_ENDEAVOR' &&
    action.type !== 'DIPLOMATIC_SANCTION'
  ) return state;

  const sourceId = state.currentPlayerId;
  const targetId = action.targetId;
  if (sourceId === targetId) return state;
  if (!state.players.has(targetId)) return state;

  // Handle DIPLOMATIC_ENDEAVOR
  if (action.type === 'DIPLOMATIC_ENDEAVOR') {
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
      // Peace requires war support near zero or negative for the loser
      // Simplified: auto-accepts if war has been going on > 5 turns or war support is near 0
      if (currentRelation.turnsAtWar < 5 && Math.abs(currentRelation.warSupport) > 20) {
        return {
          ...state,
          log: [...state.log, {
            turn: state.turn,
            playerId: sourceId,
            message: `Peace proposal rejected by ${targetId} (war support too high)`,
            type: 'diplomacy',
          }],
        };
      }
      const newRelationship = clampRelationship(currentRelation.relationship + 10);
      newRelation = {
        ...currentRelation,
        status: getStatusFromRelationship(newRelationship),
        turnsAtPeace: 0,
        turnsAtWar: 0,
        warSupport: 0,
        warDeclarer: null,
        isSurpriseWar: false,
        relationship: newRelationship,
      };
      logMessage = `Made peace with ${targetId}`;
      break;
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

    case 'PROPOSE_FRIENDSHIP': {
      if (currentRelation.status === 'war') return state;
      // Friendship requires at least neutral relationship (> -20)
      if (currentRelation.relationship < -20) {
        return {
          ...state,
          log: [...state.log, {
            turn: state.turn,
            playerId: sourceId,
            message: `Cannot establish friendship with ${targetId} (relationship too low)`,
            type: 'diplomacy',
          }],
        };
      }
      newRelation = {
        ...currentRelation,
        hasFriendship: true,
        hasDenounced: false,
        relationship: clampRelationship(currentRelation.relationship + 20),
      };
      newRelation = { ...newRelation, status: getStatusFromRelationship(newRelation.relationship) };
      logMessage = `Established friendship with ${targetId}`;
      break;
    }

    case 'DENOUNCE': {
      if (currentRelation.status === 'war') return state;
      newRelation = {
        ...currentRelation,
        hasDenounced: true,
        hasAlliance: false, // denounce breaks alliance
        hasFriendship: false, // denounce breaks friendship
        relationship: clampRelationship(currentRelation.relationship - 25),
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

  // Friendship / alliance proposals are noteworthy (warning) so the player notices the offer.
  const proposalSeverity =
    (action.type === 'PROPOSE_DIPLOMACY' &&
      (action.proposal.type === 'PROPOSE_FRIENDSHIP' || action.proposal.type === 'PROPOSE_ALLIANCE'))
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
        message: `Cannot conduct ${endeavorType} endeavor with ${targetId} (insufficient Influence, need ${cost})`,
        type: 'diplomacy',
      }],
    };
  }

  const relationKey = getRelationKey(sourceId, targetId);
  const currentRelation = state.diplomacy.relations.get(relationKey) ?? defaultRelation();

  const newEndeavor: DiplomaticEndeavor = { type: endeavorType, turnsRemaining: ENDEAVOR_DURATION, sourceId };
  const updatedRelation: DiplomacyRelation = {
    ...currentRelation,
    activeEndeavors: [...currentRelation.activeEndeavors, newEndeavor],
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
      message: `Conducted ${endeavorType} endeavor with ${targetId}`,
      type: 'diplomacy',
      category: 'diplomatic' as const,
      panelTarget: 'diplomacy' as const,
    }],
  };
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
