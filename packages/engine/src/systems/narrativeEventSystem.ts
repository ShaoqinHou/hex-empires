import type { GameState, GameAction, PlayerState, EffectDef } from '../types/GameState';
import { enqueueDiscoveryEvent, enqueueFirstEligibleNarrativeEvent } from '../state/narrativeEventUtils';

/**
 * NarrativeEventSystem handles Goody-Hut-replacement story moments.
 *
 * On END_TURN:
 *   - Evaluates all END_TURN-triggered events against the current player.
 *   - Fires at most ONE new event per turn (first match that has not yet fired).
 *   - Enqueues the event id in pendingNarrativeEvents and marks it fired in
 *     firedNarrativeEvents (dedup guard).
 *
 * On RESOLVE_NARRATIVE_EVENT:
 *   - Looks up the event def by id.
 *   - Applies all EffectDef entries for the chosen choice.
 *   - Writes tagOutput strings to PlayerState.narrativeTags.
 *   - Removes the event from the pending queue.
 *
 * Discovery-tile events are enqueued by movementSystem (F-06); this system
 * handles their resolution via RESOLVE_NARRATIVE_EVENT.
 */
export function narrativeEventSystem(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'END_TURN':
      return evaluateAndEnqueue(state);
    case 'RESOLVE_NARRATIVE_EVENT':
      return resolveNarrativeEvent(state, action.eventId, action.choiceIndex);
    default:
      return state;
  }
}

// ── Evaluation ──

function evaluateAndEnqueue(state: GameState): GameState {
  // Fire ONE per turn (first match wins; rest remain eligible next turn)
  return enqueueFirstEligibleNarrativeEvent(state, 'END_TURN');
}

// ── Resolution ──

function resolveNarrativeEvent(state: GameState, eventId: string, choiceIndex: number): GameState {
  const def = state.config.narrativeEvents?.get(eventId);
  if (!def) return state;

  const choice = def.choices[choiceIndex];
  if (!choice) return state;

  const player = state.players.get(state.currentPlayerId);
  if (!player) return state;

  // Apply each effect in the chosen choice
  let newState = state;
  for (const effect of choice.effects) {
    newState = applyNarrativeEffect(newState, effect, state.currentPlayerId);
  }

  // Write tagOutput to PlayerState.narrativeTags
  if (choice.tagOutput && choice.tagOutput.length > 0) {
    const currentPlayer = newState.players.get(state.currentPlayerId);
    if (currentPlayer) {
      const existing = currentPlayer.narrativeTags ?? [];
      const merged = [...existing, ...choice.tagOutput.filter(t => !existing.includes(t))];
      const updatedPlayers = new Map(newState.players);
      updatedPlayers.set(state.currentPlayerId, { ...currentPlayer, narrativeTags: merged });
      newState = { ...newState, players: updatedPlayers };
    }
  }

  // Remove from pending queue
  const queue = (newState.pendingNarrativeEvents ?? []).filter(id => id !== eventId);

  return {
    ...newState,
    pendingNarrativeEvents: queue,
    log: [...newState.log, {
      turn: newState.turn,
      playerId: state.currentPlayerId,
      message: `Resolved "${def.title}" — ${choice.label}`,
      type: 'crisis' as const,
      category: 'crisis' as const,
    }],
  };
}

// ── Effect application ──

/**
 * Apply a single EffectDef from a narrative choice.
 * MODIFY_YIELD with empire target → adds directly to player resource pools.
 * Other effect types are no-op stubs (full hookup is future work).
 */
function applyNarrativeEffect(state: GameState, effect: EffectDef, playerId: string): GameState {
  const player = state.players.get(playerId);
  if (!player) return state;

  if (effect.type === 'MODIFY_YIELD' && effect.target === 'empire') {
    const yieldKey = effect.yield as keyof PlayerState;
    const currentValue = player[yieldKey];
    if (typeof currentValue !== 'number') return state;
    const newValue = Math.max(0, currentValue + effect.value);
    const updatedPlayers = new Map(state.players);
    updatedPlayers.set(playerId, { ...player, [yieldKey]: newValue });
    return { ...state, players: updatedPlayers };
  }

  // GRANT_UNIT, FREE_TECH, etc. are no-op stubs — wired via full effect system in later phases
  return state;
}

// ── Age gate helper + discovery enqueue (re-exported from shared utility) ──
export { isAgeGateOpen, enqueueDiscoveryEvent } from '../state/narrativeEventUtils';
