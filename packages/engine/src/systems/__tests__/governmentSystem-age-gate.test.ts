/**
 * governmentSystem — age-gate tests (civic-tree F-07 / JJ2.1).
 *
 * Verifies that SET_GOVERNMENT rejects governments from the wrong age,
 * and accepts those from the correct age.
 *
 * Test grid:
 *  - Antiquity player tries to adopt 'elective_republic' (modern) → no-op
 *  - Antiquity player tries to adopt 'feudal_monarchy' (exploration) → no-op
 *  - Antiquity player adopts 'despotism' (antiquity, with correct civic) → succeeds
 *  - After TRANSITION_AGE to exploration, player can adopt 'feudal_monarchy' (exploration)
 *    but not 'elective_republic' (modern)
 */

import { describe, it, expect } from 'vitest';
import { governmentSystem } from '../governmentSystem';
import type { GovernmentAction } from '../../types/Government';
import type { GameState, PlayerState } from '../../types/GameState';
import { createTestState, createTestPlayer } from './helpers';

/** Augment a player with the minimal Government runtime fields. */
function withGovFields(
  player: PlayerState,
  overrides: {
    governmentId?: string | null;
    slottedPolicies?: Array<string | null>;
    governmentLockedForAge?: boolean;
  } = {},
): PlayerState {
  return {
    ...player,
    governmentId: overrides.governmentId ?? null,
    slottedPolicies: overrides.slottedPolicies ?? [],
    governmentLockedForAge: overrides.governmentLockedForAge ?? false,
  } as unknown as PlayerState;
}

describe('governmentSystem — age-gate (F-07)', () => {
  // ── Cross-age rejection ──

  it('rejects adoption of a modern government (elective_republic) by an antiquity player', () => {
    const player = withGovFields(
      createTestPlayer({
        id: 'p1',
        age: 'antiquity',
        // elective_republic requires 'suffrage'; provide it to confirm age is the real block
        researchedCivics: ['suffrage'],
      }),
    );
    const state = createTestState({
      players: new Map([['p1', player]]),
      age: { currentAge: 'antiquity', ageThresholds: { exploration: 50, modern: 100 } },
    });
    const action: GovernmentAction = {
      type: 'SET_GOVERNMENT',
      playerId: 'p1',
      governmentId: 'elective_republic',
    };
    const next = governmentSystem(state, action);
    expect(next).toBe(state); // state unchanged — reference equality
    const playerAfter = next.players.get('p1')!;
    expect(playerAfter.governmentId).toBeNull();
  });

  it('rejects adoption of an exploration government (feudal_monarchy) by an antiquity player', () => {
    const player = withGovFields(
      createTestPlayer({
        id: 'p1',
        age: 'antiquity',
        researchedCivics: ['divine_right'], // feudal_monarchy's unlock civic — age is the block
      }),
    );
    const state = createTestState({
      players: new Map([['p1', player]]),
      age: { currentAge: 'antiquity', ageThresholds: { exploration: 50, modern: 100 } },
    });
    const action: GovernmentAction = {
      type: 'SET_GOVERNMENT',
      playerId: 'p1',
      governmentId: 'feudal_monarchy',
    };
    const next = governmentSystem(state, action);
    expect(next).toBe(state);
    const playerAfter = next.players.get('p1')!;
    expect(playerAfter.governmentId).toBeNull();
  });

  // ── Correct-age acceptance ──

  it('allows adoption of an antiquity government (despotism) by an antiquity player', () => {
    const player = withGovFields(
      createTestPlayer({
        id: 'p1',
        age: 'antiquity',
        researchedCivics: ['mysticism'], // despotism's unlock civic
      }),
    );
    const state = createTestState({
      players: new Map([['p1', player]]),
      age: { currentAge: 'antiquity', ageThresholds: { exploration: 50, modern: 100 } },
    });
    const action: GovernmentAction = {
      type: 'SET_GOVERNMENT',
      playerId: 'p1',
      governmentId: 'despotism',
    };
    const next = governmentSystem(state, action);
    expect(next).not.toBe(state); // new state produced
    const playerAfter = next.players.get('p1')!;
    expect(playerAfter.governmentId).toBe('despotism');
    // governmentLockedForAge should be set after adoption
    expect(playerAfter.governmentLockedForAge).toBe(true);
  });

  // ── Exploration age: can adopt exploration, not modern ──

  it('allows adoption of exploration government (feudal_monarchy) after transitioning to exploration', () => {
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
    const action: GovernmentAction = {
      type: 'SET_GOVERNMENT',
      playerId: 'p1',
      governmentId: 'feudal_monarchy',
    };
    const next = governmentSystem(state, action);
    expect(next.players.get('p1')!.governmentId).toBe('feudal_monarchy');
  });

  it('rejects adoption of modern government (elective_republic) while in exploration age', () => {
    const player = withGovFields(
      createTestPlayer({
        id: 'p1',
        age: 'exploration',
        researchedCivics: ['suffrage'], // elective_republic's unlock civic
        governmentLockedForAge: false,
      }),
    );
    const state: GameState = {
      ...createTestState({
        players: new Map([['p1', player]]),
      }),
      age: { currentAge: 'exploration', ageThresholds: { exploration: 50, modern: 100 } },
    };
    const action: GovernmentAction = {
      type: 'SET_GOVERNMENT',
      playerId: 'p1',
      governmentId: 'elective_republic',
    };
    const next = governmentSystem(state, action);
    expect(next).toBe(state);
    expect(next.players.get('p1')!.governmentId).toBeNull();
  });

  // ── Modern age: can adopt modern governments ──

  it('allows adoption of modern government (elective_republic) in modern age', () => {
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
    const action: GovernmentAction = {
      type: 'SET_GOVERNMENT',
      playerId: 'p1',
      governmentId: 'elective_republic',
    };
    const next = governmentSystem(state, action);
    expect(next.players.get('p1')!.governmentId).toBe('elective_republic');
  });
});
