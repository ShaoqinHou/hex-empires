import { describe, it, expect } from 'vitest';
import { treatySystem } from '../treatySystem';
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

describe('treatySystem', () => {
  it('PROPOSE_TREATY creates a pending treaty when valid', () => {
    const state = stateWithTwoPlayers({ p1Influence: 50 });
    const next = treatySystem(state, {
      type: 'PROPOSE_TREATY',
      targetPlayerId: 'p2',
      treatyId: 'open_borders',
      influenceSpent: 20,
    });

    const treaties = next.diplomacy.activeTreaties ?? [];
    expect(treaties).toHaveLength(1);
    expect(treaties[0].treatyId).toBe('open_borders');
    expect(treaties[0].proposerId).toBe('p1');
    expect(treaties[0].targetId).toBe('p2');
    expect(treaties[0].status).toBe('pending');
    expect(treaties[0].activeSinceTurn).toBeNull();
    // Influence deducted from proposer
    expect(next.players.get('p1')!.influence).toBe(30);
  });

  it('PROPOSE_TREATY no-ops when player lacks influence', () => {
    const state = stateWithTwoPlayers({ p1Influence: 10 });
    const next = treatySystem(state, {
      type: 'PROPOSE_TREATY',
      targetPlayerId: 'p2',
      treatyId: 'open_borders',
      influenceSpent: 20,
    });

    const treaties = next.diplomacy.activeTreaties ?? [];
    expect(treaties).toHaveLength(0);
    expect(next.players.get('p1')!.influence).toBe(10);
  });

  it('PROPOSE_TREATY no-ops when proposing to self', () => {
    const state = stateWithTwoPlayers({ p1Influence: 50 });
    const next = treatySystem(state, {
      type: 'PROPOSE_TREATY',
      targetPlayerId: 'p1',
      treatyId: 'open_borders',
      influenceSpent: 20,
    });

    const treaties = next.diplomacy.activeTreaties ?? [];
    expect(treaties).toHaveLength(0);
  });

  it('ACCEPT_TREATY transitions pending treaty to active', () => {
    let state = stateWithTwoPlayers({ p1Influence: 50 });
    state = treatySystem(state, {
      type: 'PROPOSE_TREATY',
      targetPlayerId: 'p2',
      treatyId: 'open_borders',
      influenceSpent: 20,
    });

    const treatyRuntimeId = state.diplomacy.activeTreaties![0].id;

    // Switch to p2 (target accepts)
    state = { ...state, currentPlayerId: 'p2' };
    const next = treatySystem(state, {
      type: 'ACCEPT_TREATY',
      treatyId: treatyRuntimeId,
    });

    const treaty = next.diplomacy.activeTreaties![0];
    expect(treaty.status).toBe('active');
    expect(treaty.activeSinceTurn).toBe(state.turn);
    expect(treaty.turnsRemaining).toBe(30); // open_borders has durationTurns: 30
  });

  it('ACCEPT_TREATY no-ops when target is not current player', () => {
    let state = stateWithTwoPlayers({ p1Influence: 50 });
    state = treatySystem(state, {
      type: 'PROPOSE_TREATY',
      targetPlayerId: 'p2',
      treatyId: 'open_borders',
      influenceSpent: 20,
    });

    const treatyRuntimeId = state.diplomacy.activeTreaties![0].id;

    // p1 (proposer) tries to accept their own proposal — should no-op
    const next = treatySystem(state, {
      type: 'ACCEPT_TREATY',
      treatyId: treatyRuntimeId,
    });

    const treaty = next.diplomacy.activeTreaties![0];
    expect(treaty.status).toBe('pending');
  });

  it('REJECT_TREATY transitions pending treaty to rejected', () => {
    let state = stateWithTwoPlayers({ p1Influence: 50 });
    state = treatySystem(state, {
      type: 'PROPOSE_TREATY',
      targetPlayerId: 'p2',
      treatyId: 'improve_trade_relations',
      influenceSpent: 25,
    });

    const treatyRuntimeId = state.diplomacy.activeTreaties![0].id;

    // Switch to p2 (target rejects)
    state = { ...state, currentPlayerId: 'p2' };
    const next = treatySystem(state, {
      type: 'REJECT_TREATY',
      treatyId: treatyRuntimeId,
    });

    const treaty = next.diplomacy.activeTreaties![0];
    expect(treaty.status).toBe('rejected');
  });

  it('END_TURN decrements turnsRemaining on active treaties', () => {
    let state = stateWithTwoPlayers({ p1Influence: 50 });
    state = treatySystem(state, {
      type: 'PROPOSE_TREATY',
      targetPlayerId: 'p2',
      treatyId: 'open_borders',
      influenceSpent: 20,
    });

    const treatyRuntimeId = state.diplomacy.activeTreaties![0].id;
    // Accept
    state = { ...state, currentPlayerId: 'p2' };
    state = treatySystem(state, {
      type: 'ACCEPT_TREATY',
      treatyId: treatyRuntimeId,
    });

    expect(state.diplomacy.activeTreaties![0].turnsRemaining).toBe(30);

    // Tick one turn
    state = treatySystem(state, { type: 'END_TURN' });
    expect(state.diplomacy.activeTreaties![0].turnsRemaining).toBe(29);
    expect(state.diplomacy.activeTreaties![0].status).toBe('active');
  });

  it('END_TURN expires treaty when turnsRemaining reaches 0', () => {
    let state = stateWithTwoPlayers({ p1Influence: 50 });
    state = treatySystem(state, {
      type: 'PROPOSE_TREATY',
      targetPlayerId: 'p2',
      treatyId: 'denounce_military_presence',
      influenceSpent: 15,
    });

    const treatyRuntimeId = state.diplomacy.activeTreaties![0].id;
    // Accept
    state = { ...state, currentPlayerId: 'p2' };
    state = treatySystem(state, {
      type: 'ACCEPT_TREATY',
      treatyId: treatyRuntimeId,
    });

    // denounce_military_presence has durationTurns: 20 — tick 20 times
    for (let i = 0; i < 20; i++) {
      state = treatySystem(state, { type: 'END_TURN' });
    }

    const treaty = state.diplomacy.activeTreaties![0];
    expect(treaty.status).toBe('expired');
    expect(treaty.turnsRemaining).toBe(0);
  });
});
