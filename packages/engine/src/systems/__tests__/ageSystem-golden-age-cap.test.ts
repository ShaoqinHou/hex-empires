/**
 * HH4.2 — Golden Age single-cap enforcement (legacy-paths F-05).
 *
 * Verifies:
 *  - At most 1 golden age activates per age transition.
 *  - When goldenAgeChosen is null AND multiple axes are at tier 3, no golden
 *    age fires (player must dispatch CHOOSE_GOLDEN_AGE_AXIS first).
 *  - CHOOSE_GOLDEN_AGE_AXIS sets the axis correctly and rejects: duplicate
 *    selections within the same age, and axes not at tier 3.
 *  - After CHOOSE_GOLDEN_AGE_AXIS → TRANSITION_AGE, only the chosen axis
 *    grants a golden age; other tier-3 axes do NOT.
 */
import { describe, it, expect } from 'vitest';
import { ageSystem } from '../ageSystem';
import { createTestState, createTestPlayer } from './helpers';

// Shared player setup: military AND economic both at tier 3.
function makeDualTier3Player(overrides: Parameters<typeof createTestPlayer>[0] = {}) {
  return createTestPlayer({
    age: 'antiquity',
    civilizationId: 'rome',
    ageProgress: 50,
    legacyPoints: 0,
    legacyBonuses: [],
    legacyPaths: { military: 3, economic: 3, science: 1, culture: 1 },
    ...overrides,
  });
}

function makeState(playerOverrides: Parameters<typeof createTestPlayer>[0] = {}) {
  return createTestState({
    players: new Map([['p1', makeDualTier3Player(playerOverrides)]]),
    age: { currentAge: 'antiquity', ageThresholds: { exploration: 50, modern: 100 } },
  });
}

describe('HH4.2 — CHOOSE_GOLDEN_AGE_AXIS action', () => {
  it('sets goldenAgeChosen when axis is at tier 3', () => {
    const state = makeState();
    const next = ageSystem(state, { type: 'CHOOSE_GOLDEN_AGE_AXIS', axis: 'military' });
    expect(next.players.get('p1')!.goldenAgeChosen).toBe('military');
  });

  it('rejects (no-ops) when axis is NOT at tier 3', () => {
    const state = makeState();
    // science is at tier 1, not tier 3
    const next = ageSystem(state, { type: 'CHOOSE_GOLDEN_AGE_AXIS', axis: 'science' });
    expect(next).toBe(state); // exact same reference — no state change
  });

  it('rejects (no-ops) duplicate selection — once chosen, cannot be changed', () => {
    const state = makeState({ goldenAgeChosen: 'military' });
    // Try to re-select economic (which is also at tier 3)
    const next = ageSystem(state, { type: 'CHOOSE_GOLDEN_AGE_AXIS', axis: 'economic' });
    // State is unchanged: original 'military' choice persists
    expect(next).toBe(state);
    expect(next.players.get('p1')!.goldenAgeChosen).toBe('military');
  });

  it('adds a log entry on valid selection', () => {
    const state = makeState();
    const next = ageSystem(state, { type: 'CHOOSE_GOLDEN_AGE_AXIS', axis: 'economic' });
    expect(next.log.some(e => e.message.includes('economic') && e.message.includes('Golden Age'))).toBe(true);
  });
});

describe('HH4.2 — multi-axis tier-3 without explicit choice', () => {
  it('no golden age fires when two axes are at tier 3 and goldenAgeChosen is null', () => {
    const state = makeState(); // military=3, economic=3, no goldenAgeChosen
    const next = ageSystem(state, { type: 'TRANSITION_AGE', newCivId: 'spain' });
    const pending = next.players.get('p1')!.pendingLegacyBonuses ?? [];
    expect(pending.filter(b => b.bonusId.includes('golden-age')).length).toBe(0);
    expect(next.log.filter(e => e.message.includes('Golden Age')).length).toBe(0);
  });
});

describe('HH4.2 — explicit axis choice + TRANSITION_AGE', () => {
  it('chosen axis grants golden age; other tier-3 axis does NOT get a bonus', () => {
    // military=3, economic=3; player chooses military
    const state = makeState();
    const stateWithChoice = ageSystem(state, { type: 'CHOOSE_GOLDEN_AGE_AXIS', axis: 'military' });
    expect(stateWithChoice.players.get('p1')!.goldenAgeChosen).toBe('military');

    const next = ageSystem(stateWithChoice, { type: 'TRANSITION_AGE', newCivId: 'spain' });
    const pending = next.players.get('p1')!.pendingLegacyBonuses ?? [];

    // Exactly one golden age bonus, and it is military
    const goldenBonuses = pending.filter(b => b.bonusId.includes('golden-age'));
    expect(goldenBonuses.length).toBe(1);
    expect(goldenBonuses[0].bonusId).toContain('golden-age:military');

    // Economic golden age must NOT appear
    expect(pending.some(b => b.bonusId.includes('golden-age:economic'))).toBe(false);

    // goldenAgeChosen is reset after transition
    expect(next.players.get('p1')!.goldenAgeChosen).toBeNull();
  });

  it('chosen economic axis grants economic golden age, not military', () => {
    const state = makeState();
    const stateWithChoice = ageSystem(state, { type: 'CHOOSE_GOLDEN_AGE_AXIS', axis: 'economic' });
    const next = ageSystem(stateWithChoice, { type: 'TRANSITION_AGE', newCivId: 'spain' });
    const pending = next.players.get('p1')!.pendingLegacyBonuses ?? [];

    const goldenBonuses = pending.filter(b => b.bonusId.includes('golden-age'));
    expect(goldenBonuses.length).toBe(1);
    expect(goldenBonuses[0].bonusId).toContain('golden-age:economic');
    expect(goldenBonuses[0].effect).toEqual({
      type: 'MODIFY_YIELD', target: 'city', yield: 'gold', value: 3,
    });

    // Military golden age must NOT appear
    expect(pending.some(b => b.bonusId.includes('golden-age:military'))).toBe(false);
  });

  it('duplicate CHOOSE_GOLDEN_AGE_AXIS before transition is rejected; original choice is used', () => {
    const state = makeState();
    // Choose military first
    const state2 = ageSystem(state, { type: 'CHOOSE_GOLDEN_AGE_AXIS', axis: 'military' });
    // Try to re-select economic — must be rejected (no-op)
    const state3 = ageSystem(state2, { type: 'CHOOSE_GOLDEN_AGE_AXIS', axis: 'economic' });
    expect(state3).toBe(state2); // same reference — no change

    // Transition uses the original military choice
    const next = ageSystem(state3, { type: 'TRANSITION_AGE', newCivId: 'spain' });
    const pending = next.players.get('p1')!.pendingLegacyBonuses ?? [];
    expect(pending.some(b => b.bonusId.includes('golden-age:military'))).toBe(true);
    expect(pending.some(b => b.bonusId.includes('golden-age:economic'))).toBe(false);
  });
});
