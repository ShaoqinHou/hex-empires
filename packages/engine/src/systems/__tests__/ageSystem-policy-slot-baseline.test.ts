/**
 * Per-age policy slot baseline tests (civic-tree F-10 / JJ2.2).
 *
 * Verifies that when a player adopts a government, their effective policy
 * slot count is gov.base + bonuses where base is max(gov.policySlots.total, age baseline):
 *   - Antiquity baseline: 2
 *   - Exploration baseline: 4
 *   - Modern baseline: 6
 *
 * Test cases:
 *  1. Antiquity player with classical_republic (2 slots) → 2 slots (baseline = gov total)
 *  2. Exploration player with feudal_monarchy (3 slots) → 4 slots (baseline > gov)
 *  3. Modern player with elective_republic (4 slots) → 6 slots (baseline > gov)
 *  4. effectivePolicySlotCount: when gov grants MORE than baseline → gov wins
 */

import { describe, it, expect } from 'vitest';
import {
  governmentSystem,
  AGE_POLICY_SLOT_BASELINE,
  effectivePolicySlotCount,
} from '../governmentSystem';
import type { GovernmentAction } from '../../types/Government';
import type { GameState, PlayerState } from '../../types/GameState';
import { createTestState, createTestPlayer } from './helpers';
import type { GovernmentDef } from '../../data/governments/governments';

/** Augment a player with the minimal Government runtime fields. */
function withGovFields(
  player: PlayerState,
  overrides: {
    governmentId?: string | null;
    slottedPolicies?: Array<string | null>;
    governmentLockedForAge?: boolean;
    socialPolicySlots?: number;
    policySlotCounts?: PlayerState['policySlotCounts'];
    legacyBonuses?: PlayerState['legacyBonuses'];
  } = {},
): PlayerState {
  return {
    ...player,
    governmentId: overrides.governmentId ?? null,
    slottedPolicies: overrides.slottedPolicies ?? [],
    governmentLockedForAge: overrides.governmentLockedForAge ?? false,
    socialPolicySlots: overrides.socialPolicySlots ?? player.socialPolicySlots,
    policySlotCounts: overrides.policySlotCounts ?? player.policySlotCounts,
    legacyBonuses: overrides.legacyBonuses ?? player.legacyBonuses,
  } as unknown as PlayerState;
}

/** Helper to adopt a government and return the resulting player state. */
function adoptGov(
  state: GameState,
  playerId: string,
  governmentId: string,
): PlayerState {
  const action: GovernmentAction = {
    type: 'SET_GOVERNMENT',
    playerId,
    governmentId,
  };
  const next = governmentSystem(state, action);
  return next.players.get(playerId)!;
}

describe('AGE_POLICY_SLOT_BASELINE constant', () => {
  it('has antiquity baseline of 2', () => {
    expect(AGE_POLICY_SLOT_BASELINE['antiquity']).toBe(2);
  });

  it('has exploration baseline of 4', () => {
    expect(AGE_POLICY_SLOT_BASELINE['exploration']).toBe(4);
  });

  it('has modern baseline of 6', () => {
    expect(AGE_POLICY_SLOT_BASELINE['modern']).toBe(6);
  });
});

describe('effectivePolicySlotCount', () => {
  it('returns gov slot count when it equals baseline (antiquity, classical_republic: 2 slots)', () => {
    const mockGov: GovernmentDef = {
      id: 'classical_republic',
      name: 'Classical Republic',
      age: 'antiquity',
      unlockCivic: 'code_of_laws',
      policySlots: { total: 2 },
      legacyBonus: { type: 'MODIFY_YIELD', target: 'city', yield: 'culture', value: 1 },
      description: '',
      celebrationBonuses: [
        { id: 'a', name: 'a', description: '' },
        { id: 'b', name: 'b', description: '' },
      ],
    };
    expect(effectivePolicySlotCount(mockGov, 'antiquity')).toBe(2);
  });

  it('returns age baseline when it exceeds gov slots (exploration gov with 3 slots → 4)', () => {
    const mockGov: GovernmentDef = {
      id: 'feudal_monarchy',
      name: 'Feudal Monarchy',
      age: 'exploration',
      unlockCivic: 'divine_right',
      policySlots: { total: 3 },
      legacyBonus: { type: 'MODIFY_YIELD', target: 'city', yield: 'food', value: 2 },
      description: '',
      celebrationBonuses: [
        { id: 'a', name: 'a', description: '' },
        { id: 'b', name: 'b', description: '' },
      ],
    };
    expect(effectivePolicySlotCount(mockGov, 'exploration')).toBe(4);
  });

  it('returns age baseline when it exceeds gov slots (modern gov with 4 slots → 6)', () => {
    const mockGov: GovernmentDef = {
      id: 'elective_republic',
      name: 'Elective Republic',
      age: 'modern',
      unlockCivic: 'suffrage',
      policySlots: { total: 4 },
      legacyBonus: { type: 'MODIFY_YIELD', target: 'empire', yield: 'culture', value: 3 },
      description: '',
      celebrationBonuses: [
        { id: 'a', name: 'a', description: '' },
        { id: 'b', name: 'b', description: '' },
      ],
    };
    expect(effectivePolicySlotCount(mockGov, 'modern')).toBe(6);
  });

  it('returns gov slot count when gov exceeds baseline (high-slot gov in antiquity → gov wins)', () => {
    // A hypothetical government with 5 slots in antiquity where baseline is 2.
    // The government's generosity wins.
    const highSlotGov: GovernmentDef = {
      id: 'high_slots_test',
      name: 'High Slots Test',
      age: 'antiquity',
      unlockCivic: 'code_of_laws',
      policySlots: { total: 5 },
      legacyBonus: { type: 'MODIFY_YIELD', target: 'city', yield: 'gold', value: 1 },
      description: '',
      celebrationBonuses: [
        { id: 'a', name: 'a', description: '' },
        { id: 'b', name: 'b', description: '' },
      ],
    };
    expect(effectivePolicySlotCount(highSlotGov, 'antiquity')).toBe(5);
  });

  it('adds socialPolicySlots when provided', () => {
    const mockGov: GovernmentDef = {
      id: 'classical_republic',
      name: 'Classical Republic',
      age: 'antiquity',
      unlockCivic: 'code_of_laws',
      policySlots: { total: 2 },
      legacyBonus: { type: 'MODIFY_YIELD', target: 'city', yield: 'culture', value: 1 },
      description: '',
      celebrationBonuses: [
        { id: 'a', name: 'a', description: '' },
        { id: 'b', name: 'b', description: '' },
      ],
    };
    const player = createTestPlayer({
      id: 'p1',
      socialPolicySlots: 2,
    });
    expect(effectivePolicySlotCount(mockGov, 'antiquity', player)).toBe(4);
  });

  it('adds policySlotCounts and legacy GRANT_POLICY_SLOT effects when provided', () => {
    const mockGov: GovernmentDef = {
      id: 'classical_republic',
      name: 'Classical Republic',
      age: 'antiquity',
      unlockCivic: 'code_of_laws',
      policySlots: { total: 2 },
      legacyBonus: { type: 'MODIFY_YIELD', target: 'city', yield: 'culture', value: 1 },
      description: '',
      celebrationBonuses: [
        { id: 'a', name: 'a', description: '' },
        { id: 'b', name: 'b', description: '' },
      ],
    };
    const player = {
      ...createTestPlayer({
        id: 'p1',
      }),
      policySlotCounts: {
        military: 1,
        economic: 1,
        diplomatic: 0,
        wildcard: 0,
      },
      legacyBonuses: [
        { source: 'legacy:one', effect: { type: 'GRANT_POLICY_SLOT', slotType: 'military' } },
        { source: 'legacy:two', effect: { type: 'GRANT_POLICY_SLOT', slotType: 'wildcard' } },
        { source: 'legacy:other', effect: { type: 'MODIFY_YIELD', target: 'city', yield: 'food', value: 1 } },
      ],
    } as ReturnType<typeof createTestPlayer>;
    expect(effectivePolicySlotCount(mockGov, 'antiquity', player)).toBe(6);
  });
});

describe('policy slot baseline via SET_GOVERNMENT (integration)', () => {
  // ── Antiquity: classical_republic (2 slots) with baseline 2 → 2 total ──

  it('antiquity player adopting classical_republic gets 2 policy slots (baseline = gov slots)', () => {
    const player = withGovFields(
      createTestPlayer({
        id: 'p1',
        age: 'antiquity',
        researchedCivics: ['code_of_laws'],
      }),
    );
    const state = createTestState({
      players: new Map([['p1', player]]),
      age: { currentAge: 'antiquity', ageThresholds: { exploration: 50, modern: 100 } },
    });
    const after = adoptGov(state, 'p1', 'classical_republic');
    expect(after.governmentId).toBe('classical_republic');
    // slottedPolicies length = effective slot count = max(2, 2) = 2
    expect(after.slottedPolicies?.length).toBe(2);
    // All slots start as null
    expect(after.slottedPolicies).toEqual([null, null]);
  });

  // ── Exploration: feudal_monarchy (3 slots) with baseline 4 → 4 total ──

  it('exploration player adopting feudal_monarchy gets 4 policy slots (baseline 4 > gov 3)', () => {
    const player = withGovFields(
      createTestPlayer({
        id: 'p1',
        age: 'exploration',
        researchedCivics: ['divine_right'],
        governmentLockedForAge: false,
      }),
    );
    const state: GameState = {
      ...createTestState({
        players: new Map([['p1', player]]),
      }),
      age: { currentAge: 'exploration', ageThresholds: { exploration: 50, modern: 100 } },
    };
    const after = adoptGov(state, 'p1', 'feudal_monarchy');
    expect(after.governmentId).toBe('feudal_monarchy');
    // slottedPolicies length = effective slot count = max(3, 4) = 4
    expect(after.slottedPolicies?.length).toBe(4);
    expect(after.slottedPolicies).toEqual([null, null, null, null]);
  });

  // ── Modern: elective_republic (4 slots) with baseline 6 → 6 total ──

  it('modern player adopting elective_republic gets 6 policy slots (baseline 6 > gov 4)', () => {
    const player = withGovFields(
      createTestPlayer({
        id: 'p1',
        age: 'modern',
        researchedCivics: ['suffrage'],
        governmentLockedForAge: false,
      }),
    );
    const state: GameState = {
      ...createTestState({
        players: new Map([['p1', player]]),
      }),
      age: { currentAge: 'modern', ageThresholds: { exploration: 50, modern: 100 } },
    };
    const after = adoptGov(state, 'p1', 'elective_republic');
    expect(after.governmentId).toBe('elective_republic');
    // slottedPolicies length = effective slot count = max(4, 6) = 6
    expect(after.slottedPolicies?.length).toBe(6);
    expect(after.slottedPolicies).toEqual([null, null, null, null, null, null]);
  });

  it('SET_GOVERNMENT includes bonus slots from socialPolicySlots, policySlotCounts, and legacy grants', () => {
    const player = withGovFields(
      createTestPlayer({
        id: 'p1',
        age: 'antiquity',
        researchedCivics: ['code_of_laws'],
        socialPolicySlots: 1,
      }),
      {
        slottedPolicies: [null, null],
        policySlotCounts: {
          military: 0,
          economic: 1,
          diplomatic: 0,
          wildcard: 0,
        },
        legacyBonuses: [
          { source: 'legacy:one', effect: { type: 'GRANT_POLICY_SLOT', slotType: 'wildcard' } },
        ],
      },
    );

    const state = createTestState({
      players: new Map([['p1', player]]),
      age: { currentAge: 'antiquity', ageThresholds: { exploration: 50, modern: 100 } },
    });
    const after = adoptGov(state, 'p1', 'classical_republic');
    expect(after.slottedPolicies?.length).toBe(5);
  });
});
