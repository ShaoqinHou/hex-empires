import { describe, it, expect } from 'vitest';
import { diplomacySystem } from '../diplomacySystem';
import { createTestState, createTestPlayer } from './helpers';

function twoPlayerState() {
  return createTestState({
    players: new Map([
      ['p1', createTestPlayer({ id: 'p1' })],
      ['p2', createTestPlayer({ id: 'p2' })],
    ]),
    currentPlayerId: 'p1',
  });
}

describe('diplomacySystem', () => {
  it('declares war', () => {
    const state = twoPlayerState();
    const next = diplomacySystem(state, {
      type: 'PROPOSE_DIPLOMACY',
      targetId: 'p2',
      proposal: { type: 'DECLARE_WAR' },
    });
    const rel = next.diplomacy.relations.values().next().value;
    expect(rel.status).toBe('war');
  });

  it('adds grievances on war declaration', () => {
    const state = twoPlayerState();
    const next = diplomacySystem(state, {
      type: 'PROPOSE_DIPLOMACY',
      targetId: 'p2',
      proposal: { type: 'DECLARE_WAR' },
    });
    const rel = next.diplomacy.relations.values().next().value;
    expect(rel.grievances).toBeGreaterThan(0);
  });

  it('makes peace when grievances are low', () => {
    const state = twoPlayerState();
    // First declare war
    let next = diplomacySystem(state, {
      type: 'PROPOSE_DIPLOMACY',
      targetId: 'p2',
      proposal: { type: 'DECLARE_WAR' },
    });
    // Manually set low grievances for peace
    const key = next.diplomacy.relations.keys().next().value;
    const relations = new Map(next.diplomacy.relations);
    relations.set(key, { ...relations.get(key)!, grievances: 5 });
    next = { ...next, diplomacy: { relations } };

    // Propose peace
    next = diplomacySystem(next, {
      type: 'PROPOSE_DIPLOMACY',
      targetId: 'p2',
      proposal: { type: 'PROPOSE_PEACE' },
    });
    const rel = next.diplomacy.relations.values().next().value;
    expect(rel.status).toBe('peace');
  });

  it('rejects peace when grievances are high', () => {
    const state = twoPlayerState();
    // Declare war
    let next = diplomacySystem(state, {
      type: 'PROPOSE_DIPLOMACY',
      targetId: 'p2',
      proposal: { type: 'DECLARE_WAR' },
    });
    // Manually set high grievances
    const key = next.diplomacy.relations.keys().next().value;
    const relations = new Map(next.diplomacy.relations);
    relations.set(key, { ...relations.get(key)!, grievances: 50 });
    next = { ...next, diplomacy: { relations } };

    // Propose peace (should be rejected due to grievances > 30)
    next = diplomacySystem(next, {
      type: 'PROPOSE_DIPLOMACY',
      targetId: 'p2',
      proposal: { type: 'PROPOSE_PEACE' },
    });
    const rel = next.diplomacy.relations.values().next().value;
    expect(rel.status).toBe('war'); // still at war
  });

  it('forms friendship', () => {
    const state = twoPlayerState();
    const next = diplomacySystem(state, {
      type: 'PROPOSE_DIPLOMACY',
      targetId: 'p2',
      proposal: { type: 'PROPOSE_FRIENDSHIP' },
    });
    const rel = next.diplomacy.relations.values().next().value;
    expect(rel.status).toBe('friendship');
  });

  it('forms alliance', () => {
    const state = twoPlayerState();
    const next = diplomacySystem(state, {
      type: 'PROPOSE_DIPLOMACY',
      targetId: 'p2',
      proposal: { type: 'PROPOSE_ALLIANCE' },
    });
    const rel = next.diplomacy.relations.values().next().value;
    expect(rel.status).toBe('alliance');
  });

  it('denounces', () => {
    const state = twoPlayerState();
    const next = diplomacySystem(state, {
      type: 'PROPOSE_DIPLOMACY',
      targetId: 'p2',
      proposal: { type: 'DENOUNCE' },
    });
    const rel = next.diplomacy.relations.values().next().value;
    expect(rel.status).toBe('denounced');
  });

  it('adds log entry', () => {
    const state = twoPlayerState();
    const next = diplomacySystem(state, {
      type: 'PROPOSE_DIPLOMACY',
      targetId: 'p2',
      proposal: { type: 'DECLARE_WAR' },
    });
    expect(next.log.some(e => e.type === 'diplomacy')).toBe(true);
  });

  it('ignores non-diplomacy actions', () => {
    const state = twoPlayerState();
    expect(diplomacySystem(state, { type: 'END_TURN' })).toBe(state);
  });
});
