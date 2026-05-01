import { describe, it, expect } from 'vitest';
import { generateAIActions } from '../aiSystem';
import { createTestState, createTestPlayer, createTestCity } from './helpers';
import { ALL_PANTHEONS } from '../../data/religion';
import { ALL_GOVERNMENTS, ALL_POLICIES } from '../../data/governments';
import { ALL_FOUNDER_BELIEFS, ALL_FOLLOWER_BELIEFS } from '../../data/religion';
import type { GameAction, GameState, PlayerState } from '../../types/GameState';

/**
 * Tests for the Civ VII parity emissions added to generateAIActions:
 *   - ADOPT_PANTHEON   (CC2.1) — requires Temple city + faith
 *   - FOUND_RELIGION   (CC2.2 / DD2) — requires Piety + Temple city (no pantheon per Civ VII §18 / F-03)
 *   - SET_GOVERNMENT
 *   - SLOT_POLICY
 *
 * Each emission is gated on the AI player having the right resources /
 * researched civics, and is low priority (at most one per turn).
 */

function findAction<T extends GameAction['type']>(
  actions: ReadonlyArray<GameAction>,
  type: T,
): Extract<GameAction, { type: T }> | undefined {
  return actions.find(a => a.type === type) as
    | Extract<GameAction, { type: T }>
    | undefined;
}

/** A city with a Temple owned by 'p1'. */
const TEMPLE_CITY = createTestCity({ id: 'c1', owner: 'p1', buildings: ['temple'] });

/**
 * Build an AI-owned state where the given overrides apply to the lone player.
 * By default includes a city with Temple so pantheon/religion triggers can fire.
 */
function aiStateWith(
  overrides: Partial<ReturnType<typeof createTestPlayer>>,
  withTempleCity = true,
): GameState {
  const p1 = createTestPlayer({
    id: 'p1',
    name: 'AI 1',
    isHuman: false,
    ...overrides,
  });
  return createTestState({
    currentPlayerId: 'p1',
    players: new Map([['p1', p1]]),
    cities: withTempleCity
      ? new Map([['c1', TEMPLE_CITY]])
      : new Map(),
  });
}

describe('aiSystem — Civ VII parity emissions', () => {
  // ── CC2.1: ADOPT_PANTHEON (Temple-gated) ──────────────────────────────

  it('AI with no pantheon, >=25 faith, and a Temple city emits ADOPT_PANTHEON (CC2.1)', () => {
    const state = aiStateWith({ faith: 25, pantheonId: null });
    const actions = generateAIActions(state);
    const adopt = findAction(actions, 'ADOPT_PANTHEON');
    expect(adopt).toBeDefined();
    expect(adopt!.playerId).toBe('p1');
    expect(adopt!.pantheonId).toBe(ALL_PANTHEONS[0].id);
  });

  it('AI with pantheon already does NOT emit ADOPT_PANTHEON', () => {
    const state = aiStateWith({
      faith: 500,
      pantheonId: ALL_PANTHEONS[0].id,
    });
    const actions = generateAIActions(state);
    expect(findAction(actions, 'ADOPT_PANTHEON')).toBeUndefined();
  });

  it('AI with insufficient faith does NOT emit ADOPT_PANTHEON', () => {
    const state = aiStateWith({ faith: 24, pantheonId: null });
    const actions = generateAIActions(state);
    expect(findAction(actions, 'ADOPT_PANTHEON')).toBeUndefined();
  });

  it('AI without a Temple city does NOT emit ADOPT_PANTHEON (CC2.1 new gate)', () => {
    const state = aiStateWith({ faith: 100, pantheonId: null }, /* withTempleCity */ false);
    const actions = generateAIActions(state);
    expect(findAction(actions, 'ADOPT_PANTHEON')).toBeUndefined();
  });

  it('AI skips pantheons already claimed by another player', () => {
    const firstClaimed = ALL_PANTHEONS[0].id;
    const p1 = createTestPlayer({
      id: 'p1',
      name: 'AI 1',
      isHuman: false,
      faith: 100,
      pantheonId: null,
    });
    const p2 = createTestPlayer({
      id: 'p2',
      name: 'AI 2',
      isHuman: false,
      pantheonId: firstClaimed,
    });
    const state = createTestState({
      currentPlayerId: 'p1',
      players: new Map([
        ['p1', p1],
        ['p2', p2],
      ]),
      cities: new Map([['c1', TEMPLE_CITY]]),
    });
    const actions = generateAIActions(state);
    const adopt = findAction(actions, 'ADOPT_PANTHEON');
    expect(adopt).toBeDefined();
    expect(adopt!.pantheonId).not.toBe(firstClaimed);
    expect(adopt!.pantheonId).toBe(ALL_PANTHEONS[1].id);
  });

  // ── CC2.2: FOUND_RELIGION ──────────────────────────────────────────

  it('AI with pantheon + Piety civic + Temple city emits FOUND_RELIGION (CC2.2)', () => {
    const state = aiStateWith({
      faith: 200,
      pantheonId: ALL_PANTHEONS[0].id,
      researchedCivics: ['piety'],
    });
    // Use a type-safe cast because FOUND_RELIGION is in ReligionAction, not GameAction yet
    const actions = generateAIActions(state) as ReadonlyArray<GameAction & { type: string }>;
    const found = actions.find(a => a.type === 'FOUND_RELIGION') as
      | { type: 'FOUND_RELIGION'; playerId: string; cityId: string; founderBelief: string; followerBelief: string }
      | undefined;
    expect(found).toBeDefined();
    expect(found!.playerId).toBe('p1');
    expect(found!.cityId).toBe('c1');
    expect(ALL_FOUNDER_BELIEFS.some(b => b.id === found!.founderBelief)).toBe(true);
    expect(ALL_FOLLOWER_BELIEFS.some(b => b.id === found!.followerBelief)).toBe(true);
  });

  it('AI without Piety civic does NOT emit FOUND_RELIGION (CC2.2)', () => {
    const state = aiStateWith({
      faith: 200,
      pantheonId: ALL_PANTHEONS[0].id,
      researchedCivics: [],
    });
    const actions = generateAIActions(state) as ReadonlyArray<GameAction & { type: string }>;
    expect(actions.find(a => a.type === 'FOUND_RELIGION')).toBeUndefined();
  });

  it('AI without pantheon DOES emit FOUND_RELIGION — Civ VII §18 / F-03 (pantheon no longer required)', () => {
    // DD2: Pantheon prerequisite removed from FOUND_RELIGION per Civ VII §18.
    // AI with Piety + Temple but NO pantheon must still dispatch FOUND_RELIGION.
    // faith=0 ensures ADOPT_PANTHEON (priority 1) does NOT fire (requires >= 25),
    // so FOUND_RELIGION (priority 2) gets evaluated. Faith is irrelevant to FOUND_RELIGION.
    const state = aiStateWith({
      faith: 0,
      pantheonId: null,
      researchedCivics: ['piety'],
    });
    const actions = generateAIActions(state) as ReadonlyArray<GameAction & { type: string }>;
    const found = actions.find(a => a.type === 'FOUND_RELIGION') as
      | { type: 'FOUND_RELIGION'; playerId: string; cityId: string; founderBelief: string; followerBelief: string }
      | undefined;
    expect(found).toBeDefined();
    expect(found!.playerId).toBe('p1');
    expect(found!.cityId).toBe('c1');
  });

  // ── Government / policy tests (unchanged) ─────────────────────────

  it('AI with no government and researched unlock civic emits SET_GOVERNMENT', () => {
    // pantheon is already set so it cannot emit ADOPT_PANTHEON (one per turn).
    const candidate = ALL_GOVERNMENTS[0];
    const state = aiStateWith({
      pantheonId: 'already_picked',
      governmentId: null,
      researchedCivics: [candidate.unlockCivic],
    });
    const actions = generateAIActions(state);
    const set = findAction(actions, 'SET_GOVERNMENT');
    expect(set).toBeDefined();
    expect(set!.playerId).toBe('p1');
    expect(set!.governmentId).toBe(candidate.id);
  });

  it('AI does not emit SET_GOVERNMENT for a civ-specific government mismatch', () => {
    const state = {
      ...aiStateWith({
        pantheonId: 'already_picked',
        governmentId: null,
        civilizationId: 'rome',
        age: 'modern',
        researchedCivics: ['class_struggle'],
      }),
      age: { currentAge: 'modern' as const, ageThresholds: { exploration: 50, modern: 100 } },
    };
    const actions = generateAIActions(state);
    expect(findAction(actions, 'SET_GOVERNMENT')).toBeUndefined();
  });

  it('AI can emit SET_GOVERNMENT for Mexico-only Revolucion when eligible', () => {
    const state = {
      ...aiStateWith({
        pantheonId: 'already_picked',
        governmentId: null,
        civilizationId: 'mexico',
        age: 'modern',
        researchedCivics: ['class_struggle'],
      }),
      age: { currentAge: 'modern' as const, ageThresholds: { exploration: 50, modern: 100 } },
    };
    const actions = generateAIActions(state);
    const set = findAction(actions, 'SET_GOVERNMENT');
    expect(set).toBeDefined();
    expect(set!.governmentId).toBe('revolucion');
  });

  it('AI with no government and no researched unlock civic does NOT emit SET_GOVERNMENT', () => {
    const state = aiStateWith({
      pantheonId: 'already_picked',
      governmentId: null,
      researchedCivics: [],
    });
    const actions = generateAIActions(state);
    expect(findAction(actions, 'SET_GOVERNMENT')).toBeUndefined();
  });

  it('AI with a government + open slot + researched policy civic emits SLOT_POLICY', () => {
    // Pick a known government with a wildcard slot so we can force an empty
    // slot and a researched policy civic. W2-03: slottedPolicies is a flat array.
    const gov = ALL_GOVERNMENTS.find(g => g.id === 'classical_republic')!;
    const policy = ALL_POLICIES.find(p => p.unlockCivic === 'code_of_laws')!;
    const state = aiStateWith({
      pantheonId: 'already_picked',
      governmentId: gov.id,
      researchedCivics: [gov.unlockCivic, policy.unlockCivic],
      slottedPolicies: [null, null] as unknown as PlayerState['slottedPolicies'],
    });
    const actions = generateAIActions(state);
    const slot = findAction(actions, 'SLOT_POLICY');
    expect(slot).toBeDefined();
    expect(slot!.playerId).toBe('p1');
    expect(slot!.slotIndex).toBe(0);
    // It must reference an actual registered policy.
    expect(ALL_POLICIES.some(p => p.id === slot!.policyId)).toBe(true);
  });

  it('AI emits at most one parity action per turn', () => {
    // All three conditions would be independently eligible, but we want to
    // confirm only the highest-priority (pantheon) fires.
    const gov = ALL_GOVERNMENTS.find(g => g.id === 'classical_republic')!;
    const state = aiStateWith({
      faith: 100,
      pantheonId: null,
      governmentId: null,
      researchedCivics: [gov.unlockCivic],
      slottedPolicies: [null, null] as unknown as PlayerState['slottedPolicies'],
    });
    const actions = generateAIActions(state);
    const parityTypes = new Set<string>([
      'ADOPT_PANTHEON',
      'SET_GOVERNMENT',
      'SLOT_POLICY',
      'FOUND_RELIGION',
    ]);
    const parityActions = (actions as ReadonlyArray<{ type: string }>).filter(a => parityTypes.has(a.type));
    expect(parityActions.length).toBe(1);
    expect(parityActions[0].type).toBe('ADOPT_PANTHEON');
  });

  it('parity emissions are valid discriminated-union GameAction shapes', () => {
    const state = aiStateWith({ faith: 25, pantheonId: null });
    const actions = generateAIActions(state);
    const adopt = findAction(actions, 'ADOPT_PANTHEON')!;
    // Type-narrowed fields must all be present and correctly typed.
    expect(typeof adopt.playerId).toBe('string');
    expect(typeof adopt.pantheonId).toBe('string');
    expect(adopt.type).toBe('ADOPT_PANTHEON');
  });

  it('does not emit parity actions for human players', () => {
    const p1 = createTestPlayer({
      id: 'p1',
      name: 'Human',
      isHuman: true,
      faith: 500,
      pantheonId: null,
    });
    const state = createTestState({
      currentPlayerId: 'p1',
      players: new Map([['p1', p1]]),
    });
    const actions = generateAIActions(state);
    // generateAIActions returns [] for human players entirely.
    expect(actions).toEqual([]);
  });
});
