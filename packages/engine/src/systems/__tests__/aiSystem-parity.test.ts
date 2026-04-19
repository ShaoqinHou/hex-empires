import { describe, it, expect } from 'vitest';
import { generateAIActions } from '../aiSystem';
import { createTestState, createTestPlayer } from './helpers';
import { ALL_PANTHEONS } from '../../data/religion';
import { ALL_GOVERNMENTS, ALL_POLICIES } from '../../data/governments';
import type { GameAction, GameState, PlayerState } from '../../types/GameState';

/**
 * Tests for the Civ VII parity emissions added to generateAIActions:
 *   - ADOPT_PANTHEON
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

/** Build an AI-owned state where the given overrides apply to the lone player. */
function aiStateWith(
  overrides: Partial<ReturnType<typeof createTestPlayer>>,
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
  });
}

describe('aiSystem — Civ VII parity emissions', () => {
  it('AI with no pantheon and >=25 faith emits ADOPT_PANTHEON', () => {
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
    });
    const actions = generateAIActions(state);
    const adopt = findAction(actions, 'ADOPT_PANTHEON');
    expect(adopt).toBeDefined();
    expect(adopt!.pantheonId).not.toBe(firstClaimed);
    expect(adopt!.pantheonId).toBe(ALL_PANTHEONS[1].id);
  });

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
    const parityTypes = new Set<GameAction['type']>([
      'ADOPT_PANTHEON',
      'SET_GOVERNMENT',
      'SLOT_POLICY',
    ]);
    const parityActions = actions.filter(a => parityTypes.has(a.type));
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
