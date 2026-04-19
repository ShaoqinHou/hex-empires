import type { GameState } from '../types/GameState';
import type { NarrativeEventDef } from '../types/NarrativeEvent';

/**
 * Check whether a narrative event's age gate allows it to fire in the current age.
 * Returns true if there is no age gate OR the current age matches.
 */
export function isAgeGateOpen(def: NarrativeEventDef, state: GameState): boolean {
  if (!def.ageGate) return true;
  return state.age.currentAge === def.ageGate;
}

/**
 * Enqueue a discovery-triggered narrative event.
 * Called by movementSystem when a unit steps on a discoveryId tile.
 * Respects the dedup guard and age gate; safe to call even if the event was already fired.
 */
export function enqueueDiscoveryEvent(state: GameState, narrativeEventId: string): GameState {
  const fired = state.firedNarrativeEvents ?? [];
  if (fired.includes(narrativeEventId)) return state;

  const def = state.config.narrativeEvents?.get(narrativeEventId);
  if (!def) return state;

  if (!isAgeGateOpen(def, state)) return state;

  const player = state.players.get(state.currentPlayerId);
  if (!player) return state;

  const tags = player.narrativeTags ?? [];

  if (def.requirements.requiresTags) {
    for (const t of def.requirements.requiresTags) {
      if (!tags.includes(t)) return state;
    }
  }

  if (def.requirements.excludesTags) {
    for (const t of def.requirements.excludesTags) {
      if (tags.includes(t)) return state;
    }
  }

  if (def.requirements.leaderId && player.leaderId !== def.requirements.leaderId) return state;
  if (def.requirements.civId && player.civilizationId !== def.requirements.civId) return state;

  return {
    ...state,
    pendingNarrativeEvents: [...(state.pendingNarrativeEvents ?? []), narrativeEventId],
    firedNarrativeEvents: [...fired, narrativeEventId],
    log: [...state.log, {
      turn: state.turn,
      playerId: state.currentPlayerId,
      message: `Discovery: ${def.title}`,
      type: 'crisis' as const,
      severity: 'warning' as const,
      category: 'crisis' as const,
      panelTarget: 'narrativeEvent' as const,
    }],
  };
}
