import type { GameState } from '../types/GameState';
import type { NarrativeEventDef, NarrativeRequirements } from '../types/NarrativeEvent';

export type NarrativeTriggerType = NonNullable<NarrativeRequirements['triggerType']>;

interface EnqueueNarrativeEventOptions {
  readonly playerId?: string;
  readonly messagePrefix?: string;
}

/**
 * Check whether a narrative event's age gate allows it to fire in the current age.
 * Returns true if there is no age gate OR the current age matches.
 */
export function isAgeGateOpen(def: NarrativeEventDef, state: GameState): boolean {
  if (!def.ageGate) return true;
  return state.age.currentAge === def.ageGate;
}

export function matchesNarrativeRequirements(
  def: NarrativeEventDef,
  state: GameState,
  playerId: string = state.currentPlayerId,
): boolean {
  const player = state.players.get(playerId);
  if (!player) return false;

  const tags = player.narrativeTags ?? [];

  if (def.requirements.requiresTags) {
    for (const t of def.requirements.requiresTags) {
      if (!tags.includes(t)) return false;
    }
  }

  if (def.requirements.excludesTags) {
    for (const t of def.requirements.excludesTags) {
      if (tags.includes(t)) return false;
    }
  }

  if (def.requirements.leaderId && player.leaderId !== def.requirements.leaderId) return false;
  if (def.requirements.civId && player.civilizationId !== def.requirements.civId) return false;

  return true;
}

export function isNarrativeEventEligible(
  def: NarrativeEventDef,
  state: GameState,
  triggerType: NarrativeTriggerType,
  playerId: string = state.currentPlayerId,
): boolean {
  const fired = state.firedNarrativeEvents ?? [];
  if (fired.includes(def.id)) return false;
  if ((def.requirements.triggerType ?? 'END_TURN') !== triggerType) return false;
  if (!isAgeGateOpen(def, state)) return false;
  return matchesNarrativeRequirements(def, state, playerId);
}

export function findEligibleNarrativeEvents(
  state: GameState,
  triggerType: NarrativeTriggerType,
  playerId: string = state.currentPlayerId,
): ReadonlyArray<NarrativeEventDef> {
  if (!state.config.narrativeEvents) return [];
  return [...state.config.narrativeEvents.values()].filter(def =>
    isNarrativeEventEligible(def, state, triggerType, playerId),
  );
}

export function enqueueNarrativeEvent(
  state: GameState,
  narrativeEventId: string,
  options: EnqueueNarrativeEventOptions = {},
): GameState {
  const fired = state.firedNarrativeEvents ?? [];
  if (fired.includes(narrativeEventId)) return state;

  const def = state.config.narrativeEvents?.get(narrativeEventId);
  if (!def) return state;

  const playerId = options.playerId ?? state.currentPlayerId;
  if (!isAgeGateOpen(def, state)) return state;
  if (!matchesNarrativeRequirements(def, state, playerId)) return state;

  const messagePrefix = options.messagePrefix ?? 'Narrative event';

  return {
    ...state,
    pendingNarrativeEvents: [...(state.pendingNarrativeEvents ?? []), narrativeEventId],
    firedNarrativeEvents: [...fired, narrativeEventId],
    log: [...state.log, {
      turn: state.turn,
      playerId,
      message: `${messagePrefix}: ${def.title}`,
      type: 'crisis' as const,
      severity: 'warning' as const,
      category: 'crisis' as const,
      panelTarget: 'narrativeEvent' as const,
    }],
  };
}

export function enqueueFirstEligibleNarrativeEvent(
  state: GameState,
  triggerType: NarrativeTriggerType,
  options: EnqueueNarrativeEventOptions = {},
): GameState {
  const candidates = findEligibleNarrativeEvents(
    state,
    triggerType,
    options.playerId ?? state.currentPlayerId,
  );

  if (candidates.length === 0) return state;

  return enqueueNarrativeEvent(state, candidates[0].id, options);
}

/**
 * Enqueue a discovery-triggered narrative event.
 * Called by movementSystem when a unit steps on a discoveryId tile.
 * Respects the dedup guard and age gate; safe to call even if the event was already fired.
 */
export function enqueueDiscoveryEvent(state: GameState, narrativeEventId: string): GameState {
  return enqueueNarrativeEvent(state, narrativeEventId, { messagePrefix: 'Discovery' });
}
