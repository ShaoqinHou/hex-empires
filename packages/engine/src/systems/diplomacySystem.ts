import type { GameState, GameAction, DiplomacyRelation } from '../types/GameState';

/**
 * DiplomacySystem handles diplomatic proposals between players.
 * Relations are stored as key "p1:p2" (alphabetically sorted).
 */
export function diplomacySystem(state: GameState, action: GameAction): GameState {
  if (action.type !== 'PROPOSE_DIPLOMACY') return state;

  const sourceId = state.currentPlayerId;
  const targetId = action.targetId;
  if (sourceId === targetId) return state;
  if (!state.players.has(targetId)) return state;

  const relationKey = getRelationKey(sourceId, targetId);
  const currentRelation = state.diplomacy.relations.get(relationKey) ?? defaultRelation();

  let newRelation: DiplomacyRelation;
  let logMessage: string;

  switch (action.proposal.type) {
    case 'DECLARE_WAR':
      if (currentRelation.status === 'war') return state; // already at war
      newRelation = {
        ...currentRelation,
        status: 'war',
        turnsAtWar: 0,
        turnsAtPeace: 0,
        grievances: currentRelation.grievances + 20,
      };
      logMessage = `Declared war on ${targetId}`;
      break;

    case 'PROPOSE_PEACE':
      if (currentRelation.status !== 'war') return state;
      // AI auto-accepts if grievances are low enough (simplified)
      if (currentRelation.grievances > 30) {
        return {
          ...state,
          log: [...state.log, {
            turn: state.turn,
            playerId: sourceId,
            message: `Peace proposal rejected by ${targetId} (grievances too high)`,
            type: 'diplomacy',
          }],
        };
      }
      newRelation = {
        ...currentRelation,
        status: 'peace',
        turnsAtPeace: 0,
        turnsAtWar: 0,
      };
      logMessage = `Made peace with ${targetId}`;
      break;

    case 'PROPOSE_ALLIANCE':
      if (currentRelation.status === 'war') return state;
      newRelation = {
        ...currentRelation,
        status: 'alliance',
      };
      logMessage = `Formed alliance with ${targetId}`;
      break;

    case 'PROPOSE_FRIENDSHIP':
      if (currentRelation.status === 'war') return state;
      newRelation = {
        ...currentRelation,
        status: 'friendship',
      };
      logMessage = `Established friendship with ${targetId}`;
      break;

    case 'DENOUNCE':
      if (currentRelation.status === 'war') return state;
      newRelation = {
        ...currentRelation,
        status: 'denounced',
        grievances: currentRelation.grievances + 10,
      };
      logMessage = `Denounced ${targetId}`;
      break;

    default:
      return state;
  }

  const updatedRelations = new Map(state.diplomacy.relations);
  updatedRelations.set(relationKey, newRelation);

  return {
    ...state,
    diplomacy: { relations: updatedRelations },
    log: [...state.log, {
      turn: state.turn,
      playerId: sourceId,
      message: logMessage,
      type: 'diplomacy',
    }],
  };
}

function getRelationKey(a: string, b: string): string {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}

function defaultRelation(): DiplomacyRelation {
  return {
    status: 'peace',
    grievances: 0,
    turnsAtPeace: 0,
    turnsAtWar: 0,
  };
}

/** Update diplomacy turn counters (called on END_TURN by the system pipeline) */
export function updateDiplomacyCounters(state: GameState, action: GameAction): GameState {
  if (action.type !== 'END_TURN') return state;

  const updatedRelations = new Map<string, DiplomacyRelation>();
  let changed = false;

  for (const [key, rel] of state.diplomacy.relations) {
    const updated = { ...rel };
    if (rel.status === 'war') {
      updated.turnsAtWar = rel.turnsAtWar + 1;
      // Grievances decay slowly during war
      updated.grievances = Math.max(0, rel.grievances - 1);
    } else {
      updated.turnsAtPeace = rel.turnsAtPeace + 1;
      // Grievances decay faster during peace
      updated.grievances = Math.max(0, rel.grievances - 2);
    }
    updatedRelations.set(key, updated);
    changed = true;
  }

  if (!changed) return state;
  return { ...state, diplomacy: { relations: updatedRelations } };
}
