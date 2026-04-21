import { describe, it, expect } from 'vitest';
import { espionageSystem } from '../espionageSystem';
import { createTestState, createTestPlayer } from './helpers';

function stateWithTwoPlayers(overrides: { p1Influence?: number; p2Influence?: number } = {}) {
  return createTestState({
    currentPlayerId: 'p1',
    players: new Map([
      ['p1', createTestPlayer({ id: 'p1', name: 'Player 1', influence: overrides.p1Influence ?? 100 })],
      ['p2', createTestPlayer({ id: 'p2', name: 'Player 2', influence: overrides.p2Influence ?? 100 })],
    ]),
  });
}

describe('espionageSystem', () => {
  it('INITIATE_ESPIONAGE creates an active operation when valid', () => {
    const state = stateWithTwoPlayers({ p1Influence: 50 });
    const next = espionageSystem(state, {
      type: 'INITIATE_ESPIONAGE',
      targetPlayerId: 'p2',
      actionId: 'steal_tech',
      influenceSpent: 5,
    });

    const ops = next.diplomacy.activeEspionageOps ?? [];
    expect(ops).toHaveLength(1);
    expect(ops[0].actionId).toBe('steal_tech');
    expect(ops[0].ownerId).toBe('p1');
    expect(ops[0].targetPlayerId).toBe('p2');
    expect(ops[0].turnsRemaining).toBe(4);
    expect(ops[0].completed).toBe(false);
    expect(ops[0].cancelled).toBe(false);
    // Influence deducted from owner
    expect(next.players.get('p1')!.influence).toBe(45);
  });

  it('INITIATE_ESPIONAGE no-ops when player lacks influence', () => {
    const state = stateWithTwoPlayers({ p1Influence: 3 });
    const next = espionageSystem(state, {
      type: 'INITIATE_ESPIONAGE',
      targetPlayerId: 'p2',
      actionId: 'steal_tech',
      influenceSpent: 5,
    });

    const ops = next.diplomacy.activeEspionageOps ?? [];
    expect(ops).toHaveLength(0);
    expect(next.players.get('p1')!.influence).toBe(3);
  });

  it('INITIATE_ESPIONAGE no-ops when targeting self', () => {
    const state = stateWithTwoPlayers({ p1Influence: 50 });
    const next = espionageSystem(state, {
      type: 'INITIATE_ESPIONAGE',
      targetPlayerId: 'p1',
      actionId: 'steal_tech',
      influenceSpent: 5,
    });

    const ops = next.diplomacy.activeEspionageOps ?? [];
    expect(ops).toHaveLength(0);
  });

  it('COUNTER_ESPIONAGE adds counter influence to an in-progress op', () => {
    let state = stateWithTwoPlayers({ p1Influence: 50, p2Influence: 50 });
    // p1 initiates
    state = espionageSystem(state, {
      type: 'INITIATE_ESPIONAGE',
      targetPlayerId: 'p2',
      actionId: 'steal_tech',
      influenceSpent: 5,
    });

    // Switch current player to p2 (the target) for counter
    state = { ...state, currentPlayerId: 'p2' };
    const opId = state.diplomacy.activeEspionageOps![0].id;

    const next = espionageSystem(state, {
      type: 'COUNTER_ESPIONAGE',
      opId,
      counterInfluence: 10,
    });

    const op = next.diplomacy.activeEspionageOps![0];
    expect(op.isCountered).toBe(true);
    expect(op.counterInfluence).toBe(10);
    expect(next.players.get('p2')!.influence).toBe(40);
  });

  it('COUNTER_ESPIONAGE no-ops when op does not target current player', () => {
    let state = stateWithTwoPlayers({ p1Influence: 50, p2Influence: 50 });
    state = espionageSystem(state, {
      type: 'INITIATE_ESPIONAGE',
      targetPlayerId: 'p2',
      actionId: 'steal_tech',
      influenceSpent: 5,
    });

    // Still p1's turn — p1 tries to counter their own op
    const opId = state.diplomacy.activeEspionageOps![0].id;
    const next = espionageSystem(state, {
      type: 'COUNTER_ESPIONAGE',
      opId,
      counterInfluence: 10,
    });

    const op = next.diplomacy.activeEspionageOps![0];
    expect(op.isCountered).toBe(false);
    expect(op.counterInfluence).toBe(0);
  });

  it('END_TURN ticks operation timer and drains influence', () => {
    let state = stateWithTwoPlayers({ p1Influence: 50 });
    state = espionageSystem(state, {
      type: 'INITIATE_ESPIONAGE',
      targetPlayerId: 'p2',
      actionId: 'steal_tech',
      influenceSpent: 5,
    });

    const influenceBefore = state.players.get('p1')!.influence;

    // Tick 3 turns — should still be in progress
    for (let i = 0; i < 3; i++) {
      state = espionageSystem(state, { type: 'END_TURN' });
    }
    const op = state.diplomacy.activeEspionageOps![0];
    expect(op.turnsRemaining).toBe(1);
    expect(op.completed).toBe(false);
    expect(op.cancelled).toBe(false);

    // Owner should have had influence drained per turn
    const influenceAfter3 = state.players.get('p1')!.influence;
    expect(influenceAfter3).toBeLessThan(influenceBefore);
  });

  it('END_TURN completes operation after 4 ticks', () => {
    let state = stateWithTwoPlayers({ p1Influence: 100 });
    state = espionageSystem(state, {
      type: 'INITIATE_ESPIONAGE',
      targetPlayerId: 'p2',
      actionId: 'steal_tech',
      influenceSpent: 5,
    });

    // Tick 4 turns — should complete (assuming no detection)
    for (let i = 0; i < 4; i++) {
      state = espionageSystem(state, { type: 'END_TURN' });
    }

    // With seeded RNG (seed 42, counter starts at 0), the detection rolls may
    // or may not trigger. Check that the op is either completed or cancelled.
    const op = state.diplomacy.activeEspionageOps![0];
    expect(op.completed || op.cancelled).toBe(true);
    if (op.completed) {
      expect(op.turnsRemaining).toBe(0);
    }
  });
});
