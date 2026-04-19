import { describe, it, expect } from 'vitest';
import {
  governmentSystem,
  canAdoptGovernment,
  canSlotPolicy,
} from '../governmentSystem';
import type { GovernmentAction } from '../../types/Government';
import type { PlayerState } from '../../types/GameState';
import { createTestState, createTestPlayer } from './helpers';

/**
 * Test-scope helper: augment a PlayerState with the optional Government
 * runtime fields. The engine schema does not yet include them (cycle D
 * inlines them), so tests attach them via a structural cast.
 */
function withGovernmentFields(
  player: PlayerState,
  overrides: {
    governmentId?: string | null;
    slottedPolicies?: Map<string, Array<string | null>>;
  } = {},
): PlayerState {
  return {
    ...player,
    governmentId: overrides.governmentId ?? null,
    slottedPolicies: overrides.slottedPolicies ?? new Map(),
  } as unknown as PlayerState;
}

describe('governmentSystem', () => {
  // ── Pass-through / purity ──

  it('returns the identical state reference for non-government actions', () => {
    const state = createTestState();
    const next = governmentSystem(state, { type: 'START_TURN' });
    expect(next).toBe(state);
  });

  it('returns identical state for END_TURN (another pass-through)', () => {
    const state = createTestState();
    const next = governmentSystem(state, { type: 'END_TURN' });
    expect(next).toBe(state);
  });

  // ── ADOPT_GOVERNMENT (SET_GOVERNMENT) — invalid ──

  it('ADOPT_GOVERNMENT with unknown governmentId returns state unchanged', () => {
    const player = withGovernmentFields(
      createTestPlayer({ id: 'p1', researchedCivics: ['code_of_laws'] }),
    );
    const state = createTestState({
      players: new Map([['p1', player]]),
    });
    const action: GovernmentAction = {
      type: 'SET_GOVERNMENT',
      playerId: 'p1',
      governmentId: 'does_not_exist',
    };
    const next = governmentSystem(state, action);
    expect(next).toBe(state);
  });

  it('ADOPT_GOVERNMENT when required civic is not researched returns state unchanged', () => {
    const player = withGovernmentFields(
      createTestPlayer({ id: 'p1', researchedCivics: [] }),
    );
    const state = createTestState({
      players: new Map([['p1', player]]),
    });
    const action: GovernmentAction = {
      type: 'SET_GOVERNMENT',
      playerId: 'p1',
      governmentId: 'classical_republic',
    };
    const next = governmentSystem(state, action);
    expect(next).toBe(state);
  });

  it('ADOPT_GOVERNMENT gracefully no-ops when PlayerState lacks governmentId/slottedPolicies', () => {
    // Vanilla helper player — no Government fields.
    const player = createTestPlayer({
      id: 'p1',
      researchedCivics: ['code_of_laws'],
    });
    const state = createTestState({
      players: new Map([['p1', player]]),
    });
    const action: GovernmentAction = {
      type: 'SET_GOVERNMENT',
      playerId: 'p1',
      governmentId: 'classical_republic',
    };
    const next = governmentSystem(state, action);
    expect(next).toBe(state);
  });

  // ── ADOPT_GOVERNMENT — valid ──

  it('ADOPT_GOVERNMENT valid sets governmentId and resets slottedPolicies', () => {
    const prePopulated = new Map<string, Array<string | null>>([
      ['military', ['conscription', 'discipline']],
      ['economic', ['free_market']],
    ]);
    const player = withGovernmentFields(
      createTestPlayer({
        id: 'p1',
        researchedCivics: ['code_of_laws'],
      }),
      { governmentId: null, slottedPolicies: prePopulated },
    );
    const state = createTestState({
      players: new Map([['p1', player]]),
    });

    const action: GovernmentAction = {
      type: 'SET_GOVERNMENT',
      playerId: 'p1',
      governmentId: 'classical_republic',
    };
    const next = governmentSystem(state, action);

    const updated = next.players.get('p1') as PlayerState & {
      governmentId: string | null;
      slottedPolicies: ReadonlyMap<string, ReadonlyArray<string | null>>;
    };

    expect(updated.governmentId).toBe('classical_republic');

    // classical_republic has policySlots { military: 0, economic: 1, diplomatic: 0, wildcard: 1 }
    expect(updated.slottedPolicies.get('military')).toEqual([]);
    expect(updated.slottedPolicies.get('economic')).toEqual([null]);
    expect(updated.slottedPolicies.get('diplomatic')).toEqual([]);
    expect(updated.slottedPolicies.get('wildcard')).toEqual([null]);
  });

  it('ADOPT_GOVERNMENT when already on that government returns state unchanged', () => {
    const player = withGovernmentFields(
      createTestPlayer({
        id: 'p1',
        researchedCivics: ['code_of_laws'],
      }),
      { governmentId: 'classical_republic' },
    );
    const state = createTestState({
      players: new Map([['p1', player]]),
    });

    const action: GovernmentAction = {
      type: 'SET_GOVERNMENT',
      playerId: 'p1',
      governmentId: 'classical_republic',
    };
    const next = governmentSystem(state, action);
    expect(next).toBe(state);
  });

  // ── SLOT_POLICY ──

  it('SLOT_POLICY with wrong-category policy returns state unchanged', () => {
    // classical_republic has an economic slot (index 0). Try to slot a
    // military policy (discipline) into it — must be rejected.
    const slots = new Map<string, Array<string | null>>([
      ['military', []],
      ['economic', [null]],
      ['diplomatic', []],
      ['wildcard', [null]],
    ]);
    const player = withGovernmentFields(
      createTestPlayer({
        id: 'p1',
        researchedCivics: ['code_of_laws'], // unlocks discipline
      }),
      { governmentId: 'classical_republic', slottedPolicies: slots },
    );
    const state = createTestState({
      players: new Map([['p1', player]]),
    });

    const action: GovernmentAction = {
      type: 'SLOT_POLICY',
      playerId: 'p1',
      category: 'economic',
      slotIndex: 0,
      policyId: 'discipline', // military policy
    };
    const next = governmentSystem(state, action);
    expect(next).toBe(state);
  });

  it('SLOT_POLICY with policy whose civic is not researched returns state unchanged', () => {
    const slots = new Map<string, Array<string | null>>([
      ['military', []],
      ['economic', [null]],
      ['diplomatic', []],
      ['wildcard', [null]],
    ]);
    const player = withGovernmentFields(
      createTestPlayer({
        id: 'p1',
        researchedCivics: ['code_of_laws'], // does NOT include craftsmanship
      }),
      { governmentId: 'classical_republic', slottedPolicies: slots },
    );
    const state = createTestState({
      players: new Map([['p1', player]]),
    });

    const action: GovernmentAction = {
      type: 'SLOT_POLICY',
      playerId: 'p1',
      category: 'economic',
      slotIndex: 0,
      policyId: 'urban_planning', // requires craftsmanship
    };
    const next = governmentSystem(state, action);
    expect(next).toBe(state);
  });

  it('SLOT_POLICY valid places the policy in the target slot', () => {
    const slots = new Map<string, Array<string | null>>([
      ['military', []],
      ['economic', [null]],
      ['diplomatic', []],
      ['wildcard', [null]],
    ]);
    const player = withGovernmentFields(
      createTestPlayer({
        id: 'p1',
        researchedCivics: ['code_of_laws', 'craftsmanship'],
      }),
      { governmentId: 'classical_republic', slottedPolicies: slots },
    );
    const state = createTestState({
      players: new Map([['p1', player]]),
    });

    const action: GovernmentAction = {
      type: 'SLOT_POLICY',
      playerId: 'p1',
      category: 'economic',
      slotIndex: 0,
      policyId: 'urban_planning',
    };
    const next = governmentSystem(state, action);

    const updated = next.players.get('p1') as PlayerState & {
      slottedPolicies: ReadonlyMap<string, ReadonlyArray<string | null>>;
    };
    expect(updated.slottedPolicies.get('economic')).toEqual(['urban_planning']);
    // Unchanged sibling slots.
    expect(updated.slottedPolicies.get('wildcard')).toEqual([null]);
  });

  it('SLOT_POLICY allows a military policy in a wildcard slot', () => {
    const slots = new Map<string, Array<string | null>>([
      ['military', []],
      ['economic', [null]],
      ['diplomatic', []],
      ['wildcard', [null]],
    ]);
    const player = withGovernmentFields(
      createTestPlayer({
        id: 'p1',
        researchedCivics: ['code_of_laws'],
      }),
      { governmentId: 'classical_republic', slottedPolicies: slots },
    );
    const state = createTestState({
      players: new Map([['p1', player]]),
    });

    const action: GovernmentAction = {
      type: 'SLOT_POLICY',
      playerId: 'p1',
      category: 'wildcard',
      slotIndex: 0,
      policyId: 'discipline', // military policy but wildcard slot
    };
    const next = governmentSystem(state, action);

    const updated = next.players.get('p1') as PlayerState & {
      slottedPolicies: ReadonlyMap<string, ReadonlyArray<string | null>>;
    };
    expect(updated.slottedPolicies.get('wildcard')).toEqual(['discipline']);
  });

  it('SLOT_POLICY with out-of-range slot index returns state unchanged', () => {
    const slots = new Map<string, Array<string | null>>([
      ['military', []],
      ['economic', [null]],
      ['diplomatic', []],
      ['wildcard', [null]],
    ]);
    const player = withGovernmentFields(
      createTestPlayer({
        id: 'p1',
        researchedCivics: ['code_of_laws', 'craftsmanship'],
      }),
      { governmentId: 'classical_republic', slottedPolicies: slots },
    );
    const state = createTestState({
      players: new Map([['p1', player]]),
    });

    const action: GovernmentAction = {
      type: 'SLOT_POLICY',
      playerId: 'p1',
      category: 'economic',
      slotIndex: 5, // classical_republic only has 1 economic slot
      policyId: 'urban_planning',
    };
    const next = governmentSystem(state, action);
    expect(next).toBe(state);
  });

  it('SLOT_POLICY gracefully no-ops when PlayerState lacks Government fields', () => {
    const player = createTestPlayer({
      id: 'p1',
      researchedCivics: ['code_of_laws', 'craftsmanship'],
    });
    const state = createTestState({
      players: new Map([['p1', player]]),
    });

    const action: GovernmentAction = {
      type: 'SLOT_POLICY',
      playerId: 'p1',
      category: 'economic',
      slotIndex: 0,
      policyId: 'urban_planning',
    };
    const next = governmentSystem(state, action);
    expect(next).toBe(state);
  });

  // ── UNSLOT_POLICY ──

  it('UNSLOT_POLICY clears the target slot', () => {
    const slots = new Map<string, Array<string | null>>([
      ['military', []],
      ['economic', ['urban_planning']],
      ['diplomatic', []],
      ['wildcard', ['discipline']],
    ]);
    const player = withGovernmentFields(
      createTestPlayer({
        id: 'p1',
        researchedCivics: ['code_of_laws', 'craftsmanship'],
      }),
      { governmentId: 'classical_republic', slottedPolicies: slots },
    );
    const state = createTestState({
      players: new Map([['p1', player]]),
    });

    const action: GovernmentAction = {
      type: 'UNSLOT_POLICY',
      playerId: 'p1',
      category: 'economic',
      slotIndex: 0,
    };
    const next = governmentSystem(state, action);

    const updated = next.players.get('p1') as PlayerState & {
      slottedPolicies: ReadonlyMap<string, ReadonlyArray<string | null>>;
    };
    expect(updated.slottedPolicies.get('economic')).toEqual([null]);
    // Unchanged slot.
    expect(updated.slottedPolicies.get('wildcard')).toEqual(['discipline']);
  });

  it('UNSLOT_POLICY on already-empty slot returns state unchanged', () => {
    const slots = new Map<string, Array<string | null>>([
      ['military', []],
      ['economic', [null]],
      ['diplomatic', []],
      ['wildcard', [null]],
    ]);
    const player = withGovernmentFields(
      createTestPlayer({
        id: 'p1',
        researchedCivics: ['code_of_laws'],
      }),
      { governmentId: 'classical_republic', slottedPolicies: slots },
    );
    const state = createTestState({
      players: new Map([['p1', player]]),
    });

    const action: GovernmentAction = {
      type: 'UNSLOT_POLICY',
      playerId: 'p1',
      category: 'economic',
      slotIndex: 0,
    };
    const next = governmentSystem(state, action);
    expect(next).toBe(state);
  });

  // ── Helper validators ──

  it('canAdoptGovernment returns true for a researched, new government', () => {
    const player = withGovernmentFields(
      createTestPlayer({ id: 'p1', researchedCivics: ['code_of_laws'] }),
    );
    const state = createTestState({
      players: new Map([['p1', player]]),
    });
    expect(canAdoptGovernment(state, 'p1', 'classical_republic')).toBe(true);
  });

  it('canAdoptGovernment returns false when unlockCivic not researched', () => {
    const player = withGovernmentFields(
      createTestPlayer({ id: 'p1', researchedCivics: [] }),
    );
    const state = createTestState({
      players: new Map([['p1', player]]),
    });
    expect(canAdoptGovernment(state, 'p1', 'classical_republic')).toBe(false);
  });

  it('canSlotPolicy rejects wrong category and accepts wildcard', () => {
    const slots = new Map<string, Array<string | null>>([
      ['military', []],
      ['economic', [null]],
      ['diplomatic', []],
      ['wildcard', [null]],
    ]);
    const player = withGovernmentFields(
      createTestPlayer({
        id: 'p1',
        researchedCivics: ['code_of_laws'],
      }),
      { governmentId: 'classical_republic', slottedPolicies: slots },
    );
    const state = createTestState({
      players: new Map([['p1', player]]),
    });
    expect(canSlotPolicy(state, 'p1', 'economic', 0, 'discipline')).toBe(
      false,
    );
    expect(canSlotPolicy(state, 'p1', 'wildcard', 0, 'discipline')).toBe(
      true,
    );
  });

  // ── Immutability ──

  it('does not mutate the original state when adopting a government', () => {
    const initialSlots = new Map<string, Array<string | null>>([
      ['military', []],
      ['economic', [null]],
      ['diplomatic', []],
      ['wildcard', [null]],
    ]);
    const player = withGovernmentFields(
      createTestPlayer({
        id: 'p1',
        researchedCivics: ['code_of_laws'],
      }),
      { governmentId: null, slottedPolicies: initialSlots },
    );
    const state = createTestState({
      players: new Map([['p1', player]]),
    });

    governmentSystem(state, {
      type: 'SET_GOVERNMENT',
      playerId: 'p1',
      governmentId: 'classical_republic',
    });

    const frozen = state.players.get('p1') as PlayerState & {
      governmentId: string | null;
    };
    expect(frozen.governmentId).toBe(null);
  });
});
