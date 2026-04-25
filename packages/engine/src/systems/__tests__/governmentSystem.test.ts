/**
 * governmentSystem tests — W2-03 edition.
 *
 * All policy slot interactions now use flat wildcard slots (slotIndex only).
 * Tests cover:
 *  - Wildcard slot acceptance (any policy in any slot)
 *  - Per-age government lock (governmentLockedForAge)
 *  - Policy swap window enforcement (policySwapWindowOpen)
 *  - Ideology branch-lock (SELECT_IDEOLOGY)
 *  - UNSLOT_POLICY on flat array
 *  - Immutability
 */
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
 * runtime fields using the W2-03 flat array schema.
 */
function withGovernmentFields(
  player: PlayerState,
  overrides: {
    governmentId?: string | null;
    slottedPolicies?: Array<string | null>;
    governmentLockedForAge?: boolean;
    policySwapWindowOpen?: boolean;
    ideology?: 'democracy' | 'fascism' | 'communism' | null;
  } = {},
): PlayerState {
  return {
    ...player,
    governmentId: overrides.governmentId ?? null,
    slottedPolicies: overrides.slottedPolicies ?? [],
    governmentLockedForAge: overrides.governmentLockedForAge ?? false,
    policySwapWindowOpen: overrides.policySwapWindowOpen ?? false,
    ideology: overrides.ideology ?? null,
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

  it('SET_GOVERNMENT with unknown governmentId returns state unchanged', () => {
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

  it('SET_GOVERNMENT when required civic is not researched returns state unchanged', () => {
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

  it('SET_GOVERNMENT gracefully no-ops when PlayerState lacks governmentId/slottedPolicies', () => {
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

  it('SET_GOVERNMENT valid sets governmentId and resets slottedPolicies as flat array', () => {
    const player = withGovernmentFields(
      createTestPlayer({
        id: 'p1',
        researchedCivics: ['code_of_laws'],
      }),
      {
        governmentId: null,
        slottedPolicies: ['discipline', 'urban_planning'],
      },
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
      slottedPolicies: ReadonlyArray<string | null>;
      governmentLockedForAge: boolean;
    };

    expect(updated.governmentId).toBe('classical_republic');
    // classical_republic has policySlots.total = 2 (W2-03 flat model)
    expect(updated.slottedPolicies).toHaveLength(2);
    expect(updated.slottedPolicies[0]).toBeNull();
    expect(updated.slottedPolicies[1]).toBeNull();
    // Sets the age lock (W2-03 CT F-07)
    expect(updated.governmentLockedForAge).toBe(true);
  });

  it('SET_GOVERNMENT when already on that government returns state unchanged', () => {
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

  // ── Per-age government lock (W2-03 CT F-07) ──

  it('SET_GOVERNMENT blocked when governmentLockedForAge is true', () => {
    const player = withGovernmentFields(
      createTestPlayer({
        id: 'p1',
        researchedCivics: ['code_of_laws', 'state_workforce'],
      }),
      { governmentId: 'classical_republic', governmentLockedForAge: true },
    );
    const state = createTestState({
      players: new Map([['p1', player]]),
    });

    const action: GovernmentAction = {
      type: 'SET_GOVERNMENT',
      playerId: 'p1',
      governmentId: 'oligarchy',
    };
    const next = governmentSystem(state, action);
    expect(next).toBe(state);
  });

  it('canAdoptGovernment returns false when governmentLockedForAge is true', () => {
    const player = withGovernmentFields(
      createTestPlayer({
        id: 'p1',
        researchedCivics: ['code_of_laws', 'state_workforce'],
      }),
      { governmentId: 'classical_republic', governmentLockedForAge: true },
    );
    const state = createTestState({
      players: new Map([['p1', player]]),
    });
    expect(canAdoptGovernment(state, 'p1', 'oligarchy')).toBe(false);
  });

  it('canAdoptGovernment returns true when governmentLockedForAge is false', () => {
    const player = withGovernmentFields(
      createTestPlayer({ id: 'p1', researchedCivics: ['code_of_laws'] }),
      { governmentLockedForAge: false },
    );
    const state = createTestState({
      players: new Map([['p1', player]]),
    });
    expect(canAdoptGovernment(state, 'p1', 'classical_republic')).toBe(true);
  });

  // ── SLOT_POLICY — wildcard flat slots (W2-03 F-01) ──

  it('SLOT_POLICY with policy swap window open places any policy in any slot', () => {
    // classical_republic has total=2 slots
    const player = withGovernmentFields(
      createTestPlayer({
        id: 'p1',
        researchedCivics: ['code_of_laws'],
      }),
      {
        governmentId: 'classical_republic',
        slottedPolicies: [null, null],
        policySwapWindowOpen: true,
      },
    );
    const state = createTestState({
      players: new Map([['p1', player]]),
    });

    // Slot a military policy (discipline) into slot 0 — no category gate
    const action: GovernmentAction = {
      type: 'SLOT_POLICY',
      playerId: 'p1',
      slotIndex: 0,
      policyId: 'discipline',
    };
    const next = governmentSystem(state, action);

    const updated = next.players.get('p1') as PlayerState & {
      slottedPolicies: ReadonlyArray<string | null>;
      policySwapWindowOpen: boolean;
    };
    expect(updated.slottedPolicies[0]).toBe('discipline');
    expect(updated.slottedPolicies[1]).toBeNull();
    // Consumes the swap window
    expect(updated.policySwapWindowOpen).toBe(false);
  });

  it('SLOT_POLICY any category works in any slot (true wildcard)', () => {
    const player = withGovernmentFields(
      createTestPlayer({
        id: 'p1',
        researchedCivics: ['code_of_laws', 'craftsmanship', 'foreign_trade'],
      }),
      {
        governmentId: 'classical_republic',
        slottedPolicies: [null, null],
        policySwapWindowOpen: true,
      },
    );
    const state = createTestState({
      players: new Map([['p1', player]]),
    });

    // Slot a diplomatic policy into slot 1 (no category restriction)
    const action: GovernmentAction = {
      type: 'SLOT_POLICY',
      playerId: 'p1',
      slotIndex: 1,
      policyId: 'diplomatic_league', // diplomatic category
    };
    const next = governmentSystem(state, action);
    const updated = next.players.get('p1') as PlayerState & {
      slottedPolicies: ReadonlyArray<string | null>;
    };
    expect(updated.slottedPolicies[1]).toBe('diplomatic_league');
  });

  it('SLOT_POLICY blocked when policySwapWindowOpen is false', () => {
    const player = withGovernmentFields(
      createTestPlayer({
        id: 'p1',
        researchedCivics: ['code_of_laws'],
      }),
      {
        governmentId: 'classical_republic',
        slottedPolicies: [null, null],
        policySwapWindowOpen: false, // window closed
      },
    );
    const state = createTestState({
      players: new Map([['p1', player]]),
    });

    const action: GovernmentAction = {
      type: 'SLOT_POLICY',
      playerId: 'p1',
      slotIndex: 0,
      policyId: 'discipline',
    };
    const next = governmentSystem(state, action);
    expect(next).toBe(state);
  });

  it('SLOT_POLICY with policy whose civic is not researched returns state unchanged', () => {
    const player = withGovernmentFields(
      createTestPlayer({
        id: 'p1',
        researchedCivics: ['code_of_laws'], // does NOT include craftsmanship
      }),
      {
        governmentId: 'classical_republic',
        slottedPolicies: [null, null],
        policySwapWindowOpen: true,
      },
    );
    const state = createTestState({
      players: new Map([['p1', player]]),
    });

    const action: GovernmentAction = {
      type: 'SLOT_POLICY',
      playerId: 'p1',
      slotIndex: 0,
      policyId: 'urban_planning', // requires craftsmanship
    };
    const next = governmentSystem(state, action);
    expect(next).toBe(state);
  });

  it('SLOT_POLICY with out-of-range slot index returns state unchanged', () => {
    const player = withGovernmentFields(
      createTestPlayer({
        id: 'p1',
        researchedCivics: ['code_of_laws'],
      }),
      {
        governmentId: 'classical_republic',
        slottedPolicies: [null, null],
        policySwapWindowOpen: true,
      },
    );
    const state = createTestState({
      players: new Map([['p1', player]]),
    });

    const action: GovernmentAction = {
      type: 'SLOT_POLICY',
      playerId: 'p1',
      slotIndex: 5, // classical_republic only has 2 slots
      policyId: 'discipline',
    };
    const next = governmentSystem(state, action);
    expect(next).toBe(state);
  });

  it('SLOT_POLICY gracefully no-ops when PlayerState lacks Government fields', () => {
    const player = createTestPlayer({
      id: 'p1',
      researchedCivics: ['code_of_laws'],
    });
    const state = createTestState({
      players: new Map([['p1', player]]),
    });

    const action: GovernmentAction = {
      type: 'SLOT_POLICY',
      playerId: 'p1',
      slotIndex: 0,
      policyId: 'discipline',
    };
    const next = governmentSystem(state, action);
    expect(next).toBe(state);
  });

  // ── UNSLOT_POLICY ──

  it('UNSLOT_POLICY clears the target slot', () => {
    const player = withGovernmentFields(
      createTestPlayer({
        id: 'p1',
        researchedCivics: ['code_of_laws'],
      }),
      {
        governmentId: 'classical_republic',
        slottedPolicies: ['discipline', 'god_king'],
      },
    );
    const state = createTestState({
      players: new Map([['p1', player]]),
    });

    const action: GovernmentAction = {
      type: 'UNSLOT_POLICY',
      playerId: 'p1',
      slotIndex: 0,
    };
    const next = governmentSystem(state, action);

    const updated = next.players.get('p1') as PlayerState & {
      slottedPolicies: ReadonlyArray<string | null>;
    };
    expect(updated.slottedPolicies[0]).toBeNull();
    // Slot 1 unchanged
    expect(updated.slottedPolicies[1]).toBe('god_king');
  });

  it('UNSLOT_POLICY on already-empty slot returns state unchanged', () => {
    const player = withGovernmentFields(
      createTestPlayer({
        id: 'p1',
        researchedCivics: ['code_of_laws'],
      }),
      {
        governmentId: 'classical_republic',
        slottedPolicies: [null, null],
      },
    );
    const state = createTestState({
      players: new Map([['p1', player]]),
    });

    const action: GovernmentAction = {
      type: 'UNSLOT_POLICY',
      playerId: 'p1',
      slotIndex: 0,
    };
    const next = governmentSystem(state, action);
    expect(next).toBe(state);
  });

  // ── Policy swap window (W2-03 GP F-08) ──

  it('canSlotPolicy returns false when policySwapWindowOpen is false', () => {
    const player = withGovernmentFields(
      createTestPlayer({
        id: 'p1',
        researchedCivics: ['code_of_laws'],
      }),
      {
        governmentId: 'classical_republic',
        slottedPolicies: [null, null],
        policySwapWindowOpen: false,
      },
    );
    const state = createTestState({
      players: new Map([['p1', player]]),
    });
    expect(canSlotPolicy(state, 'p1', 0, 'discipline')).toBe(false);
  });

  it('canSlotPolicy returns true when policySwapWindowOpen is true', () => {
    const player = withGovernmentFields(
      createTestPlayer({
        id: 'p1',
        researchedCivics: ['code_of_laws'],
      }),
      {
        governmentId: 'classical_republic',
        slottedPolicies: [null, null],
        policySwapWindowOpen: true,
      },
    );
    const state = createTestState({
      players: new Map([['p1', player]]),
    });
    expect(canSlotPolicy(state, 'p1', 0, 'discipline')).toBe(true);
  });

  // ── SELECT_IDEOLOGY (W2-03 CT F-08) ──

  it('SELECT_IDEOLOGY sets ideology when political_theory is researched', () => {
    const player = withGovernmentFields(
      createTestPlayer({
        id: 'p1',
        researchedCivics: ['political_theory'],
      }),
      { ideology: null },
    );
    const state = createTestState({
      players: new Map([['p1', player]]),
    });

    const action: GovernmentAction = {
      type: 'SELECT_IDEOLOGY',
      playerId: 'p1',
      ideology: 'democracy',
    };
    const next = governmentSystem(state, action);

    const updated = next.players.get('p1') as PlayerState & {
      ideology: string | null;
    };
    expect(updated.ideology).toBe('democracy');
  });

  it('SELECT_IDEOLOGY blocked when political_theory not researched', () => {
    const player = withGovernmentFields(
      createTestPlayer({ id: 'p1', researchedCivics: [] }),
      { ideology: null },
    );
    const state = createTestState({
      players: new Map([['p1', player]]),
    });

    const action: GovernmentAction = {
      type: 'SELECT_IDEOLOGY',
      playerId: 'p1',
      ideology: 'fascism',
    };
    const next = governmentSystem(state, action);
    expect(next).toBe(state);
  });

  it('SELECT_IDEOLOGY cannot be changed once set', () => {
    const player = withGovernmentFields(
      createTestPlayer({
        id: 'p1',
        researchedCivics: ['political_theory'],
      }),
      { ideology: 'communism' },
    );
    const state = createTestState({
      players: new Map([['p1', player]]),
    });

    const action: GovernmentAction = {
      type: 'SELECT_IDEOLOGY',
      playerId: 'p1',
      ideology: 'democracy',
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

  it('canSlotPolicy accepts any policy category in any slot (wildcard)', () => {
    const player = withGovernmentFields(
      createTestPlayer({
        id: 'p1',
        researchedCivics: ['code_of_laws', 'foreign_trade'],
      }),
      {
        governmentId: 'classical_republic',
        slottedPolicies: [null, null],
        policySwapWindowOpen: true,
      },
    );
    const state = createTestState({
      players: new Map([['p1', player]]),
    });
    // military policy in slot 0
    expect(canSlotPolicy(state, 'p1', 0, 'discipline')).toBe(true);
    // diplomatic policy in slot 0 (no category gate)
    expect(canSlotPolicy(state, 'p1', 0, 'diplomatic_league')).toBe(true);
    // out of bounds
    expect(canSlotPolicy(state, 'p1', 5, 'discipline')).toBe(false);
  });

  // ── Immutability ──

  it('does not mutate the original state when adopting a government', () => {
    const player = withGovernmentFields(
      createTestPlayer({
        id: 'p1',
        researchedCivics: ['code_of_laws'],
      }),
      { governmentId: null, slottedPolicies: [] },
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

// ── W3-03: PICK_CELEBRATION_BONUS ──

describe('governmentSystem — PICK_CELEBRATION_BONUS (W3-03)', () => {
  function withPendingCelebration(player: PlayerState, governmentId: string): PlayerState {
    return {
      ...player,
      governmentId,
      slottedPolicies: [],
      pendingCelebrationChoice: { governmentId },
      celebrationCount: 0,
      celebrationBonus: 0,
      celebrationTurnsLeft: 0,
      socialPolicySlots: 0,
    } as unknown as PlayerState;
  }

  it('no-ops when player has no pendingCelebrationChoice', () => {
    const player = withGovernmentFields(
      createTestPlayer({ id: 'p1' }),
      { governmentId: 'classical_republic', slottedPolicies: [] },
    );
    const state = createTestState({ players: new Map([['p1', player]]) });
    const next = governmentSystem(state, {
      type: 'PICK_CELEBRATION_BONUS',
      playerId: 'p1',
      bonusId: 'classical-rep-culture',
    });
    expect(next).toBe(state);
  });

  it('no-ops for an invalid bonusId not in the government celebrationBonuses', () => {
    const player = withPendingCelebration(
      createTestPlayer({ id: 'p1' }),
      'classical_republic',
    );
    const state = createTestState({ players: new Map([['p1', player]]) });
    const next = governmentSystem(state, {
      type: 'PICK_CELEBRATION_BONUS',
      playerId: 'p1',
      bonusId: 'invalid-bonus-id',
    });
    expect(next).toBe(state);
  });

  it('applies valid bonus: sets activeCelebrationBonus + clears pendingCelebrationChoice', () => {
    const player = withPendingCelebration(
      createTestPlayer({ id: 'p1' }),
      'classical_republic',
    );
    const state = createTestState({ players: new Map([['p1', player]]) });
    const next = governmentSystem(state, {
      type: 'PICK_CELEBRATION_BONUS',
      playerId: 'p1',
      bonusId: 'classical-rep-culture',
    });
    const updated = next.players.get('p1')!;
    expect((updated as typeof updated & { activeCelebrationBonus: string }).activeCelebrationBonus).toBe('classical-rep-culture');
    expect((updated as typeof updated & { pendingCelebrationChoice: null }).pendingCelebrationChoice).toBeNull();
  });

  it('increments celebrationCount on valid pick (F-01)', () => {
    const player = withPendingCelebration(
      createTestPlayer({ id: 'p1', celebrationCount: 0 }),
      'classical_republic',
    );
    const state = createTestState({ players: new Map([['p1', player]]) });
    const next = governmentSystem(state, {
      type: 'PICK_CELEBRATION_BONUS',
      playerId: 'p1',
      bonusId: 'classical-rep-culture',
    });
    expect(next.players.get('p1')!.celebrationCount).toBe(1);
  });

  it('increments socialPolicySlots by 1 on valid pick (F-04)', () => {
    const player = withPendingCelebration(
      createTestPlayer({ id: 'p1' }),
      'classical_republic',
    );
    const state = createTestState({ players: new Map([['p1', player]]) });
    const next = governmentSystem(state, {
      type: 'PICK_CELEBRATION_BONUS',
      playerId: 'p1',
      bonusId: 'classical-rep-culture',
    });
    const updated = next.players.get('p1')!;
    expect((updated as typeof updated & { socialPolicySlots: number }).socialPolicySlots).toBe(1);
  });

  it('sets celebrationTurnsLeft = 10 on valid pick', () => {
    const player = withPendingCelebration(
      createTestPlayer({ id: 'p1' }),
      'classical_republic',
    );
    const state = createTestState({ players: new Map([['p1', player]]) });
    const next = governmentSystem(state, {
      type: 'PICK_CELEBRATION_BONUS',
      playerId: 'p1',
      bonusId: 'classical-rep-wonder',
    });
    expect(next.players.get('p1')!.celebrationTurnsLeft).toBe(10);
  });

  it('accepts either bonus option A or B', () => {
    const player = withPendingCelebration(
      createTestPlayer({ id: 'p1' }),
      'classical_republic',
    );
    const state = createTestState({ players: new Map([['p1', player]]) });
    // Option B
    const nextB = governmentSystem(state, {
      type: 'PICK_CELEBRATION_BONUS',
      playerId: 'p1',
      bonusId: 'classical-rep-wonder',
    });
    const updatedB = nextB.players.get('p1')!;
    expect((updatedB as typeof updatedB & { activeCelebrationBonus: string }).activeCelebrationBonus).toBe('classical-rep-wonder');
  });

  it('BB1.5: celebrationCount is capped at 7 — 10 celebrations still shows 7', () => {
    // Simulate a player who has already celebrated 6 times and is now celebrating again
    // (the 7th celebration brings them to 7; attempting an 8th should remain at 7)
    function celebrateOnce(celebrationCount: number): number {
      const player = {
        ...createTestPlayer({ id: 'p1', celebrationCount }),
        governmentId: 'classical_republic',
        slottedPolicies: [],
        pendingCelebrationChoice: { governmentId: 'classical_republic' },
        celebrationBonus: 0,
        celebrationTurnsLeft: 0,
        socialPolicySlots: 0,
      } as ReturnType<typeof createTestPlayer> & {
        governmentId: string;
        slottedPolicies: unknown[];
        pendingCelebrationChoice: { governmentId: string };
        socialPolicySlots: number;
      };
      const state = createTestState({ players: new Map([['p1', player as ReturnType<typeof createTestPlayer>]]) });
      const next = governmentSystem(state, {
        type: 'PICK_CELEBRATION_BONUS',
        playerId: 'p1',
        bonusId: 'classical-rep-culture',
      });
      return next.players.get('p1')!.celebrationCount;
    }

    // celebrations 1–7 increment normally
    expect(celebrateOnce(0)).toBe(1);
    expect(celebrateOnce(6)).toBe(7);
    // at or above cap — stays at 7
    expect(celebrateOnce(7)).toBe(7);
    expect(celebrateOnce(9)).toBe(7);
  });
});
